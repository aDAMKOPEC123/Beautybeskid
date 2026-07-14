import { api } from './axios';

const id = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const getId = (storage: Storage, key: string) => { let value=storage.getItem(key); if(!value){value=id();storage.setItem(key,value);} return value; };

export const trackAcademyEvent = (eventType:string, data:Record<string,unknown>={}) => {
  try {
    if (localStorage.getItem('academy_cookie_consent') !== 'analytics') return;
    const params=new URLSearchParams(location.search);
    const payload={ eventType, visitorId:getId(localStorage,'academy_visitor_id'), sessionId:getId(sessionStorage,'academy_session_id'), path:location.pathname, referrer:document.referrer||undefined, source:params.get('utm_source')||sessionStorage.getItem('academy_utm_source')||undefined, medium:params.get('utm_medium')||sessionStorage.getItem('academy_utm_medium')||undefined, campaign:params.get('utm_campaign')||sessionStorage.getItem('academy_utm_campaign')||undefined, ...data };
    if(params.get('utm_source')) sessionStorage.setItem('academy_utm_source',params.get('utm_source')!);
    if(params.get('utm_medium')) sessionStorage.setItem('academy_utm_medium',params.get('utm_medium')!);
    if(params.get('utm_campaign')) sessionStorage.setItem('academy_utm_campaign',params.get('utm_campaign')!);
    void api.post('/academy/analytics/events',payload).catch(()=>undefined);
  } catch { /* Analytics never blocks the storefront. */ }
};
