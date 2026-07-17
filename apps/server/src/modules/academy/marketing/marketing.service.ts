import { DiscountType, Prisma } from '@prisma/client';
import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';
import { sendEmail } from '../../../utils/email';
import { env } from '../../../config/env';

const clean = (value: unknown, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const date = (value: unknown) => value ? new Date(String(value)) : null;
const activeWindow = (now = new Date()) => ({ isActive: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] });

export const publicStorefront = async () => {
  const now = new Date();
  const [banners, students, completions, approvedReviews, activePromotion] = await Promise.all([
    prisma.academyBanner.findMany({ where: activeWindow(now), orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }),
    prisma.academyEnrollment.groupBy({ by: ['userId'] }).then(rows => rows.length),
    prisma.userCourseProgress.count({ where: { completedAt: { not: null } } }),
    prisma.academyCourseReview.findMany({ where: { isApproved: true }, include: { user: { select: { name: true } }, course: { select: { title: true } } }, orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.academyPromotion.findFirst({ where: { isActive: true, newCustomersOnly: false, eligibleEmails: { isEmpty: true }, startsAt: { lte: now }, endsAt: { gt: now }, showCountdown: true }, orderBy: { endsAt: 'asc' } }),
  ]);
  return { banners, socialProof: { students, completions, reviews: approvedReviews }, activePromotion };
};

export const recordBannerEvent = async (id: string, type: 'impression' | 'click') => {
  await prisma.academyBanner.updateMany({ where: { id, isActive: true }, data: type === 'click' ? { clicks: { increment: 1 } } : { impressions: { increment: 1 } } });
};

export const saveLead = async (data: any) => {
  const email = clean(data.email, 254).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new AppError('Podaj poprawny adres e-mail', 400);
  const type = String(data.type || 'NEWSLETTER') as any;
  if (!['NEWSLETTER', 'LEAD_MAGNET', 'WAITLIST', 'ABANDONED_CHECKOUT'].includes(type)) throw new AppError('Nieprawidłowy typ zapisu', 400);
  if (!data.consent && type !== 'ABANDONED_CHECKOUT') throw new AppError('Zaznacz zgodę na kontakt', 400);
  const courseId = clean(data.courseId, 100);
  const lead = await prisma.academyMarketingLead.upsert({
    where: { email_type_courseId: { email, type, courseId } },
    create: { email, name: clean(data.name, 120) || null, type, courseId, source: clean(data.source, 100) || null, consentAt: data.consent ? new Date() : null,utmSource:clean(data.utmSource,100)||null,utmMedium:clean(data.utmMedium,100)||null,utmCampaign:clean(data.utmCampaign,100)||null,tags:Array.isArray(data.tags)?data.tags.map((v:unknown)=>clean(v,50)).filter(Boolean):[], metadata: data.metadata ?? undefined },
    update: { name: clean(data.name, 120) || undefined, source: clean(data.source, 100) || undefined, consentAt: data.consent ? new Date() : undefined, unsubscribedAt: null,utmSource:clean(data.utmSource,100)||undefined,utmMedium:clean(data.utmMedium,100)||undefined,utmCampaign:clean(data.utmCampaign,100)||undefined, metadata: data.metadata ?? undefined },
  });
  const academyUrl = env.ACADEMY_URL ?? 'http://localhost:5174';
  const unsubscribeUrl = `${academyUrl}/wypisz/${lead.unsubscribeToken}`;
  if (type === 'LEAD_MAGNET') await sendEmail(email, 'Bezpłatna checklista Akademii BeskidStudio', `<h1>Twoja checklista pracy z klientką</h1><ol><li>Zbierz pełny wywiad i określ przeciwwskazania.</li><li>Zapisz cel zabiegowy oraz mierzalny punkt wyjścia.</li><li>Dobierz procedurę, pielęgnację domową i termin kontroli.</li><li>Udokumentuj reakcję skóry oraz zalecenia.</li><li>Porównaj efekty i zaplanuj kolejny krok.</li></ol><p>Więcej praktycznych materiałów znajdziesz w Akademii.</p><p><a href="${unsubscribeUrl}">Wypisz mnie z wiadomości marketingowych</a></p>`);
  if (type === 'NEWSLETTER') await sendEmail(email, 'Witaj w Akademii BeskidStudio', `<h1>Dziękujemy za zapis</h1><p>Od teraz będziemy informować Cię o premierach, praktycznych materiałach i promocjach Akademii.</p><p><a href="${unsubscribeUrl}">Wypisz mnie z wiadomości marketingowych</a></p>`);
  return lead;
};

export const unsubscribeLead = async (token: string) => {
  const lead = await prisma.academyMarketingLead.findUnique({ where: { unsubscribeToken: token } });
  if (!lead) throw new AppError('Link wypisu jest nieprawidłowy', 404);
  await prisma.academyMarketingLead.updateMany({ where: { email: lead.email, type: { in: ['NEWSLETTER', 'LEAD_MAGNET', 'WAITLIST'] } }, data: { unsubscribedAt: new Date() } });
  return { email: lead.email };
};

export const sendMarketingCampaign = async (data: any) => {
  const subject=clean(data.subject,160),content=clean(data.content,5000),audience=String(data.audience||'NEWSLETTER'),courseId=clean(data.courseId,100);
  if(!subject||content.length<10)throw new AppError('Podaj temat i treść wiadomości',400);
  const types=audience==='ALL'?['NEWSLETTER','LEAD_MAGNET','WAITLIST'] as any[]:[audience] as any[];
  const leads=await prisma.academyMarketingLead.findMany({where:{type:{in:types},unsubscribedAt:null,consentAt:{not:null},...(audience==='WAITLIST'&&courseId?{courseId}:{})},distinct:['email']});
  const scheduledAt=data.scheduledAt?new Date(data.scheduledAt):new Date();const campaign=await prisma.academyEmailCampaign.create({data:{name:clean(data.name,160)||subject,subject,content,audience,courseId:courseId||null,scheduledAt,status:scheduledAt>new Date()?'SCHEDULED':'SENDING',recipients:leads.length,deliveries:{create:leads.map(lead=>({email:lead.email,nextAttemptAt:scheduledAt}))}},include:{deliveries:true}});
  if(scheduledAt<=new Date())void processAcademyEmailQueue();return campaign;
};

export const listCampaigns=()=>prisma.academyEmailCampaign.findMany({include:{deliveries:{orderBy:{createdAt:'desc'},take:20}},orderBy:{createdAt:'desc'},take:100});
export const updateLead=(id:string,data:any)=>prisma.academyMarketingLead.update({where:{id},data:{tags:Array.isArray(data.tags)?data.tags.map((v:unknown)=>clean(v,50)).filter(Boolean):undefined,unsubscribedAt:data.unsubscribed===true?new Date():data.unsubscribed===false?null:undefined}});
export const deleteLead=(id:string)=>prisma.academyMarketingLead.delete({where:{id}});
export const sendCampaignTest=async(data:any,email:string)=>{const subject=clean(data.subject,160),content=clean(data.content,5000);if(!subject||!content)throw new AppError('UzupeĹ‚nij temat i treĹ›Ä‡',400);await sendEmail(email,`[TEST] ${subject}`,`<div style="white-space:pre-wrap">${escapeCampaign(content)}</div>`);return{sent:true};};
const escapeCampaign=(value:string)=>value.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!));
export const sendCampaignTestForUser=async(data:any,userId:string)=>{const user=await prisma.academyUser.findUnique({where:{id:userId},select:{email:true}});if(!user)throw new AppError('Nie znaleziono administratora',404);return sendCampaignTest(data,user.email);};
export const processAcademyEmailQueue=async()=>{const now=new Date();await prisma.academyEmailCampaign.updateMany({where:{status:'SCHEDULED',scheduledAt:{lte:now}},data:{status:'SENDING'}});const deliveries=await prisma.academyEmailDelivery.findMany({where:{status:{in:['QUEUED','FAILED']},nextAttemptAt:{lte:now},attempts:{lt:4},campaign:{status:'SENDING'}},include:{campaign:true},take:25});const academyUrl=env.ACADEMY_URL??'http://localhost:5174';for(const delivery of deliveries){const claim=await prisma.academyEmailDelivery.updateMany({where:{id:delivery.id,status:{in:['QUEUED','FAILED']}},data:{status:'PROCESSING',attempts:{increment:1}}});if(!claim.count)continue;try{const lead=await prisma.academyMarketingLead.findFirst({where:{email:delivery.email}});const track=`${academyUrl.replace(/\/$/,'')}/api/academy/public/email/open/${delivery.token}`;const click=`${academyUrl.replace(/\/$/,'')}/api/academy/public/email/click/${delivery.token}?url=${encodeURIComponent(academyUrl)}`;await sendEmail(delivery.email,delivery.campaign.subject,`<div style="white-space:pre-wrap">${escapeCampaign(delivery.campaign.content)}</div><p><a href="${click}">PrzejdĹş do Akademii</a></p>${lead?`<p><a href="${academyUrl}/wypisz/${lead.unsubscribeToken}">Wypisz mnie</a></p>`:''}<img src="${track}" width="1" height="1" alt="">`);await prisma.academyEmailDelivery.update({where:{id:delivery.id},data:{status:'SENT',sentAt:new Date(),lastError:null}});}catch(error){const attempts=delivery.attempts+1;await prisma.academyEmailDelivery.update({where:{id:delivery.id},data:{status:'FAILED',lastError:error instanceof Error?error.message.slice(0,500):'BĹ‚Ä…d wysyĹ‚ki',nextAttemptAt:new Date(Date.now()+Math.pow(3,attempts)*60_000)}});}}const campaigns=await prisma.academyEmailCampaign.findMany({where:{status:'SENDING'},select:{id:true,_count:{select:{deliveries:true}}}});for(const row of campaigns){const [sent,failed,pending]=await Promise.all([prisma.academyEmailDelivery.count({where:{campaignId:row.id,status:'SENT'}}),prisma.academyEmailDelivery.count({where:{campaignId:row.id,status:'FAILED',attempts:{gte:4}}}),prisma.academyEmailDelivery.count({where:{campaignId:row.id,status:{in:['QUEUED','PROCESSING']}}})]);await prisma.academyEmailCampaign.update({where:{id:row.id},data:{sentCount:sent,failedCount:failed,...(!pending&&sent+failed===row._count.deliveries?{status:'SENT',sentAt:new Date()}:{})}});}};
export const trackEmailOpen=async(token:string)=>{const delivery=await prisma.academyEmailDelivery.findUnique({where:{token}});if(!delivery)return;const first=!delivery.openedAt;await prisma.academyEmailDelivery.update({where:{token},data:{openedAt:new Date()}});if(first)await prisma.academyEmailCampaign.update({where:{id:delivery.campaignId},data:{openedCount:{increment:1}}});};
export const trackEmailClick=async(token:string)=>{const delivery=await prisma.academyEmailDelivery.findUnique({where:{token}});if(!delivery)return;const first=!delivery.clickedAt;await prisma.academyEmailDelivery.update({where:{token},data:{clickedAt:new Date()}});if(first)await prisma.academyEmailCampaign.update({where:{id:delivery.campaignId},data:{clickedCount:{increment:1}}});};
export const initializeAcademyMarketingScheduler=()=>{const run=()=>processAcademyEmailQueue().catch(error=>prisma.academyOperationalEvent.create({data:{severity:'ERROR',source:'EMAIL_QUEUE',message:error instanceof Error?error.message:'BĹ‚Ä…d kolejki'}}).catch(()=>undefined));void run();return setInterval(run,60_000);};

export const listAdmin = async () => {
  const [banners, promotions, codes, leads] = await Promise.all([
    prisma.academyBanner.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }),
    prisma.academyPromotion.findMany({ include: { orders: { where: { status: 'PAID' }, select: { amount: true, discountAmount: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.academyDiscountCode.findMany({ include: { orders: { where: { status: 'PAID' }, select: { amount: true, discountAmount: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.academyMarketingLead.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 }),
  ]);
  const stats = (rows: any[]) => rows.map(({ orders, ...row }) => ({ ...row, revenue: orders.reduce((sum: number, order: any) => sum + Number(order.amount), 0), totalDiscount: orders.reduce((sum: number, order: any) => sum + Number(order.discountAmount), 0), paidOrders: orders.length }));
  return { banners, promotions: stats(promotions), codes: stats(codes), leads:leads.map(lead=>({...lead,isCustomer:Boolean(lead.convertedAt)})) };
};

const bannerData = (data: any) => { const startsAt=date(data.startsAt),endsAt=date(data.endsAt); if(startsAt&&endsAt&&endsAt<=startsAt)throw new AppError('Koniec publikacji banera musi być później niż początek',400); return { title: clean(data.title, 160), subtitle: clean(data.subtitle, 500) || null, badge: clean(data.badge, 80) || null, imageUrl: clean(data.imageUrl, 1000) || null, mobileImageUrl: clean(data.mobileImageUrl, 1000) || null, buttonLabel: clean(data.buttonLabel, 80) || null, buttonUrl: clean(data.buttonUrl, 1000) || null, startsAt, endsAt, isActive: data.isActive !== false, sortOrder: Number(data.sortOrder) || 0 }; };
export const createBanner = (data: any) => { const input = bannerData(data); if (!input.title) throw new AppError('Podaj tytuł banera', 400); return prisma.academyBanner.create({ data: input }); };
export const updateBanner = (id: string, data: any) => prisma.academyBanner.update({ where: { id }, data: bannerData(data) });
export const deleteBanner = (id: string) => prisma.academyBanner.delete({ where: { id } });

const offerData = (data: any, code = false) => {
  const discountType = String(data.discountType) as DiscountType;
  const discountValue = Number(data.discountValue);
  if (!['AMOUNT', 'PERCENTAGE'].includes(discountType) || discountValue <= 0 || (discountType === 'PERCENTAGE' && discountValue > 100)) throw new AppError('Podaj prawidłową wartość rabatu', 400);
  const base = { target: String(data.target || 'ALL') as any, targetIds: Array.isArray(data.targetIds) ? data.targetIds.map(String) : [], eligibleEmails: (Array.isArray(data.eligibleEmails)?data.eligibleEmails:String(data.eligibleEmailsText||'').split(/[\s,;]+/)).map((value:unknown)=>clean(value,254).toLowerCase()).filter(Boolean), discountType, discountValue, startsAt: date(data.startsAt), endsAt: date(data.endsAt), isActive: data.isActive !== false, newCustomersOnly: Boolean(data.newCustomersOnly), maxUses: data.maxUses ? Number(data.maxUses) : null, maxUsesPerCustomer: Math.max(1, Number(data.maxUsesPerCustomer) || 1), minimumAmount: data.minimumAmount ? Number(data.minimumAmount) : null };
  if (!code && (!base.startsAt || !base.endsAt || base.endsAt <= base.startsAt)) throw new AppError('Podaj prawidłowy czas trwania promocji', 400);
  return base;
};
export const createPromotion = (data: any) => { const name=clean(data.name,160);if(!name)throw new AppError('Podaj nazwę promocji',400);return prisma.academyPromotion.create({ data: { ...offerData(data), name, publicLabel: clean(data.publicLabel, 100) || null, showCountdown: Boolean(data.showCountdown) } as any }); };
export const updatePromotion = (id: string, data: any) => prisma.academyPromotion.update({ where: { id }, data: { ...offerData(data), name: clean(data.name, 160), publicLabel: clean(data.publicLabel, 100) || null, showCountdown: Boolean(data.showCountdown) } as any });
export const deletePromotion = (id: string) => prisma.academyPromotion.delete({ where: { id } });
export const createCode = (data: any) => {const code=clean(data.code,50).toUpperCase();if(!/^[A-Z0-9_-]{3,50}$/.test(code))throw new AppError('Kod musi mieć co najmniej 3 znaki i może zawierać litery, cyfry, _ oraz -',400);return prisma.academyDiscountCode.create({ data: { ...offerData(data, true), code, description: clean(data.description, 300) || null } });};
export const updateCode = (id: string, data: any) => prisma.academyDiscountCode.update({ where: { id }, data: { ...offerData(data, true), code: clean(data.code, 50).toUpperCase(), description: clean(data.description, 300) || null } });
export const deleteCode = (id: string) => prisma.academyDiscountCode.delete({ where: { id } });

type PriceTarget = { courseId?: string; bundleId?: string; price: number; items?: Array<{ courseId?: string; bundleId?: string; unitPrice: number }> };
const eligiblePrice = (offer: { target: string; targetIds: string[] }, target: PriceTarget) => {
  if (offer.target === 'ALL') return target.price;
  const directMatch = offer.target === 'COURSE' ? target.courseId : target.bundleId;
  if (directMatch && (!offer.targetIds.length || offer.targetIds.includes(directMatch))) return target.price;
  return (target.items ?? []).filter((item) => {
    const id = offer.target === 'COURSE' ? item.courseId : item.bundleId;
    return Boolean(id) && (!offer.targetIds.length || offer.targetIds.includes(id!));
  }).reduce((sum, item) => sum + item.unitPrice, 0);
};
const applies = (offer: { target: string; targetIds: string[]; minimumAmount: Prisma.Decimal | null }, target: PriceTarget) => (!offer.minimumAmount || target.price >= Number(offer.minimumAmount)) && eligiblePrice(offer, target) > 0;
export const calculateAcademyDiscount = (type: DiscountType, value: number, price: number) => Math.max(0, Math.min(price - 0.01, type === 'PERCENTAGE' ? price * value / 100 : value));
const amount = (type: DiscountType, value: Prisma.Decimal, price: number) => calculateAcademyDiscount(type, Number(value), price);

export const resolvePrice = async (userId: string, target: PriceTarget, rawCode?: string) => {
  const now = new Date();
  const [priorOrders,user] = await Promise.all([prisma.academyOrder.count({ where: { userId, status: 'PAID' } }),prisma.academyUser.findUnique({where:{id:userId},select:{email:true}})]);
  if(!user)throw new AppError('Nie znaleziono użytkownika',404);
  const promotions = await prisma.academyPromotion.findMany({ where: { isActive: true, startsAt: { lte: now }, endsAt: { gt: now } } });
  const eligible = [] as Array<{ id: string; discountType: DiscountType; discountValue: Prisma.Decimal; publicLabel: string | null; maxUses: number | null; usageCount: number; maxUsesPerCustomer: number; newCustomersOnly: boolean; eligibleEmails:string[]; target: string; targetIds: string[]; minimumAmount: Prisma.Decimal | null }>;
  for (const promotion of promotions) {
    if (!applies(promotion, target) || (promotion.maxUses && promotion.usageCount >= promotion.maxUses) || (promotion.newCustomersOnly && priorOrders > 0) || (promotion.eligibleEmails.length&&!promotion.eligibleEmails.includes(user.email.toLowerCase()))) continue;
    const used = await prisma.academyPromotionUsage.count({ where: { userId, promotionId: promotion.id } });
    if (used < promotion.maxUsesPerCustomer) eligible.push(promotion);
  }
  const promotion = eligible.sort((a, b) => amount(b.discountType, b.discountValue, eligiblePrice(b, target)) - amount(a.discountType, a.discountValue, eligiblePrice(a, target)))[0];
  let code = null;
  if (clean(rawCode)) {
    code = await prisma.academyDiscountCode.findUnique({ where: { code: clean(rawCode, 50).toUpperCase() } });
    if (!code || !code.isActive || (code.startsAt && code.startsAt > now) || (code.endsAt && code.endsAt <= now) || !applies(code, target) || (code.maxUses && code.usageCount >= code.maxUses) || (code.newCustomersOnly && priorOrders > 0) || (code.eligibleEmails.length&&!code.eligibleEmails.includes(user.email.toLowerCase()))) throw new AppError('Kod rabatowy jest nieprawidłowy lub nieaktywny', 400);
    const used = await prisma.academyPromotionUsage.count({ where: { userId, discountCodeId: code.id } });
    if (used >= code.maxUsesPerCustomer) throw new AppError('Limit użycia tego kodu został wyczerpany', 400);
  }
  const selected = [promotion && { kind: 'promotion', row: promotion, discount: amount(promotion.discountType, promotion.discountValue, eligiblePrice(promotion, target)) }, code && { kind: 'code', row: code, discount: amount(code.discountType, code.discountValue, eligiblePrice(code, target)) }].filter(Boolean).sort((a: any, b: any) => b.discount - a.discount)[0] as any;
  const discountAmount = selected?.discount ?? 0;
  return { originalAmount: target.price, price: Math.max(0.01, Math.round((target.price - discountAmount) * 100) / 100), discountAmount: Math.round(discountAmount * 100) / 100, promotionId: selected?.kind === 'promotion' ? selected.row.id : null, discountCodeId: selected?.kind === 'code' ? selected.row.id : null, label: selected?.row.publicLabel || selected?.row.code || null };
};

export const previewDiscountCode = async (userId: string, input: { courseId?: string; bundleId?: string; code?: string }) => {
  if (input.courseId) { const course=await prisma.course.findFirst({where:{id:input.courseId,status:'PUBLISHED',isActive:true}});if(!course)throw new AppError('Nie znaleziono kursu',404);return resolvePrice(userId,{courseId:course.id,price:Number(course.price)},input.code); }
  if (input.bundleId) { const bundle=await prisma.academyBundle.findFirst({where:{id:input.bundleId,isActive:true}});if(!bundle)throw new AppError('Nie znaleziono pakietu',404);return resolvePrice(userId,{bundleId:bundle.id,price:Number(bundle.price)},input.code); }
  throw new AppError('Wybierz produkt',400);
};

export const resolvePublicPrice = async (target: PriceTarget): Promise<{ price: number; compareAtPrice: number; promotionLabel: string; promotionEndsAt: Date; showCountdown: boolean } | null> => {
  const now = new Date();
  const promotions = await prisma.academyPromotion.findMany({ where: { isActive: true, newCustomersOnly: false, startsAt: { lte: now }, endsAt: { gt: now } } });
  const eligible = promotions.filter(row => !row.eligibleEmails.length && applies(row, target) && (!row.maxUses || row.usageCount < row.maxUses));
  const selected = eligible.sort((a, b) => amount(b.discountType, b.discountValue, eligiblePrice(b, target)) - amount(a.discountType, a.discountValue, eligiblePrice(a, target)))[0];
  if (!selected) return null;
  const discount = amount(selected.discountType, selected.discountValue, eligiblePrice(selected, target));
  return { price: Math.max(.01, Math.round((target.price - discount) * 100) / 100), compareAtPrice: target.price, promotionLabel: selected.publicLabel || selected.name, promotionEndsAt: selected.endsAt, showCountdown: selected.showCountdown };
};
