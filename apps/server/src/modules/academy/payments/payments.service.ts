import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { env } from '../../../config/env';
import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';
import { sendEmail } from '../../../utils/email';
import { hasActiveCourseAccess } from '../access';
import { getCurrentVersions, getDocumentVersion, getPublicCommerceInfo } from '../legal/legal.service';
import { resolvePrice } from '../marketing/marketing.service';

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
const pendingWindowMs = 31 * 60 * 1000;

export type CheckoutInput = {
  termsAccepted?: boolean;
  immediateDeliveryConsent?: boolean;
  withdrawalAcknowledged?: boolean;
  termsVersion?: string;
  privacyVersion?: string;
  billingName?: string;
  billingAddress?: string;
  billingPostalCode?: string;
  billingCity?: string;
  billingCountry?: string;
  billingTaxId?: string;
  isBusiness?: boolean;
  invoiceRequested?: boolean;
  discountCode?: string;
};

const text = (value: unknown, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]!);
const expiry = (days?: number | null) => days ? new Date(Date.now() + days * 86_400_000) : null;

const validateCheckout = async (userId: string, input: CheckoutInput) => {
  const [user, versions, commerce] = await Promise.all([
    prisma.academyUser.findUnique({ where: { id: userId } }),
    getCurrentVersions(),
    getPublicCommerceInfo(),
  ]);
  if (!user) throw new AppError('Nie znaleziono użytkownika', 404);
  if (!user.emailVerifiedAt) throw new AppError('Potwierdź adres e-mail przed zakupem', 403);
  if (!commerce.readiness.sellerComplete || !commerce.readiness.legalDocumentsComplete) throw new AppError('Sprzedaż jest zablokowana do czasu uzupełnienia danych sprzedawcy i dokumentów', 503);
  if (!input.termsAccepted || !input.immediateDeliveryConsent || !input.withdrawalAcknowledged) throw new AppError('Potwierdź wymagane zgody dotyczące zamówienia i treści cyfrowej', 400);
  if (input.termsVersion !== versions.termsVersion || input.privacyVersion !== versions.privacyVersion) throw new AppError('Dokumenty zostały zaktualizowane. Odśwież podsumowanie zamówienia', 409);
  const billingName = text(input.billingName);
  if (!billingName) throw new AppError('Podaj imię i nazwisko lub nazwę firmy', 400);
  if (input.isBusiness && (!text(input.billingTaxId, 30) || !text(input.billingAddress) || !text(input.billingPostalCode, 20) || !text(input.billingCity))) {
    throw new AppError('Dla zakupu firmowego uzupełnij NIP i pełny adres rozliczeniowy', 400);
  }
  return { user, versions, billingName };
};

const findReusablePending = async (userId: string, amount: number, courseId?: string, bundleId?: string) => {
  const order = await prisma.academyOrder.findFirst({
    where: { userId, courseId: courseId ?? null, bundleId: bundleId ?? null, amount, status: 'PENDING', checkoutExpiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!order?.stripeSessionId || !stripe) return null;
  const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
  return session.status === 'open' && session.url ? { orderId: order.id, checkoutUrl: session.url } : null;
};

type CheckoutTarget={courseId?:string;bundleId?:string;title:string;description:string;price:number;accessDays?:number|null;items?:Array<{courseId?:string;bundleId?:string;title:string;unitPrice:number;courseIds:string[]}>};
const createOrderAndSession = async (userId: string, input: CheckoutInput, target: CheckoutTarget) => {
  const { user, versions, billingName } = await validateCheckout(userId, input);
  if (!stripe) throw new AppError('Płatności online nie są jeszcze skonfigurowane', 503);
  const pricing = await resolvePrice(userId, target, input.discountCode);
  const reusable = target.items?.length ? null : await findReusablePending(userId, pricing.price, target.courseId, target.bundleId);
  if (reusable) return reusable;
  const order = await prisma.academyOrder.create({ data: {
    userId,
    courseId: target.courseId,
    bundleId: target.bundleId,
    amount: pricing.price,
    originalAmount: pricing.originalAmount,
    discountAmount: pricing.discountAmount,
    promotionId: pricing.promotionId,
    discountCodeId: pricing.discountCodeId,
    checkoutExpiresAt: new Date(Date.now() + pendingWindowMs),
    termsVersion: versions.termsVersion,
    privacyVersion: versions.privacyVersion,
    termsAcceptedAt: new Date(),
    immediateDeliveryConsent: true,
    withdrawalAcknowledged: true,
    billingName,
    billingAddress: text(input.billingAddress) || null,
    billingPostalCode: text(input.billingPostalCode, 20) || null,
    billingCity: text(input.billingCity) || null,
    billingCountry: text(input.billingCountry, 2).toUpperCase() || 'PL',
    billingTaxId: text(input.billingTaxId, 30) || null,
    isBusiness: Boolean(input.isBusiness),
    invoiceRequested: Boolean(input.invoiceRequested),
    ...(target.items?.length?{items:{create:target.items}}:{}),
    events: { create: { type: 'ORDER_CREATED' } },
  } });
  await prisma.academyMarketingLead.upsert({ where: { email_type_courseId: { email: user.email, type: 'ABANDONED_CHECKOUT', courseId: target.courseId ?? '' } }, create: { email: user.email, name: user.name, type: 'ABANDONED_CHECKOUT', courseId: target.courseId ?? '', source: target.bundleId ? `bundle:${target.bundleId}` : 'checkout', metadata: { orderId: order.id, bundleId: target.bundleId } }, update: { metadata: { orderId: order.id, bundleId: target.bundleId }, updatedAt: new Date() } });
  const academyUrl = env.ACADEMY_URL ?? 'http://localhost:5174';
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      locale: 'pl',
      billing_address_collection: input.isBusiness ? 'required' : 'auto',
      tax_id_collection: { enabled: true },
      customer_creation: 'always',
      invoice_creation: { enabled: Boolean(input.invoiceRequested) },
      line_items: [{ quantity: 1, price_data: { currency: 'pln', unit_amount: Math.round(pricing.price * 100), product_data: { name: target.title, description: target.description.slice(0, 500) } } }],
      metadata: { orderId: order.id, userId, ...(target.courseId ? { courseId: target.courseId } : {}), ...(target.bundleId ? { bundleId: target.bundleId } : {}) },
      success_url: `${academyUrl}/platnosc/sukces?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${academyUrl}/platnosc/anulowana?order_id=${order.id}`,
      expires_at: Math.floor((Date.now() + pendingWindowMs) / 1000),
    }, { idempotencyKey: `academy-checkout-${order.id}` });
    await prisma.academyOrder.update({ where: { id: order.id }, data: { stripeSessionId: session.id, events: { create: { type: 'CHECKOUT_SESSION_CREATED' } } } });
    return { orderId: order.id, checkoutUrl: session.url };
  } catch (error) {
    await prisma.academyOrder.update({ where: { id: order.id }, data: { status: 'FAILED', failureReason: error instanceof Error ? error.message.slice(0, 500) : 'Stripe session creation failed', events: { create: { type: 'CHECKOUT_SESSION_FAILED' } } } });
    throw error;
  }
};

export const createCartCheckout=async(userId:string,input:CheckoutInput&{items?:Array<{type:'course'|'bundle';id:string}>})=>{const requested=Array.isArray(input.items)?input.items.slice(0,20):[];if(!requested.length)throw new AppError('Koszyk jest pusty',400);const courseIds=[...new Set(requested.filter(item=>item.type==='course').map(item=>item.id))],bundleIds=[...new Set(requested.filter(item=>item.type==='bundle').map(item=>item.id))];const [courses,bundles,enrollments]=await Promise.all([prisma.course.findMany({where:{id:{in:courseIds},status:'PUBLISHED',isActive:true,isFree:false,isComingSoon:false}}),prisma.academyBundle.findMany({where:{id:{in:bundleIds},isActive:true},include:{courses:{include:{course:true}}}}),prisma.academyEnrollment.findMany({where:{userId}})]);if(courses.length!==courseIds.length||bundles.length!==bundleIds.length)throw new AppError('Jeden z produktów nie jest dostępny',400);const active=new Set(enrollments.filter(row=>hasActiveCourseAccess(row,courses.find(course=>course.id===row.courseId)?.accessDays)).map(row=>row.courseId));const items=[...courses.filter(course=>!active.has(course.id)).map(course=>({courseId:course.id,title:course.title,unitPrice:Number(course.price),courseIds:[course.id]})),...bundles.map(bundle=>({bundleId:bundle.id,title:bundle.title,unitPrice:Number(bundle.price),courseIds:bundle.courses.map(row=>row.courseId).filter(id=>!active.has(id))})).filter(item=>item.courseIds.length)];if(!items.length)throw new AppError('Masz już dostęp do wszystkich produktów z koszyka',409);const price=items.reduce((sum,item)=>sum+item.unitPrice,0);return createOrderAndSession(userId,input,{title:`Koszyk Akademii (${items.length})`,description:items.map(item=>item.title).join(', '),price,items});};

export const createCourseCheckout = async (userId: string, courseId: string, input: CheckoutInput) => {
  const [course, enrollment] = await Promise.all([
    prisma.course.findFirst({ where: { id: courseId, status: 'PUBLISHED', isActive: true } }),
    prisma.academyEnrollment.findUnique({ where: { userId_courseId: { userId, courseId } } }),
  ]);
  if (!course) throw new AppError('Nie znaleziono kursu', 404);
  if (hasActiveCourseAccess(enrollment, course.accessDays)) throw new AppError('Masz już dostęp do tego kursu', 409);
  if (course.isFree || Number(course.price) <= 0 || course.isComingSoon) throw new AppError('Ten kurs nie jest obecnie dostępny do płatnego zakupu', 400);
  return createOrderAndSession(userId, input, { courseId, title: course.title, description: course.description, price: Number(course.price), accessDays: course.accessDays });
};

export const createBundleCheckout = async (userId: string, bundleId: string, input: CheckoutInput) => {
  const bundle = await prisma.academyBundle.findFirst({ where: { id: bundleId, isActive: true }, include: { courses: { include: { course: true } } } });
  if (!bundle || !bundle.courses.length || Number(bundle.price) <= 0) throw new AppError('Pakiet nie jest dostępny do zakupu', 404);
  const enrollments = await prisma.academyEnrollment.findMany({ where: { userId, courseId: { in: bundle.courses.map((item) => item.courseId) } } });
  if (bundle.courses.every((item) => hasActiveCourseAccess(enrollments.find((entry) => entry.courseId === item.courseId), bundle.accessDays ?? item.course.accessDays))) {
    throw new AppError('Masz już aktywny dostęp do wszystkich kursów z tego pakietu', 409);
  }
  return createOrderAndSession(userId, input, { bundleId, title: bundle.title, description: bundle.description, price: Number(bundle.price), accessDays: bundle.accessDays });
};

const sendConfirmationIfNeeded = async (orderId: string) => {
  const order = await prisma.academyOrder.findUnique({ where: { id: orderId }, include: { items:true,user: true, course: true, bundle: true } });
  if (!order || order.status !== 'PAID' || order.confirmationSentAt) return;
  const claimedAt = new Date();
  const claim = await prisma.academyOrder.updateMany({ where: { id: orderId, status: 'PAID', confirmationSentAt: null }, data: { confirmationSentAt: claimedAt } });
  if (!claim.count) return;
  const terms = await getDocumentVersion('TERMS', order.termsVersion);
  const title = order.course?.title ?? order.bundle?.title ?? (order.items.length?order.items.map(item=>item.title).join(', '):'Kurs Akademii');
  const html = `<h1>Potwierdzenie zamówienia ${order.id}</h1><p>Dzień dobry ${escapeHtml(order.user.name)},</p><p>Potwierdzamy płatność i nadanie dostępu do: <strong>${escapeHtml(title)}</strong>.</p><p>Kwota: <strong>${Number(order.amount).toFixed(2)} ${order.currency}</strong></p>${order.invoiceUrl ? `<p><a href="${escapeHtml(order.invoiceUrl)}">Pobierz fakturę ${escapeHtml(order.invoiceNumber ?? '')}</a></p>` : ''}<p>Zaakceptowany Regulamin: ${escapeHtml(order.termsVersion)}. Zażądałaś/zażądałeś natychmiastowego dostarczenia treści cyfrowej i przyjęłaś/przyjąłeś do wiadomości utratę prawa odstąpienia po rozpoczęciu świadczenia.</p><p>Numer zamówienia: ${order.id}</p><hr><h2>Regulamin zapisany przy zamówieniu</h2><pre style="white-space:pre-wrap">${escapeHtml(terms.content)}</pre>`;
  try {
    await sendEmail(order.user.email, `Potwierdzenie zamówienia ${order.id} — Akademia BeskidStudio`, html);
    await prisma.academyOrderEvent.create({ data: { orderId: order.id, type: 'CONFIRMATION_SENT' } });
  } catch (error) {
    await prisma.academyOrder.updateMany({ where: { id: order.id, confirmationSentAt: claimedAt }, data: { confirmationSentAt: null } });
    throw error;
  }
};

const sendAbandonedCheckoutEmail = async (orderId: string) => {
  const order = await prisma.academyOrder.findUnique({ where: { id: orderId }, include: { user: true, course: true, bundle: true } });
  if (!order || order.status !== 'CANCELLED') return;
  const title = order.course?.title ?? order.bundle?.title ?? 'wybrany kurs';
  const academyUrl = env.ACADEMY_URL ?? 'http://localhost:5174';
  const href = order.course ? `${academyUrl}/kurs/${order.course.slug}` : `${academyUrl}/pakiet/${order.bundle?.slug}`;
  await sendEmail(order.user.email, 'Twój wybór w Akademii nadal na Ciebie czeka', `<h1>Wróć do nauki, kiedy będziesz gotowa/y</h1><p>Zakup „${escapeHtml(title)}” nie został dokończony.</p><p><a href="${escapeHtml(href)}">Wróć do oferty</a></p><p>Jeżeli nie chcesz otrzymywać takich przypomnień, odpowiedz na tę wiadomość.</p>`).catch(() => undefined);
};

const fulfill = async (orderId: string, session: Stripe.Checkout.Session) => {
  const order = await prisma.academyOrder.findUnique({ where: { id: orderId }, include: { items:true,course: true, bundle: { include: { courses: { include: { course: true } } } } } });
  if (!order) return;
  if (order.stripeSessionId !== session.id || session.amount_total !== Math.round(Number(order.amount) * 100) || session.currency?.toLowerCase() !== order.currency.toLowerCase()) throw new AppError('Dane płatności nie są zgodne z zamówieniem', 400);
  if (session.payment_status !== 'paid') return;
  let invoiceNumber: string | null = null;
  let invoiceUrl: string | null = null;
  const invoiceId = typeof session.invoice === 'string' ? session.invoice : session.invoice?.id;
  if (stripe && invoiceId) {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    invoiceNumber = invoice.number;
    invoiceUrl = invoice.hosted_invoice_url ?? invoice.invoice_pdf ?? null;
  }
  if (order.status !== 'PAID') {
    const purchasedAt = new Date();
    const rawEnrollments = order.items.length
      ? order.items.flatMap(item=>item.courseIds.map(courseId=>({courseId,expiresAt:null,accessDays:null})))
      : order.courseId && order.course
      ? [{ courseId: order.courseId, expiresAt: expiry(order.course.accessDays), accessDays: order.course.accessDays }]
      : (order.bundle?.courses ?? []).map((item) => ({
          courseId: item.courseId,
          expiresAt: expiry(order.bundle?.accessDays ?? item.course.accessDays),
          accessDays: item.course.accessDays,
        }));
    const enrollments=Array.from(new Map(rawEnrollments.map(item=>[item.courseId,item])).values());
    const existing = await prisma.academyEnrollment.findMany({ where: { userId: order.userId, courseId: { in: enrollments.map((item) => item.courseId) } } });
    const grantedEnrollments = enrollments.filter((item) =>
      !hasActiveCourseAccess(existing.find((entry) => entry.courseId === item.courseId), item.accessDays),
    );
    await prisma.$transaction([
      prisma.academyOrder.update({ where: { id: order.id }, data: { status: 'PAID', paidAt: purchasedAt, failureReason: null, stripePaymentId: typeof session.payment_intent === 'string' ? session.payment_intent : null, invoiceNumber, invoiceUrl, grantedCourseIds: grantedEnrollments.map((item) => item.courseId), events: { create: { type: 'PAYMENT_CONFIRMED' } } } }),
      ...grantedEnrollments.map((item) => prisma.academyEnrollment.upsert({ where: { userId_courseId: { userId: order.userId, courseId: item.courseId } }, create: { userId: order.userId, courseId: item.courseId, purchasedAt, accessExpiresAt: item.expiresAt }, update: { purchasedAt, accessExpiresAt: item.expiresAt } })),
      ...(order.promotionId ? [prisma.academyPromotion.update({ where: { id: order.promotionId }, data: { usageCount: { increment: 1 } } }), prisma.academyPromotionUsage.create({ data: { userId: order.userId, promotionId: order.promotionId, courseId: order.courseId, bundleId: order.bundleId, discountAmount: order.discountAmount } })] : []),
      ...(order.discountCodeId ? [prisma.academyDiscountCode.update({ where: { id: order.discountCodeId }, data: { usageCount: { increment: 1 } } }), prisma.academyPromotionUsage.create({ data: { userId: order.userId, discountCodeId: order.discountCodeId, courseId: order.courseId, bundleId: order.bundleId, discountAmount: order.discountAmount } })] : []),
    ]);
    const buyer=await prisma.academyUser.findUnique({where:{id:order.userId},select:{email:true}});
    if(buyer){await prisma.academyDiscountCode.create({data:{code:`WRACAM-${order.id.slice(-8).toUpperCase()}`,description:`POST_PURCHASE:${order.id}`,target:'ALL',discountType:'PERCENTAGE',discountValue:10,startsAt:new Date(),endsAt:new Date(Date.now()+30*86_400_000),eligibleEmails:[buyer.email.toLowerCase()],maxUses:1,maxUsesPerCustomer:1}}).catch(()=>undefined);await prisma.academyMarketingLead.updateMany({where:{email:buyer.email.toLowerCase()},data:{convertedAt:new Date()}});}
  }
  await sendConfirmationIfNeeded(order.id);
};

const markRefund = async (paymentIntent: string, amount: number, reason = 'Zwrot płatności') => {
  const order = await prisma.academyOrder.findUnique({ where: { stripePaymentId: paymentIntent }, include: { items: true, user: true, course: true, bundle: { include: { courses: true } } } });
  if (!order) return;
  const full = amount >= Math.round(Number(order.amount) * 100);
  const courseIds = order.grantedCourseIds;
  const otherPaidOrders = full && courseIds.length ? await prisma.academyOrder.findMany({
    where: { id: { not: order.id }, userId: order.userId, status: 'PAID', OR: [{ courseId: { in: courseIds } }, { bundle: { courses: { some: { courseId: { in: courseIds } } } } }] },
    select: { courseId: true, items: { select: { courseIds: true } }, bundle: { select: { courses: { select: { courseId: true } } } } },
  }) : [];
  const retained = new Set(otherPaidOrders.flatMap((item) => item.courseId ? [item.courseId] : item.items.length ? item.items.flatMap((entry) => entry.courseIds) : item.bundle?.courses.map((course) => course.courseId) ?? []));
  const revokeIds = courseIds.filter((courseId) => !retained.has(courseId));
  await prisma.$transaction([
    prisma.academyOrder.update({ where: { id: order.id }, data: { status: full ? 'REFUNDED' : 'PAID', refundedAt: new Date(), refundAmount: amount / 100, refundReason: reason, events: { create: { type: full ? 'FULL_REFUND_CONFIRMED' : 'PARTIAL_REFUND_CONFIRMED', details: { amount } } } } }),
    ...(full && revokeIds.length ? [prisma.academyEnrollment.deleteMany({ where: { userId: order.userId, courseId: { in: revokeIds } } })] : []),
  ]);
  const title = order.course?.title ?? order.bundle?.title ?? 'produkt cyfrowy';
  await sendEmail(order.user.email, `Zwrot do zamówienia ${order.id} — Akademia BeskidStudio`, `<h1>Potwierdzenie zwrotu</h1><p>Potwierdzamy ${full ? 'pełny' : 'częściowy'} zwrot w kwocie <strong>${(amount / 100).toFixed(2)} ${order.currency}</strong> za ${escapeHtml(title)}.</p><p>Numer zamówienia: ${order.id}</p>${full ? '<p>Dostęp wynikający z tego zamówienia został cofnięty, o ile nie przysługuje Ci z innego aktywnego zamówienia.</p>' : ''}`);
};

export const handleWebhook = async (payload: Buffer, signature: string) => {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) throw new AppError('Webhook Stripe nie jest skonfigurowany', 503);
  const event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  try {
    await prisma.academyPaymentWebhookEvent.create({ data: { eventId: event.id, type: event.type } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return;
    throw error;
  }
  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object;
      if (session.metadata?.orderId) await fulfill(session.metadata.orderId, session);
    } else if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object;
      if (session.metadata?.orderId) {
        const result = await prisma.academyOrder.updateMany({ where: { id: session.metadata.orderId, status: 'PENDING' }, data: { status: 'FAILED', failureReason: 'Płatność odroczona nie powiodła się' } });
        if (result.count) await prisma.academyOrderEvent.create({ data: { orderId: session.metadata.orderId, type: 'ASYNC_PAYMENT_FAILED' } });
      }
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      if (session.metadata?.orderId) {
        const result = await prisma.academyOrder.updateMany({ where: { id: session.metadata.orderId, status: 'PENDING' }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
        if (result.count) await prisma.academyOrderEvent.create({ data: { orderId: session.metadata.orderId, type: 'CHECKOUT_EXPIRED' } });
        if (result.count) await sendAbandonedCheckoutEmail(session.metadata.orderId);
      }
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object;
      const paymentIntent = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
      if (paymentIntent) await markRefund(paymentIntent, charge.amount_refunded, 'Zwrot potwierdzony przez operatora płatności');
    } else if (event.type === 'charge.dispute.created') {
      const dispute = event.data.object;
      const paymentIntent = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id;
      if (paymentIntent) {
        const order = await prisma.academyOrder.findUnique({ where: { stripePaymentId: paymentIntent }, select: { id: true } });
        if (order) await prisma.academyOrder.update({ where: { id: order.id }, data: { failureReason: 'Otwarto spór płatniczy', events: { create: { type: 'PAYMENT_DISPUTE_CREATED' } } } });
      }
    }
    await prisma.academyPaymentWebhookEvent.update({ where: { eventId: event.id }, data: { processedAt: new Date() } });
  } catch (error) {
    await prisma.academyOperationalEvent.create({ data: {
      severity: 'CRITICAL',
      source: 'STRIPE_WEBHOOK',
      message: error instanceof Error ? error.message.slice(0, 500) : 'Nieznany błąd obsługi webhooka Stripe',
      details: { eventId: event.id, eventType: event.type },
    } }).catch(() => undefined);
    await prisma.academyPaymentWebhookEvent.deleteMany({ where: { eventId: event.id } });
    throw error;
  }
};

const orderSelect = { id: true, status: true, amount: true, currency: true, paidAt: true, refundedAt: true, refundAmount: true, invoiceRequested: true, invoiceNumber: true, invoiceUrl: true, createdAt: true, items: { select: { title: true, unitPrice: true, courseIds: true } }, course: { select: { title: true, slug: true } }, bundle: { select: { title: true, slug: true } } } as const;
export const listMyOrders = (userId: string) => prisma.academyOrder.findMany({ where: { userId }, select: orderSelect, orderBy: { createdAt: 'desc' } });

export const getMyOrderStatus = async (userId: string, sessionId: string) => {
  const order = await prisma.academyOrder.findFirst({ where: { userId, stripeSessionId: sessionId }, select: orderSelect });
  if (!order) throw new AppError('Nie znaleziono zamówienia', 404);
  const offer=await prisma.academyDiscountCode.findFirst({where:{description:`POST_PURCHASE:${order.id}`,isActive:true,endsAt:{gt:new Date()}},select:{code:true,endsAt:true,discountValue:true}});
  return {...order,postPurchaseOffer:offer};
};

export const adminListOrders = (filters: { status?: string; search?: string }) => prisma.academyOrder.findMany({
  where: {
    ...(filters.status && filters.status !== 'ALL' ? { status: filters.status as never } : {}),
    ...(filters.search ? { OR: [{ user: { email: { contains: filters.search, mode: 'insensitive' } } }, { user: { name: { contains: filters.search, mode: 'insensitive' } } }, { id: { contains: filters.search, mode: 'insensitive' } }] } : {}),
  },
  include: { user: { select: { id: true, name: true, email: true } }, items: true, course: { select: { title: true } }, bundle: { select: { title: true } }, events: { orderBy: { createdAt: 'desc' }, take: 10 } },
  orderBy: { createdAt: 'desc' },
  take: 500,
});

export const requestRefund = async (orderId: string, amount?: number, reason?: string) => {
  if (!stripe) throw new AppError('Płatności online nie są jeszcze skonfigurowane', 503);
  const order = await prisma.academyOrder.findUnique({ where: { id: orderId } });
  if (!order?.stripePaymentId || order.status !== 'PAID') throw new AppError('Tego zamówienia nie można zwrócić', 400);
  const amountInGrosze = amount ? Math.round(amount * 100) : undefined;
  if (amountInGrosze && (amountInGrosze <= 0 || amountInGrosze > Math.round(Number(order.amount) * 100))) throw new AppError('Nieprawidłowa kwota zwrotu', 400);
  const refund = await stripe.refunds.create({ payment_intent: order.stripePaymentId, ...(amountInGrosze ? { amount: amountInGrosze } : {}), metadata: { orderId, reason: text(reason, 300) } }, { idempotencyKey: `academy-refund-${order.id}-${amountInGrosze ?? 'full'}` });
  await prisma.academyOrder.update({ where: { id: order.id }, data: { events: { create: { type: 'REFUND_REQUESTED', details: { refundId: refund.id, amount: amountInGrosze ?? null, reason: text(reason, 300) } } } } });
  return { refundId: refund.id, status: refund.status };
};
