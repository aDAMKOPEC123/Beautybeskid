import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, LockKeyhole, ReceiptText } from 'lucide-react';
import { academyApi } from '@/api/academy.api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { DocumentTitle } from '@/components/DocumentTitle';

export function CheckoutPage({ type = 'course' }: { type?: 'course' | 'bundle' }) {
  const { slug = '' } = useParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [form, setForm] = useState({ billingName: user?.name || '', billingAddress: '', billingPostalCode: '', billingCity: '', billingCountry: 'PL', billingTaxId: '', isBusiness: false, invoiceRequested: false, termsAccepted: false, immediateDeliveryConsent: false, withdrawalAcknowledged: false });
  const [error, setError] = useState(''); const [sending, setSending] = useState(false);
  const [discountCode,setDiscountCode]=useState(''); const [discount,setDiscount]=useState<any>(null); const [checkingCode,setCheckingCode]=useState(false);
  const productQuery = useQuery({ queryKey: ['academy', 'checkout-product', type, slug], queryFn: () => type === 'course' ? academyApi.getPublicCourseBySlug(slug) : academyApi.getPublicBundleBySlug(slug), enabled: Boolean(slug) });
  const commerceQuery = useQuery({ queryKey: ['academy', 'commerce-info'], queryFn: academyApi.getCommerceInfo });
  if (!authLoading && !isAuthenticated) return <Navigate to="/logowanie" state={{ from: `/zamowienie/${type === 'course' ? 'kurs' : 'pakiet'}/${slug}` }} replace />;
  if (productQuery.isLoading || commerceQuery.isLoading || authLoading) return <div className="academy-checkout-status">Przygotowujemy bezpieczne podsumowanie…</div>;
  const product = productQuery.data; const commerce = commerceQuery.data;
  if (!product || !commerce) return <div className="academy-checkout-status"><h1>Nie udało się przygotować zamówienia</h1><Link to="/">Wróć do katalogu</Link></div>;
  const ready = commerce.readiness.sellerComplete && commerce.readiness.legalDocumentsComplete && commerce.readiness.stripeConfigured && Number(product.price) > 0 && !product.isComingSoon;
  const set = (name: string, value: string | boolean) => setForm(current => ({...current,[name]:value}));
  const checkCode=async()=>{setCheckingCode(true);try{setDiscount(await academyApi.previewDiscountCode({code:discountCode,courseId:type==='course'?product.id:undefined,bundleId:type==='bundle'?product.id:undefined,price:Number(product.price)}));toast.success('Kod został naliczony');}catch(e:any){setDiscount(null);toast.error(e?.response?.data?.message||'Kod jest nieprawidłowy');}finally{setCheckingCode(false);}};
  const submit=async(event:FormEvent)=>{event.preventDefault();setError('');setSending(true);const input={...form,discountCode:discountCode.trim()||undefined,termsVersion:commerce.documentVersions.TERMS,privacyVersion:commerce.documentVersions.PRIVACY};try{const result=type==='course'?await academyApi.createCheckout(product.id,input):await academyApi.createBundleCheckout(product.id,input);if(!result.checkoutUrl)throw new Error('Brak adresu płatności');window.location.assign(result.checkoutUrl);}catch(err:any){setError(err?.response?.data?.message||'Nie udało się rozpocząć płatności.');setSending(false);}};
  return <div className="academy-checkout-page">
    <DocumentTitle title="Podsumowanie zamówienia | Akademia BeskidStudio"/><Helmet><meta name="robots" content="noindex, nofollow"/></Helmet>
    <header><p className="academy-kicker">Bezpieczne zamówienie</p><h1>Sprawdź dane przed zakupem</h1><p>Umowę zawierasz z {commerce.seller.legalName}. Płatność nastąpi dopiero po kliknięciu „Kupuję i płacę”.</p></header>
    {!commerce.readiness.sellerComplete&&<Warning title="Sprzedaż jeszcze nieaktywna">Administrator musi uzupełnić dane sprzedawcy.</Warning>}
    {!commerce.readiness.stripeConfigured&&<Warning title="Płatności są jeszcze wyłączone">Operator płatności nie został skonfigurowany.</Warning>}
    {!user?.emailVerified&&<div className="academy-readiness-warning"><strong>Potwierdź adres e-mail</strong><p>Potwierdzenie jest potrzebne do zakupu.</p><button type="button" onClick={()=>academyApi.resendVerification().then(()=>toast.success('Wysłaliśmy nowy link'))}>Wyślij link ponownie</button></div>}
    <form onSubmit={submit}>
      <section className="academy-checkout-form"><h2>Dane kupującego</h2><label><span>Imię i nazwisko lub nazwa firmy</span><input required value={form.billingName} onChange={e=>set('billingName',e.target.value)}/></label><label className="academy-check"><input type="checkbox" checked={form.isBusiness} onChange={e=>set('isBusiness',e.target.checked)}/><span>Kupuję jako firma</span></label>{form.isBusiness&&<div className="academy-billing-grid"><label><span>NIP</span><input required value={form.billingTaxId} onChange={e=>set('billingTaxId',e.target.value)}/></label><label><span>Ulica i numer</span><input required value={form.billingAddress} onChange={e=>set('billingAddress',e.target.value)}/></label><label><span>Kod pocztowy</span><input required value={form.billingPostalCode} onChange={e=>set('billingPostalCode',e.target.value)}/></label><label><span>Miejscowość</span><input required value={form.billingCity} onChange={e=>set('billingCity',e.target.value)}/></label></div>}<label className="academy-check"><input type="checkbox" checked={form.invoiceRequested} onChange={e=>set('invoiceRequested',e.target.checked)}/><span>Chcę otrzymać fakturę</span></label></section>
      <aside className="academy-order-summary"><ReceiptText/><h2>{product.title}</h2>{type==='bundle'&&<ul>{product.courses?.map((item:any)=><li key={item.courseId}>{item.course.title}</li>)}</ul>}<p>{product.description}</p><dl><div><dt>Dostęp</dt><dd>{product.accessDays?`${product.accessDays} dni`:'bezterminowy'}</dd></div><div><dt>Kwota brutto</dt><dd>{Number(discount?.price??product.price).toLocaleString('pl-PL',{style:'currency',currency:'PLN'})}</dd></div></dl>
        <div className="academy-discount-box"><label><span>Kod rabatowy</span><input value={discountCode} onChange={e=>{setDiscountCode(e.target.value.toUpperCase());setDiscount(null);}} placeholder="TWÓJ KOD"/></label><button type="button" disabled={!discountCode.trim()||checkingCode} onClick={checkCode}>Zastosuj</button></div>{discount&&<p className="academy-promo-note"><strong>{discount.label}</strong> · oszczędzasz {Number(discount.discountAmount).toLocaleString('pl-PL')} zł</p>}
        {Number(product.compareAtPrice)>Number(product.price)&&<p className="academy-promo-note">Cena przed obniżką: <del>{Number(product.compareAtPrice).toLocaleString('pl-PL')} zł</del>{product.lowestPrice30Days&&<> · Najniższa cena z 30 dni: {Number(product.lowestPrice30Days).toLocaleString('pl-PL')} zł</>}</p>}
        <div className="academy-consents"><Consent checked={form.termsAccepted} onChange={v=>set('termsAccepted',v)}>Akceptuję <Link target="_blank" to="/regulamin">Regulamin</Link> i <Link target="_blank" to="/polityka-prywatnosci">Politykę prywatności</Link>.</Consent><Consent checked={form.immediateDeliveryConsent} onChange={v=>set('immediateDeliveryConsent',v)}>Żądam dostarczenia treści cyfrowej niezwłocznie po zapłacie.</Consent><Consent checked={form.withdrawalAcknowledged} onChange={v=>set('withdrawalAcknowledged',v)}>Przyjmuję do wiadomości utratę prawa odstąpienia po rozpoczęciu dostarczania treści.</Consent></div>
        {error&&<p className="academy-auth-error">{error}</p>}<button className="academy-pay-button" disabled={!ready||!user?.emailVerified||sending}><LockKeyhole/>{sending?'Przekierowujemy…':'Kupuję i płacę'}</button><small><CheckCircle2/>Po płatności dostęp pojawi się automatycznie.</small>
      </aside>
    </form><footer><strong>Sprzedawca</strong><p>{commerce.seller.legalName}{commerce.seller.taxId?` · NIP ${commerce.seller.taxId}`:''}</p><p>{commerce.seller.address} · {commerce.seller.email} · {commerce.seller.phone}</p></footer>
  </div>;
}
function Warning({title,children}:{title:string;children:React.ReactNode}){return <div className="academy-readiness-warning"><strong>{title}</strong><p>{children}</p></div>}
function Consent({checked,onChange,children}:{checked:boolean;onChange:(value:boolean)=>void;children:React.ReactNode}){return <label className="academy-check"><input required type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><span>{children}</span></label>}
