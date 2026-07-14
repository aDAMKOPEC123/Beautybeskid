import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';

const allowedEvents = new Set(['PAGE_VIEW', 'CATALOG_VIEW', 'COURSE_VIEW', 'CHECKOUT_STARTED', 'SIGN_UP', 'LOGIN']);
const clean = (value: unknown, max = 250) => typeof value === 'string' ? value.trim().slice(0, max) || undefined : undefined;

export const track = async (input: Record<string, unknown>, userId?: string) => {
  const eventType = clean(input.eventType, 40)?.toUpperCase();
  const visitorId = clean(input.visitorId, 80);
  const sessionId = clean(input.sessionId, 80);
  if (!eventType || !allowedEvents.has(eventType) || !visitorId || !sessionId) return;
  const courseId = clean(input.courseId, 80);
  if (courseId && !await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } })) return;
  const data = { eventType, visitorId, sessionId, userId, courseId,
    path: clean(input.path, 300), referrer: clean(input.referrer, 500), source: clean(input.source, 100),
    medium: clean(input.medium, 100), campaign: clean(input.campaign, 150),
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata as object : undefined };
  if (userId) await prisma.$transaction([
    prisma.academyAnalyticsEvent.updateMany({ where: { visitorId, userId: null }, data: { userId } }),
    prisma.academyAnalyticsEvent.create({ data }),
  ]);
  else await prisma.academyAnalyticsEvent.create({ data });
};

export const dashboard = async (days = 30) => {
  const safeDays = Math.min(365, Math.max(1, days));
  const since = new Date(Date.now() - safeDays * 86400000);
  const previousSince = new Date(since.getTime() - safeDays * 86400000);
  const [events, previousEvents, totalAccounts, newAccounts, enrollments, paidOrders, allCourses] = await Promise.all([
    prisma.academyAnalyticsEvent.findMany({ where: { createdAt: { gte: since } }, select: { eventType:true, visitorId:true, sessionId:true, userId:true, courseId:true, source:true, createdAt:true } }),
    prisma.academyAnalyticsEvent.findMany({ where: { createdAt: { gte: previousSince, lt: since } }, select: { eventType:true, visitorId:true } }),
    prisma.academyUser.count({ where: { role: 'USER' } }),
    prisma.academyUser.count({ where: { role: 'USER', createdAt: { gte: since } } }),
    prisma.academyEnrollment.findMany({ where: { purchasedAt: { gte: since } }, select: { userId:true, courseId:true, purchasedAt:true } }),
    prisma.academyOrder.findMany({ where: { status: 'PAID', paidAt: { gte: since } }, select: { amount:true, courseId:true } }),
    prisma.course.findMany({ select: { id:true, title:true, price:true } }),
  ]);
  const unique = (rows: typeof events, key: 'visitorId'|'sessionId'|'userId') => new Set(rows.map(row => row[key]).filter(Boolean)).size;
  const eventCount = (type: string) => events.filter(event => event.eventType === type).length;
  const visitors = unique(events, 'visitorId');
  const courseViewers = new Set(events.filter(e => e.eventType === 'COURSE_VIEW').map(e => e.visitorId)).size;
  const checkoutVisitors = new Set(events.filter(e => e.eventType === 'CHECKOUT_STARTED').map(e => e.visitorId)).size;
  const buyers = new Set(enrollments.map(e => e.userId)).size;
  const previousVisitors = new Set(previousEvents.map(e => e.visitorId)).size;
  const previousCourseViewers = new Set(previousEvents.filter(e => e.eventType === 'COURSE_VIEW').map(e => e.visitorId)).size;
  const courseStats = allCourses.map(course => {
    const views = events.filter(e => e.eventType === 'COURSE_VIEW' && e.courseId === course.id);
    const checkout = events.filter(e => e.eventType === 'CHECKOUT_STARTED' && e.courseId === course.id);
    const sales = enrollments.filter(e => e.courseId === course.id).length;
    return { id:course.id, title:course.title, price:Number(course.price), views:views.length, uniqueViewers:new Set(views.map(v=>v.visitorId)).size, checkoutStarted:checkout.length, sales, conversion:views.length ? sales / new Set(views.map(v=>v.visitorId)).size * 100 : 0 };
  }).sort((a,b)=>b.views-a.views);
  const sourceCounts = new Map<string, number>();
  events.filter(e=>e.eventType==='PAGE_VIEW'||e.eventType==='CATALOG_VIEW').forEach(e=>sourceCounts.set(e.source||'direct', (sourceCounts.get(e.source||'direct')||0)+1));
  const daily = Array.from({length:safeDays},(_,index)=>{
    const date = new Date(since.getTime() + index * 86400000).toISOString().slice(0,10);
    const rows = events.filter(e=>e.createdAt.toISOString().slice(0,10)===date);
    return { date, visitors:new Set(rows.map(r=>r.visitorId)).size, views:rows.filter(r=>r.eventType==='PAGE_VIEW').length, courseViews:rows.filter(r=>r.eventType==='COURSE_VIEW').length };
  });
  return {
    periodDays:safeDays,
    summary:{ visitors, sessions:unique(events,'sessionId'), pageViews:eventCount('PAGE_VIEW'), courseViews:eventCount('COURSE_VIEW'), courseViewers, checkoutStarted:eventCount('CHECKOUT_STARTED'), checkoutVisitors, buyers, sales:enrollments.length, revenue:paidOrders.reduce((sum,o)=>sum+Number(o.amount),0), totalAccounts, newAccounts, visitorToCourseRate:visitors?courseViewers/visitors*100:0, courseToCheckoutRate:courseViewers?checkoutVisitors/courseViewers*100:0, conversionRate:visitors?buyers/visitors*100:0, visitorChange:previousVisitors?((visitors-previousVisitors)/previousVisitors)*100:0, interestChange:previousCourseViewers?((courseViewers-previousCourseViewers)/previousCourseViewers)*100:0 },
    funnel:[{label:'Odwiedzający',value:visitors},{label:'Oglądający kurs',value:courseViewers},{label:'Rozpoczęli zakup',value:checkoutVisitors},{label:'Kupili',value:buyers}],
    courses:courseStats,
    sources:[...sourceCounts.entries()].map(([source,value])=>({source,value})).sort((a,b)=>b.value-a.value).slice(0,8), daily,
  };
};

export const customers = async (search = '') => {
  const users = await prisma.academyUser.findMany({
    where:{ role:'USER', ...(search ? { OR:[{name:{contains:search,mode:'insensitive'}},{email:{contains:search,mode:'insensitive'}}] } : {}) },
    include:{ enrollments:{include:{course:{select:{id:true,title:true}}},orderBy:{purchasedAt:'desc'}}, orders:{include:{course:{select:{title:true}}},orderBy:{createdAt:'desc'}}, analyticsEvents:{where:{eventType:{in:['COURSE_VIEW','CHECKOUT_STARTED']}},include:{course:{select:{id:true,title:true}}},orderBy:{createdAt:'desc'},take:30}, academyProgress:{select:{courseId:true,percentComplete:true,completedAt:true}} },
    orderBy:{createdAt:'desc'}, take:500,
  });
  return users.map(user=>{
    const enrolledIds=new Set(user.enrollments.map(e=>e.courseId));
    const viewed=new Map<string,{id:string,title:string,lastViewedAt:Date,checkoutStarted:boolean}>();
    user.analyticsEvents.forEach(event=>{if(event.course&&!enrolledIds.has(event.course.id)&&!viewed.has(event.course.id))viewed.set(event.course.id,{id:event.course.id,title:event.course.title,lastViewedAt:event.createdAt,checkoutStarted:event.eventType==='CHECKOUT_STARTED'});else if(event.course&&viewed.has(event.course.id)&&event.eventType==='CHECKOUT_STARTED')viewed.get(event.course.id)!.checkoutStarted=true;});
    const progress=new Map(user.academyProgress.map(p=>[p.courseId,p]));
    return {id:user.id,name:user.name,email:user.email,createdAt:user.createdAt,lastActivityAt:user.analyticsEvents[0]?.createdAt||null,courses:user.enrollments.map(e=>({id:e.course.id,title:e.course.title,purchasedAt:e.purchasedAt,progress:progress.get(e.courseId)?.percentComplete||0,completedAt:progress.get(e.courseId)?.completedAt||null})),interestedCourses:[...viewed.values()],orders:user.orders.map(o=>({id:o.id,course:o.course.title,status:o.status,amount:Number(o.amount),createdAt:o.createdAt}))};
  });
};

export const grantCourse = async (userId: string, courseId: string) => {
  const [user, course] = await Promise.all([
    prisma.academyUser.findUnique({ where:{id:userId}, select:{id:true} }),
    prisma.course.findUnique({ where:{id:courseId}, select:{id:true} }),
  ]);
  if (!user || !course) throw new AppError('Nie znaleziono klienta lub kursu', 404);
  return prisma.academyEnrollment.upsert({ where:{userId_courseId:{userId,courseId}}, update:{}, create:{userId,courseId} });
};

export const revokeCourse = async (userId: string, courseId: string) => {
  await prisma.academyEnrollment.deleteMany({ where:{userId,courseId} });
};
