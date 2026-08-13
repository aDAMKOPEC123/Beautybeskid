import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { ArrowDown, ArrowUp, BookOpen, CheckCircle2, ChevronRight, CircleHelp, Download, FileText, Film, ImagePlus, Layers3, Lightbulb, Paperclip, Pencil, Play, Plus, Save, Sparkles, Trash2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AdminHelp } from '@/components/AdminHelp';
import { QuestionEditor } from '@/components/QuestionEditor';
import { ImageUploadField } from '@/components/ImageUploadField';
import { RichTextEditor } from '@/components/RichTextEditor';

const slugify = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const embedHtml = (url: string) => `<iframe src="${url}" title="Materiał szkoleniowy" loading="lazy" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px"></iframe>`;

export function AcademyStudio() {
  const { user } = useAuth();
  const client = useQueryClient();
  const { data: courses = [], isLoading } = useQuery({ queryKey: ['studio', 'courses'], queryFn: academyApi.adminGetCourses });
  const { data: instructors = [] } = useQuery({ queryKey: ['academy', 'instructors'], queryFn: academyApi.adminGetInstructors });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const emptyDraft = { title: '', description: '', difficulty: 'BEGINNER', estimatedMinutes: 60, price: 0, compareAtPrice: null as number | null, displayOrder: 0, isFree: false, accessDays: null as number | null, isFeatured: false, isBestseller: false, isComingSoon: false, previewLessonId: '', instructorId: '', instructorName: 'Wiktoria Ćwik', instructorBio: '', bundleGroup: '', tagsText: '', thumbnailUrl: '', learningOutcomesText:'',targetAudience:'',notForAudience:'',prerequisitesText:'',trailerVideoId:'',samplePdfUrl:'',salesFaqsText:'', status: 'DRAFT' };
  const [draft, setDraft] = useState(emptyDraft);
  const selected = useMemo(() => (courses as any[]).find(c => c.id === selectedId), [courses, selectedId]);
  const refresh = () => client.invalidateQueries({ queryKey: ['studio', 'courses'] });
  const saveCourse = useMutation({ mutationFn: () => { const { tagsText,learningOutcomesText,prerequisitesText,salesFaqsText, ...data } = draft; const payload = { ...data, instructorId: data.instructorId || null, bundleGroup: data.bundleGroup || null, instructorBio: data.instructorBio || null, targetAudience:data.targetAudience||null,notForAudience:data.notForAudience||null,trailerVideoId:data.trailerVideoId||null,samplePdfUrl:data.samplePdfUrl||null, tags: tagsText.split(',').map(tag => tag.trim()).filter(Boolean),learningOutcomes:learningOutcomesText.split('\n').map(v=>v.trim()).filter(Boolean),prerequisites:prerequisitesText.split('\n').map(v=>v.trim()).filter(Boolean),salesFaqs:salesFaqsText.split('\n').map(line=>{const [question,...answer]=line.split('|');return{question:question?.trim(),answer:answer.join('|').trim()}}).filter(item=>item.question&&item.answer) }; return selected ? academyApi.adminUpdateCourse(selected.id, { ...payload, slug: selected.slug }) : academyApi.adminCreateCourse({ ...payload, slug: slugify(draft.title) }); }, onSuccess: (course: any) => { setSelectedId(course.id ?? selectedId); refresh(); toast.success(selected ? 'Kurs zapisany' : 'Kurs utworzony'); }, onError: (e: any) => toast.error(e?.response?.data?.message || 'Nie udało się zapisać kursu') });
  const addModule = useMutation({ mutationFn: (title: string) => academyApi.adminCreateModule(selected!.id, { title, order: selected?.modules?.length ?? 0 }), onSuccess: refresh });
  const addLesson = useMutation({ mutationFn: ({ moduleId, data }: any) => academyApi.adminCreateLesson(moduleId, data), onSuccess: refresh });
  const updateLesson = useMutation({ mutationFn: ({ lessonId, data }: any) => academyApi.adminUpdateLesson(lessonId, data), onSuccess: refresh });
  const addQuiz = useMutation({ mutationFn: (data: any) => academyApi.adminCreateCheckpoint(data.moduleId, data), onSuccess: refresh });
  const deleteCourse = useMutation({ mutationFn: (id: string) => academyApi.adminDeleteCourse(id), onSuccess: () => { setSelectedId(null); setDraft(emptyDraft); refresh(); toast.success('Kurs usunięty'); }, onError: (e: any) => toast.error(e?.response?.data?.message || 'Nie udało się usunąć kursu') });

  const choose = (course: any) => { setSelectedId(course.id); setDraft({ ...emptyDraft, title: course.title, description: course.description, difficulty: course.difficulty, estimatedMinutes: course.estimatedMinutes, price: Number(course.price || 0), compareAtPrice: course.compareAtPrice ? Number(course.compareAtPrice) : null, displayOrder: course.displayOrder || 0, isFree: course.isFree, accessDays: course.accessDays, isFeatured: course.isFeatured, isBestseller: course.isBestseller, isComingSoon: course.isComingSoon, previewLessonId: course.previewLessonId || '', instructorId: course.instructorId || '', instructorName: course.instructorName || 'Wiktoria Ćwik', instructorBio: course.instructorBio || '', bundleGroup: course.bundleGroup || '', tagsText: (course.tags || []).join(', '), thumbnailUrl: course.thumbnailUrl ?? '',learningOutcomesText:(course.learningOutcomes||[]).join('\n'),targetAudience:course.targetAudience||'',notForAudience:course.notForAudience||'',prerequisitesText:(course.prerequisites||[]).join('\n'),trailerVideoId:course.trailerVideoId||'',samplePdfUrl:course.samplePdfUrl||'',salesFaqsText:Array.isArray(course.salesFaqs)?course.salesFaqs.map((faq:any)=>`${faq.question}|${faq.answer}`).join('\n'):'', status: course.status }); };
  const newCourse = () => { setSelectedId(null); setDraft(emptyDraft); };
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  if (isLoading) return <div className="academy-loading">Ładujemy studio Akademii…</div>;

  return <div className="studio-page">
    <aside className="studio-sidebar"><div><p className="academy-kicker">Studio Akademii</p><h1>Twórz z intencją</h1><p>Od szkicu po publikację — bez opuszczania Akademii.</p></div><button className="studio-new" onClick={newCourse}><Plus />Nowy kurs</button><div className="studio-course-list">{(courses as any[]).map(course => <button key={course.id} className={selectedId === course.id ? 'selected' : ''} onClick={() => choose(course)}><span className="studio-course-icon"><BookOpen /></span><span><strong>{course.title}</strong><small>{course.status === 'PUBLISHED' ? 'Opublikowany' : 'Szkic'} · {course.modules?.length ?? 0} modułów</small></span><ChevronRight /></button>)}</div></aside>
    <main className="studio-main"><div className="studio-top"><div><p className="academy-kicker text-caramel">{selected ? 'Edycja kursu' : 'Nowy kurs'}</p><h2>{selected ? selected.title : 'Zbuduj kurs, do którego chce się wracać'}</h2></div><button className="academy-button studio-save" onClick={() => saveCourse.mutate()} disabled={!draft.title || saveCourse.isPending}><Save />{saveCourse.isPending ? 'Zapisywanie…' : selected ? 'Zapisz zmiany' : 'Utwórz kurs'}</button></div>
      <AdminHelp
        title="Jak działa ta zakładka"
        steps={[
          'Kliknij „Nowy kurs” po lewej albo wybierz istniejący kurs z listy.',
          'Wypełnij kartę kursu: tytuł, opis, cenę. Kliknij „Utwórz kurs” — dopiero wtedy pojawi się miejsce na lekcje.',
          'W sekcji „Program kursu” dodaj moduł (rozdział), a w nim lekcje: filmy, teksty i punkty kontrolne.',
          'Uzupełnij transkrypcje filmów oraz sekcję „Strona sprzedażowa” — bez nich kurs źle sprzedaje i nie przejdzie kontroli dostępności.',
          'Na koniec ustaw status na „Opublikuj” i zapisz. Dopóki jest „Szkic”, kursu nikt poza Tobą nie widzi.',
        ]}
      >
        To główne miejsce pracy nad kursami. Wszystko zapisuje się dopiero po kliknięciu przycisku —
        zamknięcie strony bez zapisu skasuje zmiany w karcie kursu. Moduły, lekcje i pytania zapisują się
        od razu, osobno.
      </AdminHelp>
      <section className="studio-guide"><Lightbulb /><div><strong>Krótka recepta na dobry kurs</strong><p>Obiecaj konkretny efekt w tytule. W opisie powiedz dla kogo jest kurs, z czym kursantka wyjdzie i czego potrzebuje przed startem. Jedna lekcja = jedna praktyczna decyzja lub umiejętność.</p></div></section>
      {selected && selected.status === 'PUBLISHED' && !selected.isFree && !selected.isComingSoon && Number(selected.price) <= 0 && <section className="academy-readiness-warning" role="alert"><strong>Kurs nie jest gotowy do sprzedaży</strong><p>Uzupełnij cenę większą od zera albo oznacz kurs jako bezpłatny lub „w przygotowaniu”. Checkout pozostaje zablokowany.</p></section>}
      {selected && selected.modules?.flatMap((module:any) => module.lessons || []).some((lesson:any) => lesson.type === 'VIDEO' && !lesson.transcriptHtml) && <section className="academy-readiness-warning" role="alert"><strong>Brakuje transkrypcji filmów</strong><p>Uzupełnij transkrypcje w programie kursu. Są wymagane przed kolejną publikacją.</p></section>}
      <section className="studio-card"><div className="studio-card-head"><span><Sparkles />Karta kursu</span><small>To widzą kursantki przed zakupem</small></div><div className="studio-form-grid"><Field label="Tytuł kursu" hint="Konkretny rezultat"><input value={draft.title} onChange={e => setDraft({...draft, title:e.target.value})} /></Field><Field label="Poziom"><select value={draft.difficulty} onChange={e => setDraft({...draft, difficulty:e.target.value})}><option value="BEGINNER">Podstawowy</option><option value="INTERMEDIATE">Rozwój</option><option value="ADVANCED">Ekspercki</option></select></Field><Field label="Opis"><textarea value={draft.description} onChange={e => setDraft({...draft, description:e.target.value})} /></Field><div className="studio-split"><Field label="Czas (min)"><input type="number" min="0" value={draft.estimatedMinutes} onChange={e => setDraft({...draft, estimatedMinutes:Number(e.target.value)})} /></Field><Field label="Cena (PLN)" hint="Oddzielnie oznacz kurs bezpłatny"><input type="number" min="0" disabled={draft.isFree} value={draft.price} onChange={e => setDraft({...draft, price:Number(e.target.value)})} /></Field></div><div className="studio-split"><Field label="Dostęp (dni)" hint="Puste = bezterminowo"><input type="number" min="1" value={draft.accessDays ?? ''} onChange={e => setDraft({...draft, accessDays:e.target.value ? Number(e.target.value) : null})} /></Field><Field label="Status"><select value={draft.status} onChange={e => setDraft({...draft, status:e.target.value})}><option value="DRAFT">Szkic</option><option value="PUBLISHED">Opublikuj</option><option value="ARCHIVED">Archiwum</option></select></Field></div><div className="flex flex-wrap gap-4 text-sm"><label><input type="checkbox" checked={draft.isFree} onChange={e=>setDraft({...draft,isFree:e.target.checked})}/> Bezpłatny</label><label><input type="checkbox" checked={draft.isComingSoon} onChange={e=>setDraft({...draft,isComingSoon:e.target.checked})}/> W przygotowaniu</label><label><input type="checkbox" checked={draft.isFeatured} onChange={e=>setDraft({...draft,isFeatured:e.target.checked})}/> Wyróżniony</label><label><input type="checkbox" checked={draft.isBestseller} onChange={e=>setDraft({...draft,isBestseller:e.target.checked})}/> Bestseller</label></div><Field label="Tematy" hint="Po przecinku"><input value={draft.tagsText} onChange={e=>setDraft({...draft,tagsText:e.target.value})}/></Field><Field label="Pakiet / ścieżka"><input value={draft.bundleGroup} onChange={e=>setDraft({...draft,bundleGroup:e.target.value})}/></Field><Field label="Prowadząca" hint="Wybierz osobę z listy. Wizytówki dodajesz w zakładce „Prowadzące”."><select value={draft.instructorId} onChange={e=>{const chosen=(instructors as any[]).find(person=>person.id===e.target.value);setDraft({...draft,instructorId:e.target.value,instructorName:chosen?chosen.name:draft.instructorName});}}><option value="">— podpis ręczny poniżej —</option>{(instructors as any[]).map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></Field><Field label="Podpis ręczny" hint="Używany tylko wtedy, gdy nie wybrałaś prowadzącej z listy powyżej."><input value={draft.instructorName} onChange={e=>setDraft({...draft,instructorName:e.target.value})}/></Field><Field label="Bio prowadzącej"><textarea value={draft.instructorBio} onChange={e=>setDraft({...draft,instructorBio:e.target.value})}/></Field><ImageUploadField label="Okładka kursu" hint="Zalecane proporcje 16:9 — tak wyświetla się okładka w sklepie." value={draft.thumbnailUrl} onChange={(url) => setDraft({ ...draft, thumbnailUrl: url })} folder="academy-courses" aspect={16 / 9} previewShape="wide" /></div></section>
      <section className="studio-card"><div className="studio-card-head"><span><Sparkles />Cena promocyjna</span><small>Wymagana do prawidłowego pokazania obniżki</small></div><div className="p-4"><Field label="Cena przed obniżką (PLN)" hint="Pozostaw puste, gdy kurs nie jest w promocji"><input type="number" min="0" step="0.01" value={draft.compareAtPrice ?? ''} onChange={e => setDraft({...draft, compareAtPrice:e.target.value ? Number(e.target.value) : null})} /></Field></div></section>
      <section className="studio-card"><div className="studio-card-head"><span><Sparkles />Pozycja w sklepie</span><small>Niższy numer wyświetla kurs wcześniej</small></div><div className="p-4"><Field label="Kolejność polecanych"><input type="number" min="0" value={draft.displayOrder} onChange={e=>setDraft({...draft,displayOrder:Number(e.target.value)})}/></Field></div></section>
      <section className="studio-card"><div className="studio-card-head"><span><Sparkles />Strona sprzedażowa</span><small>Argumenty, materiały próbne i FAQ kursu</small></div><div className="studio-form-grid"><Field label="Rezultaty nauki" hint="Jeden rezultat w linii"><textarea value={draft.learningOutcomesText} onChange={e=>setDraft({...draft,learningOutcomesText:e.target.value})}/></Field><Field label="Dla kogo"><textarea value={draft.targetAudience} onChange={e=>setDraft({...draft,targetAudience:e.target.value})}/></Field><Field label="Dla kogo nie jest"><textarea value={draft.notForAudience} onChange={e=>setDraft({...draft,notForAudience:e.target.value})}/></Field><Field label="Wymagania wstępne" hint="Jedno w linii"><textarea value={draft.prerequisitesText} onChange={e=>setDraft({...draft,prerequisitesText:e.target.value})}/></Field><Field label="ID zwiastuna Vimeo/YouTube"><input value={draft.trailerVideoId} onChange={e=>setDraft({...draft,trailerVideoId:e.target.value})}/></Field><Field label="Adres próbki PDF"><input value={draft.samplePdfUrl} onChange={e=>setDraft({...draft,samplePdfUrl:e.target.value})}/></Field><Field label="FAQ" hint="Pytanie|Odpowiedź — jedno w linii"><textarea value={draft.salesFaqsText} onChange={e=>setDraft({...draft,salesFaqsText:e.target.value})}/></Field></div></section>
      {selected && <section className="studio-card"><div className="studio-card-head"><span><Play />Bezpłatny podgląd</span><small>Wybierz jedną istniejącą lekcję widoczną przed zakupem</small></div><div className="p-4"><Field label="Lekcja podglądowa" hint="Po zmianie kliknij Zapisz kurs"><select value={draft.previewLessonId} onChange={event => setDraft({ ...draft, previewLessonId: event.target.value })}><option value="">Bez podglądu</option>{selected.modules?.flatMap((module: any) => module.lessons?.map((lesson: any) => <option key={lesson.id} value={lesson.id}>{module.title} — {lesson.title}</option>) ?? [])}</select></Field></div></section>}
      <section className="studio-card"><div className="studio-card-head"><span><Play />Podgląd strony kursu</span><div className="academy-preview-switch"><button className={previewMode==='desktop'?'active':''} onClick={()=>setPreviewMode('desktop')}>Desktop</button><button className={previewMode==='mobile'?'active':''} onClick={()=>setPreviewMode('mobile')}>Telefon</button></div></div><div className={`academy-course-live-preview ${previewMode}`}><article><div className="academy-course-cover">{draft.thumbnailUrl?<img src={draft.thumbnailUrl} alt=""/>:<div className="academy-course-placeholder"><BookOpen/></div>}</div><div><p className="academy-kicker">{draft.difficulty}</p><h2>{draft.title||'Tytuł kursu'}</h2><p>{draft.description||'Opis i obietnica kursu pojawią się tutaj.'}</p><strong>{draft.isFree?'Bezpłatny':draft.isComingSoon?'Wkrótce':`${Number(draft.price).toLocaleString('pl-PL')} zł`}</strong>{draft.compareAtPrice&&Number(draft.compareAtPrice)>Number(draft.price)&&<del>{Number(draft.compareAtPrice).toLocaleString('pl-PL')} zł</del>}<ul>{draft.learningOutcomesText.split('\n').filter(Boolean).slice(0,4).map(item=><li key={item}><CheckCircle2/>{item}</li>)}</ul><button type="button">{draft.isComingSoon?'Dołącz do listy':'Kup kurs'}</button></div></article></div></section>
      {selected && <Curriculum course={selected} addModule={addModule.mutate} addLesson={addLesson.mutate} updateLesson={updateLesson.mutate} addQuiz={addQuiz.mutate} refresh={refresh} />}
      {selected && <section className="studio-card studio-danger">
        <div className="studio-card-head"><span><Trash2 />Usuń kurs</span><small>Ostatnia rzecz na tej stronie — trudno to cofnąć</small></div>
        <div className="p-4">
          <p>Usunięcie kasuje kurs razem ze wszystkimi modułami, lekcjami, materiałami i postępami kursantek. Nie da się tego odwrócić.</p>
          <p><strong>Zamiast usuwać rozważ status „Archiwum”</strong> w karcie kursu wyżej — kurs zniknie ze sklepu, ale kursantki, które go kupiły, zachowają dostęp.</p>
          <button type="button" className="studio-delete-course" onClick={() => {
            if (prompt(`Aby trwale usunąć kurs, przepisz jego tytuł:\n\n${selected.title}`)?.trim() === selected.title.trim()) deleteCourse.mutate(selected.id);
            else toast.error('Tytuł się nie zgadza — kurs nie został usunięty');
          }}><Trash2 />Usuń kurs na zawsze</button>
        </div>
      </section>}
      {!selected && <div className="studio-next"><CheckCircle2 /><div><strong>Najpierw zapisz kartę kursu</strong><p>Po utworzeniu kursu dodasz moduły, lekcje, osadzone materiały i punkty kontrolne.</p></div></div>}
    </main>
  </div>;
}

function Curriculum({ course, addModule, addLesson, updateLesson, addQuiz, refresh }: { course: any; addModule: (title: string) => void; addLesson: (input: any) => void; updateLesson: (input: any) => void; addQuiz: (input: any) => void; refresh: () => void }) {
  const [moduleTitle, setModuleTitle] = useState('');
  const [open, setOpen] = useState<string | null>(course.modules?.[0]?.id ?? null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const modules: any[] = course.modules ?? [];

  const moveModule = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= modules.length) return;
    const order = modules.map((mod) => mod.id);
    [order[index], order[target]] = [order[target], order[index]];
    try { await academyApi.adminReorderModules(course.id, order); refresh(); }
    catch { toast.error('Nie udało się zmienić kolejności'); }
  };

  const saveRename = async (moduleId: string) => {
    if (!renameValue.trim()) return setRenaming(null);
    try { await academyApi.adminUpdateModule(moduleId, { title: renameValue.trim() }); setRenaming(null); refresh(); toast.success('Nazwa modułu zmieniona'); }
    catch { toast.error('Nie udało się zmienić nazwy'); }
  };

  const removeModule = async (mod: any) => {
    const count = mod.lessons?.length ?? 0;
    const message = count
      ? `Usunąć moduł „${mod.title}" razem z ${count} lekcjami i ich materiałami? Tej operacji nie da się cofnąć.`
      : `Usunąć pusty moduł „${mod.title}"?`;
    if (!confirm(message)) return;
    try { await academyApi.adminDeleteModule(mod.id); refresh(); toast.success('Moduł usunięty'); }
    catch { toast.error('Nie udało się usunąć modułu'); }
  };

  return <section className="studio-card">
    <div className="studio-card-head"><span><Layers3 />Program kursu</span><small>Buduj kolejność: wprowadzenie → demonstracja → praktyka → sprawdzenie.</small></div>
    <p className="studio-section-help">
      <strong>Moduł</strong> to rozdział kursu, <strong>lekcja</strong> to pojedynczy film, tekst lub punkt
      kontrolny wewnątrz rozdziału. Kliknij nazwę modułu, żeby go rozwinąć. Strzałkami zmieniasz kolejność —
      dokładnie w takiej zobaczy je kursantka.
    </p>
    <div className="studio-modules">{modules.map((mod: any, index: number) => <div className="studio-module" key={mod.id}>
      <div className="studio-module-bar">
        <button className="studio-module-head" onClick={() => setOpen(open === mod.id ? null : mod.id)}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <strong>{mod.title}</strong>
          <small>{mod.lessons?.length ?? 0} lekcji</small>
          <ChevronRight className={open === mod.id ? 'open' : ''} />
        </button>
        <div className="studio-module-tools">
          <button type="button" title="Przenieś moduł wyżej" aria-label="Przenieś moduł wyżej" disabled={index === 0} onClick={() => moveModule(index, -1)}><ArrowUp /></button>
          <button type="button" title="Przenieś moduł niżej" aria-label="Przenieś moduł niżej" disabled={index === modules.length - 1} onClick={() => moveModule(index, 1)}><ArrowDown /></button>
          <button type="button" title="Zmień nazwę modułu" aria-label="Zmień nazwę modułu" onClick={() => { setRenaming(mod.id); setRenameValue(mod.title); }}><Pencil /></button>
          <button type="button" title="Usuń moduł" aria-label="Usuń moduł" onClick={() => removeModule(mod)}><Trash2 /></button>
        </div>
      </div>
      {renaming === mod.id && <div className="studio-inline-edit">
        <input value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') saveRename(mod.id); if (e.key === 'Escape') setRenaming(null); }} />
        <button type="button" onClick={() => saveRename(mod.id)}>Zapisz nazwę</button>
        <button type="button" className="ghost" onClick={() => setRenaming(null)}>Anuluj</button>
      </div>}
      {open === mod.id && <div className="studio-module-content">
        {(mod.lessons ?? []).map((lesson: any, lessonIndex: number) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            index={lessonIndex}
            total={mod.lessons?.length ?? 0}
            moduleId={mod.id}
            lessonOrder={(mod.lessons ?? []).map((item: any) => item.id)}
            updateLesson={updateLesson}
            refresh={refresh}
          />
        ))}
        <LessonComposer module={mod} addLesson={addLesson} addQuiz={addQuiz} />
      </div>}
    </div>)}</div>
    <div className="studio-add-module">
      <input value={moduleTitle} onChange={e => setModuleTitle(e.target.value)} placeholder="np. Diagnostyka i przygotowanie" />
      <button onClick={() => { if (moduleTitle.trim()) { addModule(moduleTitle); setModuleTitle(''); } }}><Plus />Dodaj moduł</button>
    </div>
  </section>;
}

function LessonRow({ lesson, index, total, moduleId, lessonOrder, updateLesson, refresh }: { lesson: any; index: number; total: number; moduleId: string; lessonOrder: string[]; updateLesson: (input: any) => void; refresh: () => void }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(lesson.title);

  const move = async (direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= total) return;
    const order = [...lessonOrder];
    [order[index], order[target]] = [order[target], order[index]];
    try { await academyApi.adminReorderLessons(moduleId, order); refresh(); }
    catch { toast.error('Nie udało się zmienić kolejności'); }
  };

  const saveTitle = async () => {
    if (!title.trim()) return setEditingTitle(false);
    try { await academyApi.adminUpdateLesson(lesson.id, { title: title.trim() }); setEditingTitle(false); refresh(); toast.success('Tytuł lekcji zmieniony'); }
    catch { toast.error('Nie udało się zmienić tytułu'); }
  };

  const remove = async () => {
    if (!confirm(`Usunąć lekcję „${lesson.title}" razem z materiałami, transkrypcją i postępami kursantek? Tej operacji nie da się cofnąć.`)) return;
    try { await academyApi.adminDeleteLesson(lesson.id); refresh(); toast.success('Lekcja usunięta'); }
    catch { toast.error('Nie udało się usunąć lekcji'); }
  };

  const subtitle = lesson.type === 'QUIZ'
    ? `${lesson.quiz?._count?.questions ?? lesson.quiz?.questions?.length ?? 0} pytań kontrolnych`
    : lesson.type === 'TEXT' ? 'Tekst / materiał osadzony'
    : lesson.transcriptHtml ? 'Materiał wideo · transkrypcja gotowa' : 'Materiał wideo · brak transkrypcji';

  return <div>
    <div className="studio-lesson">
      {lesson.type === 'VIDEO' ? <Film /> : lesson.type === 'QUIZ' ? <CircleHelp /> : <FileText />}
      {editingTitle ? (
        <span className="studio-inline-edit">
          <input value={title} onChange={e => setTitle(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitle(lesson.title); setEditingTitle(false); } }} />
          <button type="button" onClick={saveTitle}>Zapisz</button>
          <button type="button" className="ghost" onClick={() => { setTitle(lesson.title); setEditingTitle(false); }}>Anuluj</button>
        </span>
      ) : (
        <span><strong>{lesson.title}</strong><small>{subtitle}</small></span>
      )}
      <span className="studio-lesson-tools">
        <button type="button" title="Przenieś lekcję wyżej" aria-label="Przenieś lekcję wyżej" disabled={index === 0} onClick={() => move(-1)}><ArrowUp /></button>
        <button type="button" title="Przenieś lekcję niżej" aria-label="Przenieś lekcję niżej" disabled={index === total - 1} onClick={() => move(1)}><ArrowDown /></button>
        <button type="button" title="Zmień tytuł lekcji" aria-label="Zmień tytuł lekcji" onClick={() => setEditingTitle(true)}><Pencil /></button>
        <button type="button" title="Usuń lekcję" aria-label="Usuń lekcję" onClick={remove}><Trash2 /></button>
      </span>
    </div>
    {lesson.type === 'VIDEO' && <VideoLessonEditor lesson={lesson} updateLesson={updateLesson} />}
    {lesson.type === 'TEXT' && <TextLessonEditor lesson={lesson} updateLesson={updateLesson} />}
    {lesson.quiz && <CheckpointQuestions lesson={lesson} refresh={refresh} />}
    <AttachmentsManager lesson={lesson} onRefresh={refresh} />
    <CaseStudiesManager lesson={lesson} onRefresh={refresh} />
  </div>;
}

function VideoLessonEditor({ lesson, updateLesson }: { lesson: any; updateLesson: (input: any) => void }) {
  const [videoId, setVideoId] = useState(lesson.videoId || '');
  const [transcriptHtml, setTranscriptHtml] = useState(lesson.transcriptHtml || '');
  return <details className="studio-transcript">
    <summary>Film i transkrypcja</summary>
    <p className="studio-hint">Identyfikator filmu to fragment adresu po „v=” (YouTube) albo ostatnia liczba w adresie Vimeo. Możesz też wkleić cały link — wytniemy resztę sami.</p>
    <input value={videoId} onChange={e => setVideoId(e.target.value)} placeholder="Identyfikator lub link do filmu" />
    <p className="studio-hint">Transkrypcja jest wymagana przed publikacją — dzięki niej kurs jest dostępny dla osób niesłyszących i wyszukiwarki widzą jego treść.</p>
    <textarea value={transcriptHtml} onChange={e => setTranscriptHtml(e.target.value)} placeholder="Wklej transkrypcję filmu. Możesz użyć prostego HTML: akapity, nagłówki i listy." />
    <button onClick={() => updateLesson({ lessonId: lesson.id, data: { transcriptHtml, videoId: videoId.replace(/^.*(?:v=|youtu\.be\/|vimeo\.com\/)/, '').split(/[?&]/)[0] } })}>Zapisz film i transkrypcję</button>
  </details>;
}

function TextLessonEditor({ lesson, updateLesson }: { lesson: any; updateLesson: (input: any) => void }) {
  const [contentHtml, setContentHtml] = useState(lesson.contentHtml || '');
  return <details className="studio-transcript">
    <summary>Treść lekcji</summary>
    <p className="studio-hint">Edytuj tekst tak samo jak przy dodawaniu lekcji. Zmiany widać u kursantek zaraz po zapisaniu.</p>
    <RichTextEditor value={contentHtml} onChange={setContentHtml} />
    <button onClick={() => updateLesson({ lessonId: lesson.id, data: { contentHtml } })}>Zapisz treść lekcji</button>
  </details>;
}

function CheckpointQuestions({ lesson, refresh }: { lesson: any; refresh: () => void }) {
  const { data: quiz } = useQuery({
    queryKey: ['studio', 'quiz', lesson.quiz.id],
    queryFn: () => academyApi.adminGetQuiz(lesson.quiz.id),
  });
  const client = useQueryClient();
  const onChanged = () => { client.invalidateQueries({ queryKey: ['studio', 'quiz', lesson.quiz.id] }); refresh(); };

  return <details className="studio-transcript">
    <summary><CircleHelp className="w-3.5 h-3.5 inline mr-1" />Pytania punktu kontrolnego ({quiz?.questions?.length ?? 0})</summary>
    <p className="studio-hint">Kursantka musi zaliczyć ten test, żeby przejść dalej. Trzy–pięć pytań w zupełności wystarczy.</p>
    {quiz ? <QuestionEditor quizId={quiz.id} questions={quiz.questions ?? []} onChanged={onChanged} /> : <p className="studio-hint">Ładujemy pytania…</p>}
  </details>;
}

function LessonComposer({ module, addLesson, addQuiz }: { module: any; addLesson: (input: any) => void; addQuiz: (input: any) => void }) {
  const [kind, setKind] = useState('VIDEO'); const [title, setTitle] = useState(''); const [source, setSource] = useState(''); const [transcriptHtml, setTranscriptHtml] = useState('');
  const add = () => { if (!title.trim()) return; const base = { title, slug: slugify(title), order: module.lessons?.length ?? 0, estimatedMinutes: 8, isRequired: true };
    if (kind === 'QUIZ') { addQuiz({ moduleId: module.id, title, order: base.order }); setTitle(''); return; }
    if (kind === 'VIDEO') addLesson({ moduleId: module.id, data: {...base, type:'VIDEO', videoProvider:'YOUTUBE', videoId: source.replace(/^.*(?:v=|youtu\.be\/)/, '').split(/[?&]/)[0], transcriptHtml} });
    if (kind === 'EMBED') { if (!/^https:\/\/(www\.youtube\.com|player\.vimeo\.com)\//.test(source)) return void toast.error('Wklej bezpieczny adres osadzania YouTube lub Vimeo.'); addLesson({moduleId:module.id,data:{...base,type:'TEXT',contentHtml:embedHtml(source)}}); }
    if (kind === 'TEXT') addLesson({ moduleId: module.id, data: {...base, type:'TEXT',contentHtml:source} }); setTitle(''); setSource(''); setTranscriptHtml(''); };
  return <div className="studio-composer"><div className="studio-composer-title"><Plus />Dodaj element do tej sekcji</div><div className="studio-kind-tabs">{[['VIDEO','Film YouTube'],['EMBED','iframe / Vimeo'],['TEXT','Instrukcja'],['QUIZ','Punkt kontrolny']].map(([value,label]) => <button key={value} onClick={() => setKind(value)} className={kind===value?'selected':''}>{label}</button>)}</div><input value={title} onChange={e => setTitle(e.target.value)} placeholder={kind === 'QUIZ' ? 'np. Sprawdź wiedzę po sekcji' : 'Tytuł lekcji'} />{kind === 'TEXT' ? <RichTextEditor value={source} onChange={setSource} /> : kind !== 'QUIZ' && <textarea value={source} onChange={e => setSource(e.target.value)} placeholder={kind === 'VIDEO' ? 'Link do filmu YouTube' : 'Adres osadzania, np. https://player.vimeo.com/video/…'} />}{kind === 'VIDEO' && <textarea value={transcriptHtml} onChange={e => setTranscriptHtml(e.target.value)} placeholder="Transkrypcja filmu (wymagana przed publikacją dostępnego kursu)" />}{kind === 'QUIZ' && <p className="studio-hint">Po dodaniu punktu kontrolnego utwórz pytania w sekcji „Quizy” — w kolejnym kroku połączymy je bezpośrednio z tym miejscem.</p>}<button className="studio-add-lesson" onClick={add}><Plus />Dodaj {kind === 'QUIZ' ? 'punkt kontrolny' : 'lekcję'}</button></div>;
}

function AttachmentsManager({ lesson, onRefresh }: { lesson: any; onRefresh: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [desc, setDesc] = useState('');
  const attachments: any[] = lesson.attachments ?? [];

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      await academyApi.adminAddAttachment(lesson.id, file, desc.trim() || undefined);
      setDesc('');
      onRefresh();
      toast.success('Plik dodany');
    } catch { toast.error('Nie udało się wgrać pliku'); }
    finally { setUploading(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Usunąć załącznik?')) return;
    try { await academyApi.adminDeleteAttachment(id); onRefresh(); toast.success('Załącznik usunięty'); }
    catch { toast.error('Błąd usuwania'); }
  };

  return (
    <details className="studio-transcript">
      <summary><Paperclip className="w-3.5 h-3.5 inline mr-1" />Materiały do pobrania ({attachments.length})</summary>
      <div className="space-y-2 py-2">
        {attachments.map((att: any) => (
          <div key={att.id} className="flex items-center gap-2 text-sm bg-accent/20 rounded px-2 py-1.5">
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 truncate">{att.originalName}</span>
            <span className="text-xs text-muted-foreground">{(att.fileSize / 1024 / 1024).toFixed(1)} MB</span>
            <button className="text-destructive/70 hover:text-destructive" title="Usuń załącznik" aria-label="Usuń załącznik" onClick={() => remove(att.id)}><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        <div className="space-y-1">
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Opis pliku (opcjonalnie)" className="w-full text-sm rounded border px-2 py-1" />
          <input ref={fileRef} type="file" accept=".pdf,.zip,.docx" onChange={upload} hidden />
          <button className="studio-add-lesson text-xs" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Plus className="w-3.5 h-3.5" />{uploading ? 'Wgrywanie…' : 'Dodaj plik (PDF, ZIP, DOCX, max 20 MB)'}
          </button>
        </div>
      </div>
    </details>
  );
}

function CaseStudiesManager({ lesson, onRefresh }: { lesson: any; onRefresh: () => void }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [treatment, setTreatment] = useState('');
  const [results, setResults] = useState('');
  const caseStudies: any[] = lesson.caseStudies ?? [];

  const create = async () => {
    if (!title.trim()) return;
    try {
      await academyApi.adminCreateCaseStudy(lesson.id, { title, problemDescription: problem, treatmentDescription: treatment, resultsDescription: results });
      setTitle(''); setProblem(''); setTreatment(''); setResults(''); setAdding(false);
      onRefresh();
      toast.success('Studium przypadku dodane');
    } catch { toast.error('Błąd tworzenia studium przypadku'); }
  };

  const remove = async (id: string) => {
    if (!confirm('Usunąć studium przypadku?')) return;
    try { await academyApi.adminDeleteCaseStudy(id); onRefresh(); toast.success('Studium przypadku usunięte'); }
    catch { toast.error('Błąd usuwania'); }
  };

  return (
    <details className="studio-transcript">
      <summary><ImageIcon className="w-3.5 h-3.5 inline mr-1" />Studia przypadków ({caseStudies.length})</summary>
      <div className="space-y-3 py-2">
        {caseStudies.map((cs: any) => (
          <div key={cs.id} className="rounded border bg-accent/10 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <strong className="text-sm">{cs.title}</strong>
              <button className="text-destructive/70 hover:text-destructive" title="Usuń studium" aria-label="Usuń studium przypadku" onClick={() => remove(cs.id)}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            {cs.images?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {cs.images.map((img: any) => (
                  <div key={img.id} className="relative group">
                    <img src={img.imageUrl} alt={img.caption || ''} className="w-16 h-16 object-cover rounded" />
                    <span className="absolute bottom-0 left-0 text-[9px] bg-black/60 text-white px-1 rounded-tr">{img.type === 'BEFORE' ? 'Przed' : img.type === 'AFTER' ? 'Po' : 'W trakcie'}</span>
                    <button className="absolute top-0 right-0 bg-destructive text-white rounded-full w-4 h-4 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" onClick={async () => { try { await academyApi.adminDeleteCaseStudyImage(img.id); onRefresh(); } catch { toast.error('Błąd usuwania zdjęcia'); } }}>x</button>
                  </div>
                ))}
              </div>
            )}
            <CaseStudyImageUpload caseStudyId={cs.id} onRefresh={onRefresh} />
          </div>
        ))}
        {adding ? (
          <div className="space-y-2 border rounded p-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tytuł studium przypadku" className="w-full text-sm rounded border px-2 py-1" />
            <textarea value={problem} onChange={e => setProblem(e.target.value)} placeholder="Opis problemu" className="w-full text-sm rounded border px-2 py-1 min-h-16" />
            <textarea value={treatment} onChange={e => setTreatment(e.target.value)} placeholder="Zastosowany zabieg" className="w-full text-sm rounded border px-2 py-1 min-h-16" />
            <textarea value={results} onChange={e => setResults(e.target.value)} placeholder="Efekty" className="w-full text-sm rounded border px-2 py-1 min-h-16" />
            <div className="flex gap-2">
              <button className="studio-add-lesson text-xs" onClick={create}><Plus className="w-3.5 h-3.5" />Zapisz studium</button>
              <button className="text-xs text-muted-foreground" onClick={() => setAdding(false)}>Anuluj</button>
            </div>
          </div>
        ) : (
          <button className="studio-add-lesson text-xs" onClick={() => setAdding(true)}><Plus className="w-3.5 h-3.5" />Dodaj studium przypadku</button>
        )}
      </div>
    </details>
  );
}

function CaseStudyImageUpload({ caseStudyId, onRefresh }: { caseStudyId: string; onRefresh: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [type, setType] = useState('BEFORE');

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      await academyApi.adminAddCaseStudyImage(caseStudyId, file, type);
      onRefresh();
      toast.success('Zdjęcie dodane');
    } catch { toast.error('Nie udało się wgrać zdjęcia'); }
    finally { setUploading(false); }
  };

  return (
    <div className="flex items-center gap-2">
      <select value={type} onChange={e => setType(e.target.value)} className="text-xs rounded border px-1 py-0.5">
        <option value="BEFORE">Przed</option>
        <option value="DURING">W trakcie</option>
        <option value="AFTER">Po</option>
      </select>
      <input ref={fileRef} type="file" accept="image/*" onChange={upload} hidden />
      <button className="text-xs text-primary flex items-center gap-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
        <ImagePlus className="w-3.5 h-3.5" />{uploading ? 'Wgrywanie…' : 'Dodaj zdjęcie'}
      </button>
    </div>
  );
}

function Field({ label, hint, children }: { label:string; hint?:string; children:React.ReactNode }) { return <label className="studio-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
