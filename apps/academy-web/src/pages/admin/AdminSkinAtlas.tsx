import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { academyApi } from '@/api/academy.api';
import { AdminHelp } from '@/components/AdminHelp';

// ── Types ──────────────────────────────────────────────────────────────────

interface AtlasRegion {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl?: string;
  hotspotX: number;
  hotspotY: number;
  order: number;
  published: boolean;
  parentId?: string | null;
  parent?: { id: string; name: string } | null;
  _count: { conditions: number; children: number };
}

interface AtlasCondition {
  id: string;
  name: string;
  slug: string;
  description?: string;
  causes?: string;
  treatments?: string;
  contraindications?: string;
  order: number;
  published: boolean;
  regionId: string;
  region?: { name: string };
  relatedCourseId?: string;
  images?: AtlasImage[];
  quizQuestions?: AtlasQuizQuestion[];
}

interface AtlasImage {
  id: string;
  url: string;
  severity?: string;
}

interface AtlasQuizQuestion {
  id: string;
  questionText: string;
  explanation?: string;
  answers?: { id: string; text: string; isCorrect: boolean }[];
}

interface Course {
  id: string;
  title: string;
  slug: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={wide ? 'wide' : ''}>
      <span>{label}</span>
      {children}
    </label>
  );
}

// ── Empty form state ───────────────────────────────────────────────────────

const emptyRegion = {
  name: '',
  slug: '',
  parentId: '',
  hotspotX: 50,
  hotspotY: 50,
  order: 0,
  published: false,
};

const emptyCondition = {
  regionId: '',
  name: '',
  slug: '',
  description: '',
  causes: '',
  treatments: '',
  contraindications: '',
  relatedCourseId: '',
  order: 0,
  published: false,
};

const emptyQuestion = {
  questionText: '',
  explanation: '',
  answers: [
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
};

// ── Regions tab ────────────────────────────────────────────────────────────

function RegionsTab() {
  const client = useQueryClient();
  const { data: regions = [] } = useQuery<AtlasRegion[]>({
    queryKey: ['academy', 'admin', 'atlas', 'regions'],
    queryFn: academyApi.adminGetAtlasRegions,
  });

  const [form, setForm] = useState(emptyRegion);
  const [editingId, setEditingId] = useState('');

  const set = (name: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, hotspotX: Number(form.hotspotX), hotspotY: Number(form.hotspotY), order: Number(form.order), parentId: form.parentId || null };
      return editingId
        ? academyApi.adminUpdateAtlasRegion(editingId, payload)
        : academyApi.adminCreateAtlasRegion(payload);
    },
    onSuccess: () => {
      toast.success('Region zapisany');
      setForm(emptyRegion);
      setEditingId('');
      client.invalidateQueries({ queryKey: ['academy', 'admin', 'atlas', 'regions'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Nie udało się zapisać regionu');
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => academyApi.adminDeleteAtlasRegion(id),
    onSuccess: () => {
      toast.success('Region usunięty');
      client.invalidateQueries({ queryKey: ['academy', 'admin', 'atlas', 'regions'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Nie udało się usunąć regionu');
    },
  });

  function startEdit(region: AtlasRegion) {
    setEditingId(region.id);
    setForm({
      name: region.name,
      slug: region.slug,
      parentId: region.parentId ?? '',
      hotspotX: region.hotspotX,
      hotspotY: region.hotspotY,
      order: region.order,
      published: region.published,
    });
  }

  function cancel() {
    setEditingId('');
    setForm(emptyRegion);
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`Usunąć region "${name}"? Spowoduje to usunięcie wszystkich powiązanych problemów skórnych.`)) return;
    del.mutate(id);
  }

  return (
    <>
      <section>
        <h2>{editingId ? 'Edytuj region' : 'Nowy region'}</h2>
        <form
          className="academy-admin-field-grid"
          onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }}
        >
          <Field label="Nazwa">
            <input
              required
              value={form.name}
              onChange={(e) => {
                set('name', e.target.value);
                if (!editingId) set('slug', slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="Slug">
            <input
              required
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
            />
          </Field>
          <Field label="Region nadrzędny">
            <select
              value={form.parentId}
              onChange={(e) => set('parentId', e.target.value)}
            >
              <option value="">— brak (główny) —</option>
              {(regions as AtlasRegion[])
                .filter((r) => r.id !== editingId)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.parent ? `${r.parent.name} → ` : ''}{r.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Hotspot X (0–100)">
            <input
              type="range"
              min="0"
              max="100"
              value={form.hotspotX}
              onChange={(e) => set('hotspotX', Number(e.target.value))}
            />
            <small>{form.hotspotX}%</small>
          </Field>
          <Field label="Hotspot Y (0–100)">
            <input
              type="range"
              min="0"
              max="100"
              value={form.hotspotY}
              onChange={(e) => set('hotspotY', Number(e.target.value))}
            />
            <small>{form.hotspotY}%</small>
          </Field>
          <Field label="Kolejność">
            <input
              type="number"
              min="0"
              value={form.order}
              onChange={(e) => set('order', Number(e.target.value))}
            />
          </Field>
          <label className="academy-check">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => set('published', e.target.checked)}
            />
            <span>Opublikowany</span>
          </label>
          <button disabled={save.isPending}>{editingId ? 'Zapisz zmiany' : 'Utwórz region'}</button>
          {editingId && (
            <button type="button" onClick={cancel}>
              Anuluj
            </button>
          )}
        </form>
      </section>

      <section>
        <h2>Regiony</h2>
        <div className="academy-admin-card-list">
          {regions.map((region) => (
            <article key={region.id}>
              <div>
                <strong>{region.parent ? `${region.parent.name} → ` : ''}{region.name}</strong>
                <p>
                  {region.slug} · {region._count.conditions} problemów · {region._count.children} podregionów ·{' '}
                  hotspot ({region.hotspotX}%, {region.hotspotY}%) · pozycja{' '}
                  {region.order} · {region.published ? 'opublikowany' : 'szkic'}
                </p>
              </div>
              <button onClick={() => startEdit(region)}>Edytuj</button>
              <button
                onClick={() => handleDelete(region.id, region.name)}
                disabled={del.isPending}
                style={{ marginLeft: 6, color: '#b04739' }}
              >
                Usuń
              </button>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

// ── Conditions tab ─────────────────────────────────────────────────────────

function ConditionsTab() {
  const client = useQueryClient();

  const { data: regions = [] } = useQuery<AtlasRegion[]>({
    queryKey: ['academy', 'admin', 'atlas', 'regions'],
    queryFn: academyApi.adminGetAtlasRegions,
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['academy', 'admin', 'courses'],
    queryFn: academyApi.adminGetCourses,
  });

  const { data: conditions = [] } = useQuery<AtlasCondition[]>({
    queryKey: ['academy', 'admin', 'atlas', 'conditions'],
    queryFn: () =>
      Promise.all(
        (regions as AtlasRegion[]).map((r) =>
          academyApi.adminGetAtlasRegions().then(() =>
            academyApi.getAtlasRegion(r.slug).then((data: { conditions?: AtlasCondition[] }) =>
              (data.conditions ?? []).map((c: AtlasCondition) => ({ ...c, region: { name: r.name } }))
            )
          )
        )
      ).then((arrays) => arrays.flat()),
    enabled: regions.length > 0,
  });

  const [filterRegion, setFilterRegion] = useState('');
  const [form, setForm] = useState(emptyCondition);
  const [editingId, setEditingId] = useState('');
  const [expandedId, setExpandedId] = useState('');

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSeverity, setImageSeverity] = useState('');

  // Quiz question state
  const [qForm, setQForm] = useState(emptyQuestion);

  const set = (name: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        order: Number(form.order),
        relatedCourseId: form.relatedCourseId || null,
      };
      return editingId
        ? academyApi.adminUpdateAtlasCondition(editingId, payload)
        : academyApi.adminCreateAtlasCondition(payload);
    },
    onSuccess: () => {
      toast.success('Problem skórny zapisany');
      setForm(emptyCondition);
      setEditingId('');
      client.invalidateQueries({ queryKey: ['academy', 'admin', 'atlas', 'conditions'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Nie udało się zapisać');
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => academyApi.adminDeleteAtlasCondition(id),
    onSuccess: () => {
      toast.success('Problem skórny usunięty');
      client.invalidateQueries({ queryKey: ['academy', 'admin', 'atlas', 'conditions'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Nie udało się usunąć');
    },
  });

  const uploadImage = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('image', imageFile!);
      fd.append('conditionId', editingId);
      if (imageSeverity) fd.append('severity', imageSeverity);
      return academyApi.adminUploadAtlasImage(fd);
    },
    onSuccess: () => {
      toast.success('Zdjęcie przesłane');
      setImageFile(null);
      setImageSeverity('');
      client.invalidateQueries({ queryKey: ['academy', 'admin', 'atlas', 'conditions'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Błąd przesyłania zdjęcia');
    },
  });

  const deleteImage = useMutation({
    mutationFn: (id: string) => academyApi.adminDeleteAtlasImage(id),
    onSuccess: () => {
      toast.success('Zdjęcie usunięte');
      client.invalidateQueries({ queryKey: ['academy', 'admin', 'atlas', 'conditions'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Nie udało się usunąć zdjęcia');
    },
  });

  const addQuestion = useMutation({
    mutationFn: () =>
      academyApi.adminCreateAtlasQuizQuestion({
        conditionId: editingId,
        questionText: qForm.questionText,
        explanation: qForm.explanation || null,
        answers: qForm.answers.filter((a) => a.text.trim()),
      }),
    onSuccess: () => {
      toast.success('Pytanie dodane');
      setQForm(emptyQuestion);
      client.invalidateQueries({ queryKey: ['academy', 'admin', 'atlas', 'conditions'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Nie udało się dodać pytania');
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: (id: string) => academyApi.adminDeleteAtlasQuizQuestion(id),
    onSuccess: () => {
      toast.success('Pytanie usunięte');
      client.invalidateQueries({ queryKey: ['academy', 'admin', 'atlas', 'conditions'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Nie udało się usunąć pytania');
    },
  });

  function startEdit(condition: AtlasCondition) {
    setEditingId(condition.id);
    setExpandedId(condition.id);
    setForm({
      regionId: condition.regionId,
      name: condition.name,
      slug: condition.slug,
      description: condition.description ?? '',
      causes: condition.causes ?? '',
      treatments: condition.treatments ?? '',
      contraindications: condition.contraindications ?? '',
      relatedCourseId: condition.relatedCourseId ?? '',
      order: condition.order,
      published: condition.published,
    });
  }

  function cancel() {
    setEditingId('');
    setForm(emptyCondition);
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`Usunąć problem skórny "${name}"?`)) return;
    del.mutate(id);
  }

  const filtered = filterRegion
    ? (conditions as AtlasCondition[]).filter((c) => c.regionId === filterRegion)
    : (conditions as AtlasCondition[]);

  // Find full condition data when editing (for images / quiz questions)
  const editingCondition = editingId
    ? (conditions as AtlasCondition[]).find((c) => c.id === editingId)
    : null;

  return (
    <>
      <section>
        <h2>{editingId ? 'Edytuj problem skórny' : 'Nowy problem skórny'}</h2>
        <form
          className="academy-admin-field-grid"
          onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }}
        >
          <Field label="Region">
            <select
              required
              value={form.regionId}
              onChange={(e) => set('regionId', e.target.value)}
            >
              <option value="">— wybierz region —</option>
              {(regions as AtlasRegion[]).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nazwa">
            <input
              required
              value={form.name}
              onChange={(e) => {
                set('name', e.target.value);
                if (!editingId) set('slug', slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="Slug">
            <input
              required
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
            />
          </Field>
          <Field label="Powiązany kurs">
            <select
              value={form.relatedCourseId}
              onChange={(e) => set('relatedCourseId', e.target.value)}
            >
              <option value="">— brak —</option>
              {(courses as Course[]).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kolejność">
            <input
              type="number"
              min="0"
              value={form.order}
              onChange={(e) => set('order', Number(e.target.value))}
            />
          </Field>
          <Field label="Opis" wide>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
          <Field label="Przyczyny" wide>
            <textarea
              rows={3}
              value={form.causes}
              onChange={(e) => set('causes', e.target.value)}
            />
          </Field>
          <Field label="Leczenie / zabiegi" wide>
            <textarea
              rows={3}
              value={form.treatments}
              onChange={(e) => set('treatments', e.target.value)}
            />
          </Field>
          <Field label="Przeciwwskazania" wide>
            <textarea
              rows={3}
              value={form.contraindications}
              onChange={(e) => set('contraindications', e.target.value)}
            />
          </Field>
          <label className="academy-check">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => set('published', e.target.checked)}
            />
            <span>Opublikowany</span>
          </label>
          <button disabled={save.isPending}>
            {editingId ? 'Zapisz zmiany' : 'Utwórz problem skórny'}
          </button>
          {editingId && (
            <button type="button" onClick={cancel}>
              Anuluj
            </button>
          )}
        </form>

        {/* Images section — visible when editing */}
        {editingId && (
          <div style={{ marginTop: 24 }}>
            <h3>Zdjęcia</h3>
            <div className="academy-admin-field-grid" style={{ marginBottom: 12 }}>
              <Field label="Plik zdjęcia">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
              </Field>
              <Field label="Stopień nasilenia">
                <input
                  placeholder="np. łagodny, umiarkowany, ciężki"
                  value={imageSeverity}
                  onChange={(e) => setImageSeverity(e.target.value)}
                />
              </Field>
              <button
                type="button"
                disabled={!imageFile || uploadImage.isPending}
                onClick={() => uploadImage.mutate()}
              >
                Prześlij zdjęcie
              </button>
            </div>
            <div className="academy-admin-card-list">
              {(editingCondition?.images ?? []).map((img) => (
                <article key={img.id}>
                  <div>
                    <img src={img.url} alt="" style={{ height: 60, borderRadius: 6, objectFit: 'cover' }} />
                    {img.severity && <small style={{ marginLeft: 8 }}>{img.severity}</small>}
                  </div>
                  <button
                    type="button"
                    style={{ color: '#b04739' }}
                    disabled={deleteImage.isPending}
                    onClick={() => {
                      if (window.confirm('Usunąć zdjęcie?')) deleteImage.mutate(img.id);
                    }}
                  >
                    Usuń
                  </button>
                </article>
              ))}
            </div>

            <h3 style={{ marginTop: 24 }}>Pytania quizowe</h3>
            <div className="academy-admin-card-list" style={{ marginBottom: 16 }}>
              {(editingCondition?.quizQuestions ?? []).map((q) => (
                <article key={q.id}>
                  <div>
                    <strong>{q.questionText}</strong>
                    {q.answers && (
                      <ul style={{ margin: '4px 0 0 16px', fontSize: 12 }}>
                        {q.answers.map((a) => (
                          <li key={a.id} style={{ color: a.isCorrect ? '#2e6346' : undefined }}>
                            {a.isCorrect ? '✓ ' : ''}{a.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    type="button"
                    style={{ color: '#b04739' }}
                    disabled={deleteQuestion.isPending}
                    onClick={() => {
                      if (window.confirm('Usunąć pytanie?')) deleteQuestion.mutate(q.id);
                    }}
                  >
                    Usuń
                  </button>
                </article>
              ))}
            </div>

            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 700, marginBottom: 10 }}>
                Dodaj pytanie quizowe
              </summary>
              <form
                className="academy-admin-field-grid"
                onSubmit={(e: FormEvent) => { e.preventDefault(); addQuestion.mutate(); }}
                style={{ marginTop: 10 }}
              >
                <Field label="Treść pytania" wide>
                  <input
                    required
                    value={qForm.questionText}
                    onChange={(e) => setQForm((prev) => ({ ...prev, questionText: e.target.value }))}
                  />
                </Field>
                <Field label="Wyjaśnienie (opcjonalne)" wide>
                  <input
                    value={qForm.explanation}
                    onChange={(e) => setQForm((prev) => ({ ...prev, explanation: e.target.value }))}
                  />
                </Field>
                {qForm.answers.map((answer, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      placeholder={`Odpowiedź ${idx + 1}`}
                      value={answer.text}
                      onChange={(e) =>
                        setQForm((prev) => ({
                          ...prev,
                          answers: prev.answers.map((a, i) =>
                            i === idx ? { ...a, text: e.target.value } : a
                          ),
                        }))
                      }
                      style={{ flex: 1 }}
                    />
                    <label style={{ display: 'flex', gap: 4, alignItems: 'center', whiteSpace: 'nowrap', fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={answer.isCorrect}
                        onChange={(e) =>
                          setQForm((prev) => ({
                            ...prev,
                            answers: prev.answers.map((a, i) =>
                              i === idx ? { ...a, isCorrect: e.target.checked } : a
                            ),
                          }))
                        }
                      />
                      poprawna
                    </label>
                  </div>
                ))}
                <button disabled={addQuestion.isPending}>Dodaj pytanie</button>
              </form>
            </details>
          </div>
        )}
      </section>

      <section>
        <h2>Problemy skórne</h2>
        <div style={{ marginBottom: 12 }}>
          <label>
            <span style={{ marginRight: 8 }}>Filtruj według regionu:</span>
            <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
              <option value="">Wszystkie regiony</option>
              {(regions as AtlasRegion[]).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="academy-admin-card-list">
          {filtered.map((condition) => (
            <article key={condition.id}>
              <div>
                <strong>{condition.name}</strong>
                <p>
                  {condition.region?.name ?? '—'} · {condition.slug} ·{' '}
                  pozycja {condition.order} · {condition.published ? 'opublikowany' : 'szkic'}
                </p>
              </div>
              <button onClick={() => startEdit(condition)}>Edytuj</button>
              <button
                onClick={() => {
                  if (expandedId === condition.id) setExpandedId('');
                  else setExpandedId(condition.id);
                }}
                style={{ marginLeft: 6 }}
              >
                {expandedId === condition.id ? 'Zwiń' : 'Szczegóły'}
              </button>
              <button
                onClick={() => handleDelete(condition.id, condition.name)}
                disabled={del.isPending}
                style={{ marginLeft: 6, color: '#b04739' }}
              >
                Usuń
              </button>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function AdminSkinAtlas() {
  const [tab, setTab] = useState<'regions' | 'conditions'>('regions');

  return (
    <div className="academy-admin-form-page">
      <header>
        <p className="academy-kicker">Atlas skóry</p>
        <h1>Zarządzanie atlasem skóry</h1>
        <p>Twórz i edytuj regiony ciała oraz powiązane problemy skórne z opisami, zdjęciami i pytaniami quizowymi.</p>
      </header>

      <AdminHelp
        title="Po co jest ta zakładka"
        steps={[
          'Zacznij od regionu — np. „Twarz”, „Dłonie”. Bez regionu nie da się dodać problemu skórnego.',
          'Do regionu dodaj problemy skórne: nazwa, opis, objawy, zalecane postępowanie.',
          'Wgraj zdjęcia poglądowe do każdego problemu — to najważniejsza część atlasu.',
          'Na końcu dodaj pytania quizowe. Kursantka sprawdza nimi, czy rozpoznaje problem ze zdjęcia.',
        ]}
      >
        Atlas to encyklopedia problemów skórnych dostępna dla każdej kursantki, która kupiła jakikolwiek kurs.
        Jest zbudowany dwupoziomowo: <strong>region ciała</strong> zawiera <strong>problemy skórne</strong>,
        a każdy problem ma opis, zdjęcia i opcjonalne pytania.
      </AdminHelp>

      <nav style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => setTab('regions')}
          style={{ fontWeight: tab === 'regions' ? 800 : undefined, borderBottom: tab === 'regions' ? '2px solid #2e6346' : 'none' }}
        >
          Regiony
        </button>
        <button
          type="button"
          onClick={() => setTab('conditions')}
          style={{ fontWeight: tab === 'conditions' ? 800 : undefined, borderBottom: tab === 'conditions' ? '2px solid #2e6346' : 'none' }}
        >
          Problemy skórne
        </button>
      </nav>

      {tab === 'regions' ? <RegionsTab /> : <ConditionsTab />}
    </div>
  );
}
