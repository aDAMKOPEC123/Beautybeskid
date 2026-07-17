import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { Bold, BookOpen, CheckCircle2, ChevronRight, CircleHelp, FileText, Film, Heading1, Heading2, ImagePlus, Italic, Layers3, Lightbulb, Link2, List, ListOrdered, Play, Plus, Save, Sparkles, Underline } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const slugify = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const embedHtml = (url: string) => `<iframe src="${url}" title="Materiał szkoleniowy" loading="lazy" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px"></iframe>`;

export function AcademyStudio() {
  const { user } = useAuth();
  const client = useQueryClient();
  const { data: courses = [], isLoading } = useQuery({ queryKey: ['studio', 'courses'], queryFn: academyApi.adminGetCourses });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const emptyDraft = { title: '', description: '', difficulty: 'BEGINNER', estimatedMinutes: 60, price: 0, compareAtPrice: null as number | null, displayOrder: 0, isFree: false, accessDays: null as number | null, isFeatured: false, isBestseller: false, isComingSoon: false, previewLessonId: '', instructorName: 'Wiktoria Ćwik', instructorBio: '', bundleGroup: '', tagsText: '', thumbnailUrl: '', learningOutcomesText:'',targetAudience:'',notForAudience:'',prerequisitesText:'',trailerVideoId:'',samplePdfUrl:'',salesFaqsText:'', status: 'DRAFT' };
  const [draft, setDraft] = useState(emptyDraft);
  const selected = useMemo(() => (courses as any[]).find(c => c.id === selectedId), [courses, selectedId]);
  const refresh = () => client.invalidateQueries({ queryKey: ['studio', 'courses'] });
  const saveCourse = useMutation({ mutationFn: () => { const { tagsText,learningOutcomesText,prerequisitesText,salesFaqsText, ...data } = draft; const payload = { ...data, bundleGroup: data.bundleGroup || null, instructorBio: data.instructorBio || null, targetAudience:data.targetAudience||null,notForAudience:data.notForAudience||null,trailerVideoId:data.trailerVideoId||null,samplePdfUrl:data.samplePdfUrl||null, tags: tagsText.split(',').map(tag => tag.trim()).filter(Boolean),learningOutcomes:learningOutcomesText.split('\n').map(v=>v.trim()).filter(Boolean),prerequisites:prerequisitesText.split('\n').map(v=>v.trim()).filter(Boolean),salesFaqs:salesFaqsText.split('\n').map(line=>{const [question,...answer]=line.split('|');return{question:question?.trim(),answer:answer.join('|').trim()}}).filter(item=>item.question&&item.answer) }; return selected ? academyApi.adminUpdateCourse(selected.id, { ...payload, slug: selected.slug }) : academyApi.adminCreateCourse({ ...payload, slug: slugify(draft.title) }); }, onSuccess: (course: any) => { setSelectedId(course.id ?? selectedId); refresh(); } });
  const addModule = useMutation({ mutationFn: (title: string) => academyApi.adminCreateModule(selected!.id, { title, order: selected?.modules?.length ?? 0 }), onSuccess: refresh });
  const addLesson = useMutation({ mutationFn: ({ moduleId, data }: any) => academyApi.adminCreateLesson(moduleId, data), onSuccess: refresh });
  const updateLesson = useMutation({ mutationFn: ({ lessonId, data }: any) => academyApi.adminUpdateLesson(lessonId, data), onSuccess: refresh });
  const addQuiz = useMutation({ mutationFn: (data: any) => academyApi.adminCreateCheckpoint(data.moduleId, data), onSuccess: refresh });
  const addQuestion = useMutation({ mutationFn: ({ quizId, data }: any) => academyApi.adminCreateQuestion(quizId, data), onSuccess: refresh });

  const choose = (course: any) => { setSelectedId(course.id); setDraft({ ...emptyDraft, title: course.title, description: course.description, difficulty: course.difficulty, estimatedMinutes: course.estimatedMinutes, price: Number(course.price || 0), compareAtPrice: course.compareAtPrice ? Number(course.compareAtPrice) : null, displayOrder: course.displayOrder || 0, isFree: course.isFree, accessDays: course.accessDays, isFeatured: course.isFeatured, isBestseller: course.isBestseller, isComingSoon: course.isComingSoon, previewLessonId: course.previewLessonId || '', instructorName: course.instructorName || 'Wiktoria Ćwik', instructorBio: course.instructorBio || '', bundleGroup: course.bundleGroup || '', tagsText: (course.tags || []).join(', '), thumbnailUrl: course.thumbnailUrl ?? '',learningOutcomesText:(course.learningOutcomes||[]).join('\n'),targetAudience:course.targetAudience||'',notForAudience:course.notForAudience||'',prerequisitesText:(course.prerequisites||[]).join('\n'),trailerVideoId:course.trailerVideoId||'',samplePdfUrl:course.samplePdfUrl||'',salesFaqsText:Array.isArray(course.salesFaqs)?course.salesFaqs.map((faq:any)=>`${faq.question}|${faq.answer}`).join('\n'):'', status: course.status }); };
  const newCourse = () => { setSelectedId(null); setDraft(emptyDraft); };
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  if (isLoading) return <div className="academy-loading">Ładujemy studio Akademii…</div>;

  return <div className="studio-page">
    <aside className="studio-sidebar"><div><p className="academy-kicker">Studio Akademii</p><h1>Twórz z intencją</h1><p>Od szkicu po publikację — bez opuszczania Akademii.</p></div><button className="studio-new" onClick={newCourse}><Plus />Nowy kurs</button><div className="studio-course-list">{(courses as any[]).map(course => <button key={course.id} className={selectedId === course.id ? 'selected' : ''} onClick={() => choose(course)}><span className="studio-course-icon"><BookOpen /></span><span><strong>{course.title}</strong><small>{course.status === 'PUBLISHED' ? 'Opublikowany' : 'Szkic'} · {course.modules?.length ?? 0} modułów</small></span><ChevronRight /></button>)}</div></aside>
    <main className="studio-main"><div className="studio-top"><div><p className="academy-kicker text-caramel">{selected ? 'Edycja kursu' : 'Nowy kurs'}</p><h2>{selected ? selected.title : 'Zbuduj kurs, do którego chce się wracać'}</h2></div><button className="academy-button studio-save" onClick={() => saveCourse.mutate()} disabled={!draft.title || saveCourse.isPending}><Save />{saveCourse.isPending ? 'Zapisywanie…' : selected ? 'Zapisz zmiany' : 'Utwórz kurs'}</button></div>
      <section className="studio-guide"><Lightbulb /><div><strong>Krótka recepta na dobry kurs</strong><p>Obiecaj konkretny efekt w tytule. W opisie powiedz dla kogo jest kurs, z czym kursantka wyjdzie i czego potrzebuje przed startem. Jedna lekcja = jedna praktyczna decyzja lub umiejętność.</p></div></section>
      {selected && selected.status === 'PUBLISHED' && !selected.isFree && !selected.isComingSoon && Number(selected.price) <= 0 && <section className="academy-readiness-warning" role="alert"><strong>Kurs nie jest gotowy do sprzedaży</strong><p>Uzupełnij cenę większą od zera albo oznacz kurs jako bezpłatny lub „w przygotowaniu”. Checkout pozostaje zablokowany.</p></section>}
      {selected && selected.modules?.flatMap((module:any) => module.lessons || []).some((lesson:any) => lesson.type === 'VIDEO' && !lesson.transcriptHtml) && <section className="academy-readiness-warning" role="alert"><strong>Brakuje transkrypcji filmów</strong><p>Uzupełnij transkrypcje w programie kursu. Są wymagane przed kolejną publikacją.</p></section>}
      <section className="studio-card"><div className="studio-card-head"><span><Sparkles />Karta kursu</span><small>To widzą kursantki przed zakupem</small></div><div className="studio-form-grid"><Field label="Tytuł kursu" hint="Konkretny rezultat"><input value={draft.title} onChange={e => setDraft({...draft, title:e.target.value})} /></Field><Field label="Poziom"><select value={draft.difficulty} onChange={e => setDraft({...draft, difficulty:e.target.value})}><option value="BEGINNER">Podstawowy</option><option value="INTERMEDIATE">Rozwój</option><option value="ADVANCED">Ekspercki</option></select></Field><Field label="Opis"><textarea value={draft.description} onChange={e => setDraft({...draft, description:e.target.value})} /></Field><div className="studio-split"><Field label="Czas (min)"><input type="number" min="0" value={draft.estimatedMinutes} onChange={e => setDraft({...draft, estimatedMinutes:Number(e.target.value)})} /></Field><Field label="Cena (PLN)" hint="Oddzielnie oznacz kurs bezpłatny"><input type="number" min="0" disabled={draft.isFree} value={draft.price} onChange={e => setDraft({...draft, price:Number(e.target.value)})} /></Field></div><div className="studio-split"><Field label="Dostęp (dni)" hint="Puste = bezterminowo"><input type="number" min="1" value={draft.accessDays ?? ''} onChange={e => setDraft({...draft, accessDays:e.target.value ? Number(e.target.value) : null})} /></Field><Field label="Status"><select value={draft.status} onChange={e => setDraft({...draft, status:e.target.value})}><option value="DRAFT">Szkic</option><option value="PUBLISHED">Opublikuj</option><option value="ARCHIVED">Archiwum</option></select></Field></div><div className="flex flex-wrap gap-4 text-sm"><label><input type="checkbox" checked={draft.isFree} onChange={e=>setDraft({...draft,isFree:e.target.checked})}/> Bezpłatny</label><label><input type="checkbox" checked={draft.isComingSoon} onChange={e=>setDraft({...draft,isComingSoon:e.target.checked})}/> W przygotowaniu</label><label><input type="checkbox" checked={draft.isFeatured} onChange={e=>setDraft({...draft,isFeatured:e.target.checked})}/> Wyróżniony</label><label><input type="checkbox" checked={draft.isBestseller} onChange={e=>setDraft({...draft,isBestseller:e.target.checked})}/> Bestseller</label></div><Field label="Tematy" hint="Po przecinku"><input value={draft.tagsText} onChange={e=>setDraft({...draft,tagsText:e.target.value})}/></Field><Field label="Pakiet / ścieżka"><input value={draft.bundleGroup} onChange={e=>setDraft({...draft,bundleGroup:e.target.value})}/></Field><Field label="Prowadząca"><input value={draft.instructorName} onChange={e=>setDraft({...draft,instructorName:e.target.value})}/></Field><Field label="Bio prowadzącej"><textarea value={draft.instructorBio} onChange={e=>setDraft({...draft,instructorBio:e.target.value})}/></Field><Field label="Okładka — adres obrazu"><input value={draft.thumbnailUrl} onChange={e => setDraft({...draft, thumbnailUrl:e.target.value})} /></Field></div></section>
      <section className="studio-card"><div className="studio-card-head"><span><Sparkles />Cena promocyjna</span><small>Wymagana do prawidłowego pokazania obniżki</small></div><div className="p-4"><Field label="Cena przed obniżką (PLN)" hint="Pozostaw puste, gdy kurs nie jest w promocji"><input type="number" min="0" step="0.01" value={draft.compareAtPrice ?? ''} onChange={e => setDraft({...draft, compareAtPrice:e.target.value ? Number(e.target.value) : null})} /></Field></div></section>
      <section className="studio-card"><div className="studio-card-head"><span><Sparkles />Pozycja w sklepie</span><small>Niższy numer wyświetla kurs wcześniej</small></div><div className="p-4"><Field label="Kolejność polecanych"><input type="number" min="0" value={draft.displayOrder} onChange={e=>setDraft({...draft,displayOrder:Number(e.target.value)})}/></Field></div></section>
      <section className="studio-card"><div className="studio-card-head"><span><Sparkles />Strona sprzedażowa</span><small>Argumenty, materiały próbne i FAQ kursu</small></div><div className="studio-form-grid"><Field label="Rezultaty nauki" hint="Jeden rezultat w linii"><textarea value={draft.learningOutcomesText} onChange={e=>setDraft({...draft,learningOutcomesText:e.target.value})}/></Field><Field label="Dla kogo"><textarea value={draft.targetAudience} onChange={e=>setDraft({...draft,targetAudience:e.target.value})}/></Field><Field label="Dla kogo nie jest"><textarea value={draft.notForAudience} onChange={e=>setDraft({...draft,notForAudience:e.target.value})}/></Field><Field label="Wymagania wstępne" hint="Jedno w linii"><textarea value={draft.prerequisitesText} onChange={e=>setDraft({...draft,prerequisitesText:e.target.value})}/></Field><Field label="ID zwiastuna Vimeo/YouTube"><input value={draft.trailerVideoId} onChange={e=>setDraft({...draft,trailerVideoId:e.target.value})}/></Field><Field label="Adres próbki PDF"><input value={draft.samplePdfUrl} onChange={e=>setDraft({...draft,samplePdfUrl:e.target.value})}/></Field><Field label="FAQ" hint="Pytanie|Odpowiedź — jedno w linii"><textarea value={draft.salesFaqsText} onChange={e=>setDraft({...draft,salesFaqsText:e.target.value})}/></Field></div></section>
      {selected && <section className="studio-card"><div className="studio-card-head"><span><Play />Bezpłatny podgląd</span><small>Wybierz jedną istniejącą lekcję widoczną przed zakupem</small></div><div className="p-4"><Field label="Lekcja podglądowa" hint="Po zmianie kliknij Zapisz kurs"><select value={draft.previewLessonId} onChange={event => setDraft({ ...draft, previewLessonId: event.target.value })}><option value="">Bez podglądu</option>{selected.modules?.flatMap((module: any) => module.lessons?.map((lesson: any) => <option key={lesson.id} value={lesson.id}>{module.title} — {lesson.title}</option>) ?? [])}</select></Field></div></section>}
      <section className="studio-card"><div className="studio-card-head"><span><Play />Podgląd strony kursu</span><div className="academy-preview-switch"><button className={previewMode==='desktop'?'active':''} onClick={()=>setPreviewMode('desktop')}>Desktop</button><button className={previewMode==='mobile'?'active':''} onClick={()=>setPreviewMode('mobile')}>Telefon</button></div></div><div className={`academy-course-live-preview ${previewMode}`}><article><div className="academy-course-cover">{draft.thumbnailUrl?<img src={draft.thumbnailUrl} alt=""/>:<div className="academy-course-placeholder"><BookOpen/></div>}</div><div><p className="academy-kicker">{draft.difficulty}</p><h2>{draft.title||'Tytuł kursu'}</h2><p>{draft.description||'Opis i obietnica kursu pojawią się tutaj.'}</p><strong>{draft.isFree?'Bezpłatny':draft.isComingSoon?'Wkrótce':`${Number(draft.price).toLocaleString('pl-PL')} zł`}</strong>{draft.compareAtPrice&&Number(draft.compareAtPrice)>Number(draft.price)&&<del>{Number(draft.compareAtPrice).toLocaleString('pl-PL')} zł</del>}<ul>{draft.learningOutcomesText.split('\n').filter(Boolean).slice(0,4).map(item=><li key={item}><CheckCircle2/>{item}</li>)}</ul><button type="button">{draft.isComingSoon?'Dołącz do listy':'Kup kurs'}</button></div></article></div></section>
      {selected && <Curriculum course={selected} addModule={addModule.mutate} addLesson={addLesson.mutate} updateLesson={updateLesson.mutate} addQuiz={addQuiz.mutate} addQuestion={addQuestion.mutate} />}
      {!selected && <div className="studio-next"><CheckCircle2 /><div><strong>Najpierw zapisz kartę kursu</strong><p>Po utworzeniu kursu dodasz moduły, lekcje, osadzone materiały i punkty kontrolne.</p></div></div>}
    </main>
  </div>;
}

function Curriculum({ course, addModule, addLesson, updateLesson, addQuiz, addQuestion }: { course: any; addModule: (title: string) => void; addLesson: (input: any) => void; updateLesson: (input: any) => void; addQuiz: (input: any) => void; addQuestion: (input: any) => void }) {
  const [moduleTitle, setModuleTitle] = useState(''); const [open, setOpen] = useState<string | null>(course.modules?.[0]?.id ?? null);
  return <section className="studio-card"><div className="studio-card-head"><span><Layers3 />Program kursu</span><small>Buduj kolejność: wprowadzenie → demonstracja → praktyka → sprawdzenie.</small></div><div className="studio-modules">{course.modules?.map((mod: any, index: number) => <div className="studio-module" key={mod.id}><button className="studio-module-head" onClick={() => setOpen(open === mod.id ? null : mod.id)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{mod.title}</strong><small>{mod.lessons?.length ?? 0} lekcji</small><ChevronRight className={open === mod.id ? 'open' : ''} /></button>{open === mod.id && <div className="studio-module-content">{mod.lessons?.map((lesson: any) => <div key={lesson.id}><div className="studio-lesson">{lesson.type === 'VIDEO' ? <Film /> : lesson.type === 'QUIZ' ? <CircleHelp /> : <FileText />}<span><strong>{lesson.title}</strong><small>{lesson.type === 'QUIZ' ? `${lesson.quiz?._count?.questions ?? 0} pytań kontrolnych` : lesson.type === 'TEXT' ? 'Tekst / materiał osadzony' : lesson.transcriptHtml ? 'Materiał wideo · transkrypcja gotowa' : 'Materiał wideo · brak transkrypcji'}</small></span></div>{lesson.type === 'VIDEO' && <TranscriptEditor lesson={lesson} updateLesson={updateLesson} />}{lesson.quiz && <QuestionComposer quiz={lesson.quiz} addQuestion={addQuestion} />}</div>)}<LessonComposer module={mod} addLesson={addLesson} addQuiz={addQuiz} /></div>}</div>)}</div><div className="studio-add-module"><input value={moduleTitle} onChange={e => setModuleTitle(e.target.value)} placeholder="np. Diagnostyka i przygotowanie" /><button onClick={() => { if(moduleTitle.trim()) { addModule(moduleTitle); setModuleTitle(''); } }}><Plus />Dodaj moduł</button></div></section>;
}

function TranscriptEditor({ lesson, updateLesson }: { lesson: any; updateLesson: (input: any) => void }) {
  const [transcriptHtml, setTranscriptHtml] = useState(lesson.transcriptHtml || '');
  return <details className="studio-transcript"><summary>Transkrypcja i dostępność</summary><textarea value={transcriptHtml} onChange={e => setTranscriptHtml(e.target.value)} placeholder="Wklej transkrypcję filmu. Możesz użyć prostego HTML: akapity, nagłówki i listy." /><button onClick={() => updateLesson({ lessonId: lesson.id, data: { transcriptHtml } })}>Zapisz transkrypcję</button></details>;
}

function QuestionComposer({ quiz, addQuestion }: { quiz: any; addQuestion: (input: any) => void }) {
  const [question, setQuestion] = useState(''); const [correct, setCorrect] = useState(''); const [wrong, setWrong] = useState('');
  return <div className="studio-question"><strong>Dodaj pytanie do punktu kontrolnego</strong><input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Pytanie sprawdzające jedną kluczową rzecz" /><div><input value={correct} onChange={e=>setCorrect(e.target.value)} placeholder="Poprawna odpowiedź" /><input value={wrong} onChange={e=>setWrong(e.target.value)} placeholder="Wiarygodna odpowiedź błędna" /></div><button onClick={() => { if(question && correct && wrong) { addQuestion({quizId:quiz.id,data:{text:question,type:'SINGLE_CHOICE',order:quiz._count?.questions ?? 0,options:[{text:correct,isCorrect:true},{text:wrong,isCorrect:false}]}}); setQuestion('');setCorrect('');setWrong('');} }}>Zapisz pytanie</button></div>;
}

function LessonComposer({ module, addLesson, addQuiz }: { module: any; addLesson: (input: any) => void; addQuiz: (input: any) => void }) {
  const [kind, setKind] = useState('VIDEO'); const [title, setTitle] = useState(''); const [source, setSource] = useState(''); const [transcriptHtml, setTranscriptHtml] = useState('');
  const add = () => { if (!title.trim()) return; const base = { title, slug: slugify(title), order: module.lessons?.length ?? 0, estimatedMinutes: 8, isRequired: true };
    if (kind === 'QUIZ') { addQuiz({ moduleId: module.id, title, order: base.order }); setTitle(''); return; }
    if (kind === 'VIDEO') addLesson({ moduleId: module.id, data: {...base, type:'VIDEO', videoProvider:'YOUTUBE', videoId: source.replace(/^.*(?:v=|youtu\.be\/)/, '').split(/[?&]/)[0], transcriptHtml} });
    if (kind === 'EMBED') { if (!/^https:\/\/(www\.youtube\.com|player\.vimeo\.com)\//.test(source)) return alert('Wklej bezpieczny adres osadzania YouTube lub Vimeo.'); addLesson({moduleId:module.id,data:{...base,type:'TEXT',contentHtml:embedHtml(source)}}); }
    if (kind === 'TEXT') addLesson({ moduleId: module.id, data: {...base, type:'TEXT',contentHtml:source} }); setTitle(''); setSource(''); setTranscriptHtml(''); };
  return <div className="studio-composer"><div className="studio-composer-title"><Plus />Dodaj element do tej sekcji</div><div className="studio-kind-tabs">{[['VIDEO','Film YouTube'],['EMBED','iframe / Vimeo'],['TEXT','Instrukcja'],['QUIZ','Punkt kontrolny']].map(([value,label]) => <button key={value} onClick={() => setKind(value)} className={kind===value?'selected':''}>{label}</button>)}</div><input value={title} onChange={e => setTitle(e.target.value)} placeholder={kind === 'QUIZ' ? 'np. Sprawdź wiedzę po sekcji' : 'Tytuł lekcji'} />{kind === 'TEXT' ? <RichTextEditor value={source} onChange={setSource} /> : kind !== 'QUIZ' && <textarea value={source} onChange={e => setSource(e.target.value)} placeholder={kind === 'VIDEO' ? 'Link do filmu YouTube' : 'Adres osadzania, np. https://player.vimeo.com/video/…'} />}{kind === 'VIDEO' && <textarea value={transcriptHtml} onChange={e => setTranscriptHtml(e.target.value)} placeholder="Transkrypcja filmu (wymagana przed publikacją dostępnego kursu)" />}{kind === 'QUIZ' && <p className="studio-hint">Po dodaniu punktu kontrolnego utwórz pytania w sekcji „Quizy” — w kolejnym kroku połączymy je bezpośrednio z tym miejscem.</p>}<button className="studio-add-lesson" onClick={add}><Plus />Dodaj {kind === 'QUIZ' ? 'punkt kontrolny' : 'lekcję'}</button></div>;
}

function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value;
  }, [value]);

  const sync = () => onChange(editorRef.current?.innerHTML ?? '');
  const command = (name: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(name, false, commandValue);
    sync();
  };
  const addLink = () => {
    const url = window.prompt('Wklej adres linku (https://...)');
    if (url?.trim()) command('createLink', url.trim());
  };
  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const image = event.target.files?.[0];
    event.target.value = '';
    if (!image) return;
    setError(''); setUploading(true);
    try {
      const { url } = await academyApi.adminUploadLessonImage(image);
      const alt = window.prompt('Opisz krótko, co przedstawia obraz. Pozostaw puste tylko dla dekoracji.', '') ?? '';
      const img = document.createElement('img'); img.src = url; img.alt = alt.trim(); img.loading = 'lazy';
      command('insertHTML', `<figure>${img.outerHTML}</figure><p><br></p>`);
    } catch {
      setError('Nie udało się wgrać obrazu. Wybierz plik graficzny do 5 MB.');
    } finally { setUploading(false); }
  };
  const tool = (label: string, icon: React.ReactNode, action: () => void) => <button type="button" title={label} aria-label={label} onMouseDown={event => event.preventDefault()} onClick={action}>{icon}</button>;

  return <div className="rich-editor">
    <div className="rich-editor-toolbar">
      {tool('Nagłówek H1', <Heading1 />, () => command('formatBlock', 'h1'))}
      {tool('Nagłówek H2', <Heading2 />, () => command('formatBlock', 'h2'))}
      {tool('Pogrubienie', <Bold />, () => command('bold'))}
      {tool('Kursywa', <Italic />, () => command('italic'))}
      {tool('Podkreślenie', <Underline />, () => command('underline'))}
      {tool('Lista punktowana', <List />, () => command('insertUnorderedList'))}
      {tool('Lista numerowana', <ListOrdered />, () => command('insertOrderedList'))}
      {tool('Dodaj link', <Link2 />, addLink)}
      <span className="rich-editor-divider" />
      <button type="button" className="rich-editor-image" onClick={() => fileRef.current?.click()} disabled={uploading}><ImagePlus />{uploading ? 'Wgrywanie…' : 'Dodaj obraz'}</button>
      <input ref={fileRef} type="file" accept="image/*" onChange={uploadImage} hidden />
    </div>
    <div ref={editorRef} className="rich-editor-body" contentEditable suppressContentEditableWarning data-placeholder="Napisz instrukcję. Zaznacz tekst, aby użyć formatowania." onInput={sync} onPaste={event => { event.preventDefault(); document.execCommand('insertText', false, event.clipboardData.getData('text/plain')); sync(); }} />
    <p className="rich-editor-hint">Wstawione obrazy są automatycznie optymalizowane i zapisywane jako WebP.</p>
    {error && <p className="rich-editor-error">{error}</p>}
  </div>;
}
function Field({ label, hint, children }: { label:string; hint?:string; children:React.ReactNode }) { return <label className="studio-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
