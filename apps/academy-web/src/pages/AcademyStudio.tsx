import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { Bold, BookOpen, CheckCircle2, ChevronRight, CircleHelp, FileText, Film, Heading1, Heading2, ImagePlus, Italic, Layers3, Lightbulb, Link2, List, ListOrdered, Plus, Save, Sparkles, Underline } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const slugify = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const embedHtml = (url: string) => `<iframe src="${url}" title="Materiał szkoleniowy" loading="lazy" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px"></iframe>`;

export function AcademyStudio() {
  const { user } = useAuth();
  const client = useQueryClient();
  const { data: courses = [], isLoading } = useQuery({ queryKey: ['studio', 'courses'], queryFn: academyApi.adminGetCourses });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: '', description: '', difficulty: 'BEGINNER', estimatedMinutes: 60, thumbnailUrl: '', status: 'DRAFT' });
  const selected = useMemo(() => (courses as any[]).find(c => c.id === selectedId), [courses, selectedId]);
  const refresh = () => client.invalidateQueries({ queryKey: ['studio', 'courses'] });
  const saveCourse = useMutation({ mutationFn: () => selected ? academyApi.adminUpdateCourse(selected.id, { ...draft, slug: selected.slug, tags: selected.tags }) : academyApi.adminCreateCourse({ ...draft, slug: slugify(draft.title), tags: [] }), onSuccess: (course: any) => { setSelectedId(course.id ?? selectedId); refresh(); } });
  const addModule = useMutation({ mutationFn: (title: string) => academyApi.adminCreateModule(selected!.id, { title, order: selected?.modules?.length ?? 0 }), onSuccess: refresh });
  const addLesson = useMutation({ mutationFn: ({ moduleId, data }: any) => academyApi.adminCreateLesson(moduleId, data), onSuccess: refresh });
  const addQuiz = useMutation({ mutationFn: (data: any) => academyApi.adminCreateCheckpoint(data.moduleId, data), onSuccess: refresh });
  const addQuestion = useMutation({ mutationFn: ({ quizId, data }: any) => academyApi.adminCreateQuestion(quizId, data), onSuccess: refresh });

  const choose = (course: any) => { setSelectedId(course.id); setDraft({ title: course.title, description: course.description, difficulty: course.difficulty, estimatedMinutes: course.estimatedMinutes, thumbnailUrl: course.thumbnailUrl ?? '', status: course.status }); };
  const newCourse = () => { setSelectedId(null); setDraft({ title: '', description: '', difficulty: 'BEGINNER', estimatedMinutes: 60, thumbnailUrl: '', status: 'DRAFT' }); };
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  if (isLoading) return <div className="academy-loading">Ładujemy studio Akademii…</div>;

  return <div className="studio-page">
    <aside className="studio-sidebar"><div><p className="academy-kicker">Studio Akademii</p><h1>Twórz z intencją</h1><p>Od szkicu po publikację — bez opuszczania Akademii.</p></div><button className="studio-new" onClick={newCourse}><Plus />Nowy kurs</button><div className="studio-course-list">{(courses as any[]).map(course => <button key={course.id} className={selectedId === course.id ? 'selected' : ''} onClick={() => choose(course)}><span className="studio-course-icon"><BookOpen /></span><span><strong>{course.title}</strong><small>{course.status === 'PUBLISHED' ? 'Opublikowany' : 'Szkic'} · {course.modules?.length ?? 0} modułów</small></span><ChevronRight /></button>)}</div></aside>
    <main className="studio-main"><div className="studio-top"><div><p className="academy-kicker text-caramel">{selected ? 'Edycja kursu' : 'Nowy kurs'}</p><h2>{selected ? selected.title : 'Zbuduj kurs, do którego chce się wracać'}</h2></div><button className="academy-button studio-save" onClick={() => saveCourse.mutate()} disabled={!draft.title || saveCourse.isPending}><Save />{saveCourse.isPending ? 'Zapisywanie…' : selected ? 'Zapisz zmiany' : 'Utwórz kurs'}</button></div>
      <section className="studio-guide"><Lightbulb /><div><strong>Krótka recepta na dobry kurs</strong><p>Obiecaj konkretny efekt w tytule. W opisie powiedz dla kogo jest kurs, z czym kursantka wyjdzie i czego potrzebuje przed startem. Jedna lekcja = jedna praktyczna decyzja lub umiejętność.</p></div></section>
      <section className="studio-card"><div className="studio-card-head"><span><Sparkles />Karta kursu</span><small>To widzą kursantki przed rozpoczęciem</small></div><div className="studio-form-grid"><Field label="Tytuł kursu" hint="Konkretny rezultat, np. „Konsultacja skóry krok po kroku”"><input value={draft.title} onChange={e => setDraft({...draft, title:e.target.value})} placeholder="Co kursantka opanuje?" /></Field><Field label="Poziom"><select value={draft.difficulty} onChange={e => setDraft({...draft, difficulty:e.target.value})}><option value="BEGINNER">Podstawowy</option><option value="INTERMEDIATE">Rozwój</option><option value="ADVANCED">Ekspercki</option></select></Field><Field label="Opis" hint="2–4 zdania: dla kogo, efekt, format."><textarea value={draft.description} onChange={e => setDraft({...draft, description:e.target.value})} placeholder="Po tym kursie kursantka…" /></Field><div className="studio-split"><Field label="Czas (min)"><input type="number" min="0" value={draft.estimatedMinutes} onChange={e => setDraft({...draft, estimatedMinutes:Number(e.target.value)})} /></Field><Field label="Status"><select value={draft.status} onChange={e => setDraft({...draft, status:e.target.value})}><option value="DRAFT">Szkic — niewidoczny</option><option value="PUBLISHED">Opublikuj</option><option value="ARCHIVED">Archiwum</option></select></Field></div><Field label="Okładka — adres obrazu" hint="Najlepiej poziome zdjęcie 16:9, bez drobnego tekstu."><input value={draft.thumbnailUrl} onChange={e => setDraft({...draft, thumbnailUrl:e.target.value})} placeholder="https://…" /></Field></div></section>
      {selected && <Curriculum course={selected} addModule={addModule.mutate} addLesson={addLesson.mutate} addQuiz={addQuiz.mutate} addQuestion={addQuestion.mutate} />}
      {!selected && <div className="studio-next"><CheckCircle2 /><div><strong>Najpierw zapisz kartę kursu</strong><p>Po utworzeniu kursu dodasz moduły, lekcje, osadzone materiały i punkty kontrolne.</p></div></div>}
    </main>
  </div>;
}

function Curriculum({ course, addModule, addLesson, addQuiz, addQuestion }: { course: any; addModule: (title: string) => void; addLesson: (input: any) => void; addQuiz: (input: any) => void; addQuestion: (input: any) => void }) {
  const [moduleTitle, setModuleTitle] = useState(''); const [open, setOpen] = useState<string | null>(course.modules?.[0]?.id ?? null);
  return <section className="studio-card"><div className="studio-card-head"><span><Layers3 />Program kursu</span><small>Buduj kolejność: wprowadzenie → demonstracja → praktyka → sprawdzenie.</small></div><div className="studio-modules">{course.modules?.map((mod: any, index: number) => <div className="studio-module" key={mod.id}><button className="studio-module-head" onClick={() => setOpen(open === mod.id ? null : mod.id)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{mod.title}</strong><small>{mod.lessons?.length ?? 0} lekcji</small><ChevronRight className={open === mod.id ? 'open' : ''} /></button>{open === mod.id && <div className="studio-module-content">{mod.lessons?.map((lesson: any) => <div key={lesson.id}><div className="studio-lesson">{lesson.type === 'VIDEO' ? <Film /> : lesson.type === 'QUIZ' ? <CircleHelp /> : <FileText />}<span><strong>{lesson.title}</strong><small>{lesson.type === 'QUIZ' ? `${lesson.quiz?._count?.questions ?? 0} pytań kontrolnych` : lesson.type === 'TEXT' ? 'Tekst / materiał osadzony' : 'Materiał wideo'}</small></span></div>{lesson.quiz && <QuestionComposer quiz={lesson.quiz} addQuestion={addQuestion} />}</div>)}<LessonComposer module={mod} addLesson={addLesson} addQuiz={addQuiz} /></div>}</div>)}</div><div className="studio-add-module"><input value={moduleTitle} onChange={e => setModuleTitle(e.target.value)} placeholder="np. Diagnostyka i przygotowanie" /><button onClick={() => { if(moduleTitle.trim()) { addModule(moduleTitle); setModuleTitle(''); } }}><Plus />Dodaj moduł</button></div></section>;
}

function QuestionComposer({ quiz, addQuestion }: { quiz: any; addQuestion: (input: any) => void }) {
  const [question, setQuestion] = useState(''); const [correct, setCorrect] = useState(''); const [wrong, setWrong] = useState('');
  return <div className="studio-question"><strong>Dodaj pytanie do punktu kontrolnego</strong><input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Pytanie sprawdzające jedną kluczową rzecz" /><div><input value={correct} onChange={e=>setCorrect(e.target.value)} placeholder="Poprawna odpowiedź" /><input value={wrong} onChange={e=>setWrong(e.target.value)} placeholder="Wiarygodna odpowiedź błędna" /></div><button onClick={() => { if(question && correct && wrong) { addQuestion({quizId:quiz.id,data:{text:question,type:'SINGLE_CHOICE',order:quiz._count?.questions ?? 0,options:[{text:correct,isCorrect:true},{text:wrong,isCorrect:false}]}}); setQuestion('');setCorrect('');setWrong('');} }}>Zapisz pytanie</button></div>;
}

function LessonComposer({ module, addLesson, addQuiz }: { module: any; addLesson: (input: any) => void; addQuiz: (input: any) => void }) {
  const [kind, setKind] = useState('VIDEO'); const [title, setTitle] = useState(''); const [source, setSource] = useState('');
  const add = () => { if (!title.trim()) return; const base = { title, slug: slugify(title), order: module.lessons?.length ?? 0, estimatedMinutes: 8, isRequired: true };
    if (kind === 'QUIZ') { addQuiz({ moduleId: module.id, title, order: base.order }); setTitle(''); return; }
    if (kind === 'VIDEO') addLesson({ moduleId: module.id, data: {...base, type:'VIDEO', videoProvider:'YOUTUBE', videoId: source.replace(/^.*(?:v=|youtu\.be\/)/, '').split(/[?&]/)[0]} });
    if (kind === 'EMBED') { if (!/^https:\/\/(www\.youtube\.com|player\.vimeo\.com)\//.test(source)) return alert('Wklej bezpieczny adres osadzania YouTube lub Vimeo.'); addLesson({moduleId:module.id,data:{...base,type:'TEXT',contentHtml:embedHtml(source)}}); }
    if (kind === 'TEXT') addLesson({ moduleId: module.id, data: {...base, type:'TEXT',contentHtml:source} }); setTitle(''); setSource(''); };
  return <div className="studio-composer"><div className="studio-composer-title"><Plus />Dodaj element do tej sekcji</div><div className="studio-kind-tabs">{[['VIDEO','Film YouTube'],['EMBED','iframe / Vimeo'],['TEXT','Instrukcja'],['QUIZ','Punkt kontrolny']].map(([value,label]) => <button key={value} onClick={() => setKind(value)} className={kind===value?'selected':''}>{label}</button>)}</div><input value={title} onChange={e => setTitle(e.target.value)} placeholder={kind === 'QUIZ' ? 'np. Sprawdź wiedzę po sekcji' : 'Tytuł lekcji'} />{kind === 'TEXT' ? <RichTextEditor value={source} onChange={setSource} /> : kind !== 'QUIZ' && <textarea value={source} onChange={e => setSource(e.target.value)} placeholder={kind === 'VIDEO' ? 'Link do filmu YouTube' : 'Adres osadzania, np. https://player.vimeo.com/video/…'} />}{kind === 'QUIZ' && <p className="studio-hint">Po dodaniu punktu kontrolnego utwórz pytania w sekcji „Quizy” — w kolejnym kroku połączymy je bezpośrednio z tym miejscem.</p>}<button className="studio-add-lesson" onClick={add}><Plus />Dodaj {kind === 'QUIZ' ? 'punkt kontrolny' : 'lekcję'}</button></div>;
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
      command('insertHTML', `<figure><img src="${url}" alt="" loading="lazy" /></figure><p><br></p>`);
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
