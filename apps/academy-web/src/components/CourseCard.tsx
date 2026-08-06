import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, GraduationCap, Heart, PlayCircle, Stethoscope } from 'lucide-react';
import { academyApi } from '@/api/academy.api';
import { useCartStore } from '@/store/cart.store';

/** Wspólna karta kursu — używana przez hub, landingi person i pełny katalog. */

export const difficultyLabel: Record<string, string> = {
  BEGINNER: 'Podstawowy',
  INTERMEDIATE: 'Średniozaawansowany',
  ADVANCED: 'Zaawansowany',
};

export function formatPrice(value: unknown, isFree = false, isComingSoon = false) {
  if (isComingSoon) return 'Wkrótce';
  if (isFree) return 'Bezpłatny';
  const price = Number(value || 0);
  return price > 0 ? new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(price) : 'Cena wkrótce';
}

export function WaitlistMini({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  if (sent) return <p className="academy-waitlist-success">Powiadomimy Cię o premierze.</p>;
  if (!open) return <button className="academy-waitlist-button" onClick={() => setOpen(true)}>Powiadom mnie o premierze</button>;
  return <form className="academy-waitlist-mini" onSubmit={async e => { e.preventDefault(); await academyApi.subscribeLead({ email, type: 'WAITLIST', courseId, source: 'course-card', consent: true }); setSent(true); }}>
    <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Twój e-mail" />
    <button>Zapisz mnie</button>
  </form>;
}

export function CourseCard({ course, featured, favorite, canFavorite, onToggleFavorite }: { course: any; featured?: boolean; favorite?: boolean; canFavorite?: boolean; onToggleFavorite?: () => void }) {
  const progress = course.progress?.percentComplete;
  const addToCart = useCartStore(state => state.add);
  return <article className={`academy-course-card ${featured ? 'featured' : ''}`}>
    {canFavorite && onToggleFavorite && <button className="academy-favorite-button" aria-label={favorite ? 'Usuń z zapisanych' : 'Zapisz kurs'} aria-pressed={favorite} onClick={onToggleFavorite}><Heart className={favorite ? 'fill-current' : ''} /></button>}
    <Link to={`/kurs/${course.slug}`} className="block">
      <div className="academy-course-cover">
        {course.thumbnailUrl ? <img src={course.thumbnailUrl} alt={course.title} loading="lazy" width="1280" height="720" /> : <div className="academy-course-placeholder"><GraduationCap /></div>}
        <span>{difficultyLabel[course.difficulty] ?? course.difficulty}</span>
        {course.isComingSoon ? <em>W przygotowaniu</em> : course.isBestseller ? <em>Bestseller</em> : featured && <em>Wyróżniony</em>}
        {progress !== undefined && <div className="academy-cover-progress"><div style={{ width: `${progress}%` }} /></div>}
      </div>
      <div className="academy-course-body">
        <div className="academy-course-meta">
          {course.estimatedMinutes > 0 ? <span><Clock3 />{course.estimatedMinutes} min</span> : <span><Clock3 />Program w przygotowaniu</span>}
          {course.lessonCount > 0 && <span><PlayCircle />{course.lessonCount} lekcji</span>}
          {(course._count?.diagnosticCaseStudies ?? 0) > 0 && <span><Stethoscope />{course._count.diagnosticCaseStudies} case {course._count.diagnosticCaseStudies === 1 ? 'study' : 'studies'}</span>}
        </div>
        <h3>{course.title}</h3>
        <p>{course.description || 'Starannie przygotowany kurs dla specjalistek beauty.'}</p>
        {!course.isEnrolled && <>
          <div className="academy-price-line">
            <strong className="academy-course-price">{formatPrice(course.price, course.isFree, course.isComingSoon)}</strong>
            {Number(course.compareAtPrice) > Number(course.price) && <>
              <del>{formatPrice(course.compareAtPrice)}</del>
              <b>-{Math.round((1 - Number(course.price) / Number(course.compareAtPrice)) * 100)}%</b>
            </>}
          </div>
          {Number(course.compareAtPrice) > Number(course.price) && <small className="academy-card-lowest">Najniższa cena z 30 dni: {Number(course.lowestPrice30Days).toLocaleString('pl-PL')} zł</small>}
        </>}
        <div className="academy-card-footer">
          {course.isEnrolled
            ? <span>{progress !== undefined ? `${Math.round(progress)}% ukończono` : 'Przejdź do kursu'}</span>
            : <span>{course.isComingSoon ? 'Zobacz zapowiedź' : 'Zobacz program'}</span>}
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
    {course.isComingSoon && <WaitlistMini courseId={course.id} />}
    {!course.isComingSoon && !course.isFree && !course.isEnrolled && <button className="academy-add-cart" onClick={() => addToCart({ id: course.id, type: 'course', title: course.title, slug: course.slug, price: Number(course.price), thumbnailUrl: course.thumbnailUrl })}>Dodaj do koszyka</button>}
  </article>;
}
