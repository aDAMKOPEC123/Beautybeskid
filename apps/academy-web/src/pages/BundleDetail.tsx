import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { academyApi } from '@/api/academy.api';
import { DocumentTitle } from '@/components/DocumentTitle';
import { useCartStore } from '@/store/cart.store';

export function BundleDetail() {
  const addToCart=useCartStore(state=>state.add);
  const { slug = '' } = useParams();
  const { data: bundle, isLoading } = useQuery({ queryKey: ['academy', 'bundle', slug], queryFn: () => academyApi.getPublicBundleBySlug(slug), enabled: Boolean(slug) });
  if (isLoading) return <p>Ładowanie pakietu…</p>;
  if (!bundle) return <p>Nie znaleziono pakietu.</p>;
  const promoted = Number(bundle.compareAtPrice) > Number(bundle.price);
  return <article className="academy-bundle-page">
    <DocumentTitle title={`${bundle.title} | Akademia BeskidStudio`} /><Helmet>
      <meta name="description" content={String(bundle.description).slice(0, 155)} />
      <link rel="canonical" href={`https://akademia.kosmetologwiktoriacwik.pl/pakiet/${slug}`} />
      <meta property="og:title" content={bundle.title} />
      <meta property="og:description" content={String(bundle.description).slice(0, 200)} />
      {bundle.thumbnailUrl && <meta property="og:image" content={bundle.thumbnailUrl} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={bundle.title} />
      <meta name="twitter:description" content={String(bundle.description).slice(0, 200)} />
      {bundle.thumbnailUrl && <meta name="twitter:image" content={bundle.thumbnailUrl} />}
      <script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: bundle.title, description: bundle.description, image: bundle.thumbnailUrl || undefined, offers: { '@type': 'Offer', price: Number(bundle.price).toFixed(2), priceCurrency: 'PLN', availability: 'https://schema.org/InStock' } })}</script>
    </Helmet>
    <header>{bundle.thumbnailUrl && <img src={bundle.thumbnailUrl} alt={bundle.title} />}<div><p className="academy-kicker">Pakiet kursów</p><h1>{bundle.title}</h1><p>{bundle.description}</p><strong>{Number(bundle.price).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</strong>{promoted && <><del>{Number(bundle.compareAtPrice).toLocaleString('pl-PL')} zł</del><small>Najniższa cena z 30 dni przed obniżką: {Number(bundle.lowestPrice30Days).toLocaleString('pl-PL')} zł</small></>}<Link className="academy-button academy-buy" to={`/zamowienie/pakiet/${bundle.slug}`}>Kup teraz</Link><button className="academy-button academy-add-cart" onClick={()=>addToCart({id:bundle.id,type:'bundle',title:bundle.title,slug:bundle.slug,price:Number(bundle.price),thumbnailUrl:bundle.thumbnailUrl})}>Dodaj do koszyka</button><small>{bundle.accessDays ? `Dostęp przez ${bundle.accessDays} dni` : 'Dostęp bez ograniczenia czasowego'}.</small></div></header>
    <section><h2>W pakiecie otrzymujesz</h2>{bundle.courses.map((item: any) => <Link key={item.courseId} to={`/kurs/${item.course.slug}`}><span>{String(item.order + 1).padStart(2, '0')}</span><div><strong>{item.course.title}</strong><p>Cena osobno: {Number(item.course.price).toLocaleString('pl-PL')} zł</p></div></Link>)}</section>
  </article>;
}
