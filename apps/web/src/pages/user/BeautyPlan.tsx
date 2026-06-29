import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { beautyPlanApi, type BeautyPlan as BeautyPlanType, type PlanSection } from '@/api/beauty-plan.api';
import { CalendarDays, ExternalLink, Flower2, ChevronDown, ChevronUp, ArrowRight, MessageCircle } from 'lucide-react';
import { AnimatedCollapse } from '@/components/ui/AnimatedCollapse';

// ─── Animations (injected once) ───────────────────────────────────────────────

const STYLES = `
@keyframes bp-fade-up {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes bp-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes bp-line-grow {
  from { transform: scaleY(0); }
  to   { transform: scaleY(1); }
}
.bp-fade-up   { animation: bp-fade-up  0.55s cubic-bezier(.22,1,.36,1) both; }
.bp-fade-in   { animation: bp-fade-in  0.4s ease both; }
.bp-line-grow { animation: bp-line-grow 0.7s cubic-bezier(.22,1,.36,1) both; transform-origin: top; }
`;

function InjectStyles() {
  return <style>{STYLES}</style>;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
      <InjectStyles />

      {/* Soft atmospheric background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(196,150,90,0.07) 0%, transparent 70%)',
          }}
        />
        {/* Decorative arcs */}
        <svg
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
          width="340" height="340" viewBox="0 0 340 340" fill="none"
        >
          <circle cx="170" cy="170" r="160" stroke="#C4965A" strokeWidth="1" />
          <circle cx="170" cy="170" r="120" stroke="#C4965A" strokeWidth="1" />
          <circle cx="170" cy="170" r="80"  stroke="#C4965A" strokeWidth="1" />
        </svg>
      </div>

      {/* Icon */}
      <div
        className="bp-fade-in relative mb-7 w-[72px] h-[72px] rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(196,150,90,0.18) 0%, rgba(196,150,90,0.06) 100%)',
          border: '1.5px solid rgba(196,150,90,0.25)',
          animationDelay: '0.1s',
        }}
      >
        <Flower2 size={30} style={{ color: '#C4965A' }} />
      </div>

      <h1
        className="bp-fade-up font-heading font-bold mb-4 leading-tight"
        style={{ fontSize: 'clamp(1.75rem, 5vw, 2.25rem)', animationDelay: '0.15s', color: 'var(--foreground)' }}
      >
        Twój Beauty Plan
      </h1>

      <p
        className="bp-fade-up text-muted-foreground leading-relaxed mb-3 max-w-[300px]"
        style={{ fontSize: 15, animationDelay: '0.22s' }}
      >
        Spersonalizowany plan pielęgnacji opracowany przez Twojego kosmetologa — dobrany do Twojej
        skóry, trybu życia i celów.
      </p>

      <div
        className="bp-fade-in my-5 w-10 h-px"
        style={{ background: 'rgba(196,150,90,0.4)', animationDelay: '0.3s' }}
      />

      <p
        className="bp-fade-up text-muted-foreground mb-7 max-w-[260px]"
        style={{ fontSize: 14, animationDelay: '0.35s' }}
      >
        Aby otrzymać plan, umów się na{' '}
        <span className="font-semibold" style={{ color: '#C4965A' }}>
          konsultację kosmetologiczną
        </span>
        .
      </p>

      <Link
        to="/rezerwacja"
        className="bp-fade-up inline-flex items-center gap-2.5 rounded-full font-semibold transition-all duration-200 active:scale-[0.97]"
        style={{
          animationDelay: '0.42s',
          padding: '14px 28px',
          fontSize: 14,
          background: 'linear-gradient(135deg, #C4965A 0%, #a8793d 100%)',
          color: '#fff',
          boxShadow: '0 6px 24px rgba(196,150,90,0.35)',
        }}
      >
        <CalendarDays size={15} />
        Umów konsultację
      </Link>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  section,
  index,
  total,
}: {
  section: PlanSection;
  index: number;
  total: number;
}) {
  const [open, setOpen] = useState(true);
  const hasImage = !!section.imageUrl;
  const hasLinks = (section.externalLinks?.length ?? 0) > 0;

  return (
    <article
      className="bp-fade-up relative"
      style={{ animationDelay: `${0.1 + index * 0.08}s` }}
    >
      {/* Timeline connector (not on last) */}
      {index < total - 1 && (
        <div
          className="absolute left-[19px] top-[40px] w-px bp-line-grow"
          style={{
            height: 'calc(100% + 20px)',
            background: 'linear-gradient(to bottom, rgba(196,150,90,0.35) 0%, rgba(196,150,90,0.05) 100%)',
            animationDelay: `${0.25 + index * 0.08}s`,
          }}
          aria-hidden
        />
      )}

      <div className="flex gap-4">
        {/* Step bubble */}
        <div className="relative flex flex-col items-center shrink-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 z-10"
            style={{
              background: 'linear-gradient(135deg, #C4965A 0%, #a8793d 100%)',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(196,150,90,0.3)',
            }}
          >
            {index + 1}
          </div>
        </div>

        {/* Card content */}
        <div
          className="flex-1 rounded-2xl overflow-hidden mb-5"
          style={{
            background: 'var(--card)',
            border: '1px solid rgba(196,150,90,0.13)',
            boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
          }}
        >
          {/* Image — full width */}
          {hasImage && (
            <div className="relative overflow-hidden" style={{ height: 200 }}>
              <img
                src={section.imageUrl}
                alt={section.title}
                className="w-full h-full object-cover"
                style={{ transition: 'transform 0.6s ease' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1)')}
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 55%)' }}
              />
              <div className="absolute bottom-0 left-0 p-4">
                <p
                  className="font-heading font-bold text-white leading-snug"
                  style={{ fontSize: 17, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
                >
                  {section.title}
                </p>
              </div>
            </div>
          )}

          {/* Header (when no image) */}
          {!hasImage && (
            <button
              className="w-full flex items-center justify-between gap-3 text-left"
              style={{ padding: '16px 18px' }}
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
            >
              <h3
                className="font-heading font-bold leading-snug flex-1"
                style={{ fontSize: 16, color: 'var(--foreground)' }}
              >
                {section.title}
              </h3>
              <span className="shrink-0 text-muted-foreground transition-transform duration-200" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            </button>
          )}

          {/* Body */}
          <AnimatedCollapse
            open={open || hasImage}
            innerStyle={{ padding: hasImage ? '0 18px 18px' : '0 18px 18px' }}
          >
              {hasImage && section.title && open === false ? null : null}

              {section.content && (
                <p
                  className="text-muted-foreground leading-relaxed whitespace-pre-wrap"
                  style={{ fontSize: 15, marginTop: hasImage ? 12 : 0, lineHeight: 1.7 }}
                >
                  {section.content}
                </p>
              )}

              {hasLinks && (
                <div
                  className="flex flex-col gap-2"
                  style={{ marginTop: 14 }}
                >
                  <p
                    className="font-semibold uppercase tracking-widest"
                    style={{ fontSize: 10, color: '#C4965A', marginBottom: 2 }}
                  >
                    Polecane
                  </p>
                  {section.externalLinks!.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl group transition-all active:scale-[0.98]"
                      style={{
                        padding: '11px 14px',
                        background: 'rgba(196,150,90,0.06)',
                        border: '1px solid rgba(196,150,90,0.15)',
                        fontSize: 14,
                      }}
                    >
                      <ExternalLink size={13} style={{ color: '#C4965A', flexShrink: 0 }} />
                      <span className="flex-1 font-medium truncate" style={{ color: 'var(--foreground)' }}>
                        {link.label}
                      </span>
                      <ArrowRight
                        size={13}
                        className="shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
                        style={{ color: '#C4965A' }}
                      />
                    </a>
                  ))}
                </div>
              )}
          </AnimatedCollapse>
        </div>
      </div>
    </article>
  );
}

// ─── Plan view ────────────────────────────────────────────────────────────────

function PlanView({ plan }: { plan: BeautyPlanType }) {
  const sections = (plan.sections ?? []) as PlanSection[];
  const generalLinks = (plan.externalLinks ?? []) as Array<{ label: string; url: string }>;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="pb-10">
      <InjectStyles />

      {/* ── Header ── */}
      <div
        className="bp-fade-up rounded-2xl overflow-hidden mb-8 relative"
        style={{
          background: 'linear-gradient(145deg, rgba(196,150,90,0.13) 0%, rgba(196,150,90,0.04) 100%)',
          border: '1px solid rgba(196,150,90,0.18)',
          animationDelay: '0.05s',
        }}
      >
        {/* Decorative glow */}
        <div
          className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at top right, rgba(196,150,90,0.18) 0%, transparent 70%)',
          }}
          aria-hidden
        />

        <div style={{ padding: '22px 22px 0' }}>
          <p
            className="font-bold uppercase tracking-[0.2em] mb-2"
            style={{ fontSize: 10, color: '#C4965A' }}
          >
            Twój Indywidualny Beauty Plan
          </p>
          <h1
            className="font-heading font-bold leading-tight"
            style={{ fontSize: 'clamp(1.25rem, 4vw, 1.6rem)', color: 'var(--foreground)' }}
          >
            {plan.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3" style={{ fontSize: 12 }}>
            <span className="text-muted-foreground">
              {formatDate(plan.createdAt)}
            </span>
            {plan.createdBy && (
              <>
                <span className="opacity-30">·</span>
                <span style={{ color: '#C4965A' }} className="font-medium">
                  {plan.createdBy.name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Intro */}
        {plan.intro && (
          <div
            style={{
              margin: '16px 22px 0',
              paddingTop: 16,
              paddingBottom: 22,
              borderTop: '1px solid rgba(196,150,90,0.14)',
              fontSize: 14.5,
              lineHeight: 1.75,
              color: 'var(--muted-foreground)',
            }}
          >
            {plan.intro}
          </div>
        )}

        {!plan.intro && <div style={{ paddingBottom: 22 }} />}
      </div>

      {/* ── Progress pill ── */}
      {sections.length > 0 && (
        <div
          className="bp-fade-in flex items-center gap-2 mb-6"
          style={{ animationDelay: '0.2s' }}
        >
          <div
            className="flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{
              background: 'rgba(196,150,90,0.09)',
              border: '1px solid rgba(196,150,90,0.2)',
            }}
          >
            <Flower2 size={12} style={{ color: '#C4965A' }} />
            <span
              className="font-semibold uppercase tracking-[0.15em]"
              style={{ fontSize: 10, color: '#C4965A' }}
            >
              {sections.length} {sections.length === 1 ? 'zalecenie' : sections.length < 5 ? 'zalecenia' : 'zaleceń'}
            </span>
          </div>
        </div>
      )}

      {/* ── Sections ── */}
      {sections.length > 0 && (
        <div>
          {sections.map((section, i) => (
            <SectionCard key={section.id} section={section} index={i} total={sections.length} />
          ))}
        </div>
      )}

      {/* ── General links ── */}
      {generalLinks.length > 0 && (
        <div
          className="bp-fade-up rounded-2xl mt-2 mb-6"
          style={{
            background: 'var(--card)',
            border: '1px solid rgba(196,150,90,0.13)',
            padding: '18px 18px',
            animationDelay: `${0.1 + sections.length * 0.08}s`,
          }}
        >
          <p
            className="font-bold uppercase tracking-[0.18em] mb-3"
            style={{ fontSize: 10, color: '#C4965A' }}
          >
            Polecane zasoby
          </p>
          <div className="flex flex-col gap-2">
            {generalLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl group transition-all active:scale-[0.98]"
                style={{
                  padding: '12px 14px',
                  background: 'rgba(196,150,90,0.05)',
                  border: '1px solid rgba(196,150,90,0.12)',
                  fontSize: 14,
                }}
              >
                <ExternalLink size={14} style={{ color: '#C4965A', flexShrink: 0 }} />
                <span className="flex-1 font-medium" style={{ color: 'var(--foreground)' }}>
                  {link.label}
                </span>
                <ArrowRight size={14} className="opacity-0 group-hover:opacity-50 transition-opacity shrink-0" style={{ color: '#C4965A' }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── CTA ── */}
      <div
        className="bp-fade-up rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(196,150,90,0.1) 0%, rgba(196,150,90,0.04) 100%)',
          border: '1px dashed rgba(196,150,90,0.28)',
          padding: '20px 20px',
          animationDelay: `${0.15 + sections.length * 0.08}s`,
        }}
      >
        <p
          className="font-heading font-bold mb-1 leading-snug"
          style={{ fontSize: 16, color: 'var(--foreground)' }}
        >
          Masz pytania do planu?
        </p>
        <p className="text-muted-foreground mb-4" style={{ fontSize: 13.5 }}>
          Umów wizytę kontrolną lub napisz do nas — kosmetolog omówi postępy i dostosuje plan.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/rezerwacja"
            className="inline-flex items-center gap-2 rounded-full font-semibold transition-all active:scale-[0.97]"
            style={{
              padding: '12px 22px',
              fontSize: 13.5,
              background: 'linear-gradient(135deg, #C4965A 0%, #a8793d 100%)',
              color: '#fff',
              boxShadow: '0 4px 18px rgba(196,150,90,0.3)',
            }}
          >
            <CalendarDays size={14} />
            Umów wizytę
          </Link>
          <Link
            to="/user/chat"
            className="inline-flex items-center gap-2 rounded-full font-semibold transition-all active:scale-[0.97]"
            style={{
              padding: '12px 22px',
              fontSize: 13.5,
              background: 'var(--card)',
              color: '#C4965A',
              border: '1.5px solid rgba(196,150,90,0.35)',
            }}
          >
            <MessageCircle size={14} />
            Napisz do nas
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse pb-10">
      <div className="h-36 rounded-2xl bg-muted" />
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
        <div className="flex-1 h-40 rounded-2xl bg-muted" />
      </div>
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
        <div className="flex-1 h-52 rounded-2xl bg-muted" />
      </div>
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
        <div className="flex-1 h-32 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function UserBeautyPlan() {
  const { data: plan, isLoading } = useQuery<BeautyPlanType | null>({
    queryKey: ['beauty-plan', 'my'],
    queryFn: beautyPlanApi.getMy,
  });

  if (isLoading) return <Skeleton />;
  if (!plan) return <EmptyState />;
  return <PlanView plan={plan} />;
}
