import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LockKeyhole, ShoppingCart, Trash2 } from 'lucide-react';
import { academyApi } from '@/api/academy.api';
import { useCartStore } from '@/store/cart.store';
import { useAuth } from '@/hooks/useAuth';

export function AcademyCart() {
  const { items, remove, clear } = useCartStore();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const commerce = useQuery({ queryKey: ['academy', 'commerce-info'], queryFn: academyApi.getCommerceInfo });
  const [form, setForm] = useState({
    billingName: user?.name || '',
    termsAccepted: false,
    immediateDeliveryConsent: false,
    withdrawalAcknowledged: false,
    invoiceRequested: false,
    isBusiness: false,
    discountCode: '',
  });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const total = items.reduce((sum, item) => sum + item.price, 0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) {
      navigate('/logowanie', { state: { from: '/koszyk' } });
      return;
    }
    if (!commerce.data) return;
    setSending(true);
    setError('');
    try {
      const result = await academyApi.createCartCheckout({
        ...form,
        items: items.map(({ id, type }) => ({ id, type })),
        termsVersion: commerce.data.documentVersions.TERMS,
        privacyVersion: commerce.data.documentVersions.PRIVACY,
      });
      clear();
      window.location.assign(result.checkoutUrl);
    } catch (caught: any) {
      setError(caught?.response?.data?.message || 'Nie udało się rozpocząć płatności');
      setSending(false);
    }
  };

  if (!items.length) return (
    <div className="academy-profile-empty">
      <ShoppingCart />
      <h1>Koszyk jest pusty</h1>
      <p>Dodaj kursy lub pakiet, które chcesz kupić razem.</p>
      <Link to="/">Zobacz ofertę</Link>
    </div>
  );

  return (
    <div className="academy-checkout-page">
      <header><p className="academy-kicker">Koszyk Akademii</p><h1>Twoje kursy</h1></header>
      <form onSubmit={submit}>
        <section className="academy-checkout-form">
          <h2>Produkty</h2>
          {items.map((item) => (
            <article className="academy-cart-row" key={`${item.type}-${item.id}`}>
              {item.thumbnailUrl && <img src={item.thumbnailUrl} alt="" />}
              <div><strong>{item.title}</strong><small>{item.type === 'course' ? 'Kurs' : 'Pakiet'}</small></div>
              <b>{item.price.toLocaleString('pl-PL')} zł</b>
              <button type="button" onClick={() => remove(item.type, item.id)} aria-label={`Usuń ${item.title} z koszyka`}><Trash2 /></button>
            </article>
          ))}
          <label><span>Imię i nazwisko / firma</span><input required value={form.billingName} onChange={(event) => setForm({ ...form, billingName: event.target.value })} /></label>
          <label><span>Kod rabatowy</span><input value={form.discountCode} onChange={(event) => setForm({ ...form, discountCode: event.target.value.toUpperCase() })} /></label>
        </section>
        <aside className="academy-order-summary">
          <ShoppingCart />
          <h2>Razem</h2>
          <strong className="text-2xl">{total.toLocaleString('pl-PL')} zł</strong>
          <label className="academy-check"><input required type="checkbox" checked={form.termsAccepted} onChange={(event) => setForm({ ...form, termsAccepted: event.target.checked })} /><span>Akceptuję regulamin i politykę prywatności.</span></label>
          <label className="academy-check"><input required type="checkbox" checked={form.immediateDeliveryConsent} onChange={(event) => setForm({ ...form, immediateDeliveryConsent: event.target.checked })} /><span>Żądam natychmiastowego dostarczenia treści cyfrowej.</span></label>
          <label className="academy-check"><input required type="checkbox" checked={form.withdrawalAcknowledged} onChange={(event) => setForm({ ...form, withdrawalAcknowledged: event.target.checked })} /><span>Przyjmuję utratę prawa odstąpienia po rozpoczęciu dostarczania treści.</span></label>
          {error && <p className="academy-auth-error">{error}</p>}
          <button className="academy-pay-button" disabled={!commerce.data || sending}><LockKeyhole />{sending ? 'Przekierowujemy…' : isAuthenticated ? 'Kupuję i płacę' : 'Zaloguj się i kontynuuj'}</button>
        </aside>
      </form>
    </div>
  );
}
