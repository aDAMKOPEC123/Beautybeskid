import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2">
      <button {...attributes} {...listeners} className="mt-2 p-1 rounded hover:bg-accent cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-muted-foreground"/>
      </button>
      <div className="flex-1">{children}</div>
    </div>
  );
}

interface CourseForm {
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  estimatedMinutes: number;
  tags: string;
  status: string;
}

export function AdminCourseEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'nowy';

  const [form, setForm] = useState<CourseForm>({
    title: '', slug: '', description: '', difficulty: 'BEGINNER', estimatedMinutes: 60, tags: '', status: 'DRAFT',
  });

  const [modules, setModules] = useState<any[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const { data: course } = useQuery({
    queryKey: ['admin', 'academy', 'course-edit', id],
    queryFn: () => academyApi.adminGetCourses().then((courses) => courses.find((c: any) => c.id === id)),
    enabled: !isNew && !!id,
  });

  useEffect(() => {
    if (course) {
      setForm({
        title: course.title ?? '',
        slug: course.slug ?? '',
        description: course.description ?? '',
        difficulty: course.difficulty ?? 'BEGINNER',
        estimatedMinutes: course.estimatedMinutes ?? 60,
        tags: (course.tags ?? []).join(', '),
        status: course.status ?? 'DRAFT',
      });
      setModules(course.modules ?? []);
    }
  }, [course]);

  const createCourseMutation = useMutation({
    mutationFn: () =>
      academyApi.adminCreateCourse({
        ...form,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      }),
    onSuccess: (created: any) => {
      toast.success('Kurs utworzony');
      queryClient.invalidateQueries({ queryKey: ['admin', 'academy', 'courses'] });
      navigate(`/admin/akademia/kurs/${created.id}`);
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: () =>
      academyApi.adminUpdateCourse(id!, {
        ...form,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      toast.success('Kurs zaktualizowany');
      queryClient.invalidateQueries({ queryKey: ['admin', 'academy', 'courses'] });
    },
  });

  const createModuleMutation = useMutation({
    mutationFn: (title: string) => academyApi.adminCreateModule(id!, { title, order: modules.length }),
    onSuccess: (mod) => {
      setModules((prev) => [...prev, { ...mod, lessons: [] }]);
      queryClient.invalidateQueries({ queryKey: ['admin', 'academy', 'courses'] });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: academyApi.adminDeleteModule,
    onSuccess: (_, moduleId) => {
      setModules((prev) => prev.filter((m) => m.id !== moduleId));
    },
  });

  const createLessonMutation = useMutation({
    mutationFn: ({ moduleId, data }: { moduleId: string; data: any }) =>
      academyApi.adminCreateLesson(moduleId, data),
    onSuccess: (lesson, { moduleId }) => {
      setModules((prev) =>
        prev.map((m) => m.id === moduleId ? { ...m, lessons: [...(m.lessons ?? []), lesson] } : m)
      );
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: academyApi.adminDeleteLesson,
    onSuccess: (_, lessonId) => {
      setModules((prev) =>
        prev.map((m) => ({ ...m, lessons: (m.lessons ?? []).filter((l: any) => l.id !== lessonId) }))
      );
    },
  });

  const handleModuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setModules((items) => {
      const oldIdx = items.findIndex((m) => m.id === active.id);
      const newIdx = items.findIndex((m) => m.id === over.id);
      const reordered = arrayMove(items, oldIdx, newIdx);
      academyApi.adminReorderModules(id!, reordered.map((m) => m.id));
      return reordered;
    });
  };

  const autoSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newLessonForms, setNewLessonForms] = useState<Record<string, { title: string; type: string; videoId: string }>>({});

  const handleSave = () => {
    if (!form.title.trim()) return toast.error('Tytuł jest wymagany');
    if (isNew) createCourseMutation.mutate();
    else updateCourseMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{isNew ? 'Nowy kurs' : 'Edytuj kurs'}</h2>
        <button
          onClick={handleSave}
          disabled={createCourseMutation.isPending || updateCourseMutation.isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isNew ? 'Utwórz kurs' : 'Zapisz zmiany'}
        </button>
      </div>

      {/* Course form */}
      <div className="bg-card rounded-lg border p-4 space-y-4">
        <h3 className="font-medium text-sm">Informacje o kursie</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tytuł *</label>
            <input value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value, slug: isNew ? autoSlug(e.target.value) : p.slug }))}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"/>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Slug (URL)</label>
            <input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"/>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Opis</label>
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3} className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"/>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Poziom trudności</label>
            <select value={form.difficulty} onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none">
              <option value="BEGINNER">Początkujący</option>
              <option value="INTERMEDIATE">Średniozaawansowany</option>
              <option value="ADVANCED">Zaawansowany</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Szacowany czas (min)</label>
            <input type="number" min={0} value={form.estimatedMinutes}
              onChange={(e) => setForm((p) => ({ ...p, estimatedMinutes: parseInt(e.target.value) || 0 }))}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"/>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tagi (oddzielone przecinkami)</label>
            <input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              placeholder="np. pielęgnacja, twarz, hydratacja"
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"/>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
            <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none">
              <option value="DRAFT">Szkic</option>
              <option value="PUBLISHED">Opublikowany</option>
              <option value="ARCHIVED">Zarchiwizowany</option>
            </select>
          </div>
        </div>
      </div>

      {/* Modules (only show if course exists) */}
      {!isNew && (
        <div className="space-y-4">
          <h3 className="font-medium text-sm">Moduły i lekcje</h3>
          <DndContext collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
            <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {modules.map((mod) => {
                  const isOpen = expandedModules.has(mod.id);
                  const lessonForm = newLessonForms[mod.id] ?? { title: '', type: 'VIDEO', videoId: '' };
                  return (
                    <SortableItem key={mod.id} id={mod.id}>
                      <div className="bg-card rounded-lg border overflow-hidden">
                        <div className="flex items-center gap-2 p-3">
                          <span className="font-medium text-sm flex-1">{mod.title}</span>
                          <span className="text-xs text-muted-foreground">{mod.lessons?.length ?? 0} lekcji</span>
                          <button onClick={() => setExpandedModules((prev) => { const n = new Set(prev); if(n.has(mod.id)) n.delete(mod.id); else n.add(mod.id); return n; })}
                            className="p-1 rounded hover:bg-accent">
                            {isOpen ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                          </button>
                          <button onClick={() => window.confirm(`Usunąć moduł "${mod.title}"?`) && deleteModuleMutation.mutate(mod.id)}
                            className="p-1 rounded hover:bg-destructive/10 text-destructive">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </div>
                        {isOpen && (
                          <div className="border-t p-3 space-y-3">
                            {mod.lessons?.map((lesson: any) => (
                              <div key={lesson.id} className="flex items-center gap-2 text-sm">
                                <span className="flex-1">{lesson.title}</span>
                                <span className="text-xs text-muted-foreground uppercase">{lesson.type}</span>
                                <button onClick={() => deleteLessonMutation.mutate(lesson.id)}
                                  className="p-1 rounded hover:bg-destructive/10 text-destructive">
                                  <Trash2 className="w-3.5 h-3.5"/>
                                </button>
                              </div>
                            ))}
                            <div className="space-y-2 pt-2 border-t">
                              <p className="text-xs font-medium text-muted-foreground">Nowa lekcja</p>
                              <div className="flex gap-2">
                                <input value={lessonForm.title}
                                  onChange={(e) => setNewLessonForms((p) => ({ ...p, [mod.id]: { ...lessonForm, title: e.target.value } }))}
                                  placeholder="Tytuł lekcji" className="flex-1 border rounded px-2 py-1.5 text-sm focus:outline-none"/>
                                <select value={lessonForm.type}
                                  onChange={(e) => setNewLessonForms((p) => ({ ...p, [mod.id]: { ...lessonForm, type: e.target.value } }))}
                                  className="border rounded px-2 py-1.5 text-sm focus:outline-none">
                                  <option value="VIDEO">Video</option>
                                  <option value="TEXT">Tekst</option>
                                  <option value="QUIZ">Quiz</option>
                                </select>
                              </div>
                              {lessonForm.type === 'VIDEO' && (
                                <input value={lessonForm.videoId}
                                  onChange={(e) => setNewLessonForms((p) => ({ ...p, [mod.id]: { ...lessonForm, videoId: e.target.value } }))}
                                  placeholder="YouTube Video ID" className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none"/>
                              )}
                              <button
                                onClick={() => {
                                  if (!lessonForm.title.trim()) return;
                                  createLessonMutation.mutate({
                                    moduleId: mod.id,
                                    data: {
                                      title: lessonForm.title,
                                      slug: lessonForm.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                                      type: lessonForm.type,
                                      videoProvider: lessonForm.type === 'VIDEO' ? 'YOUTUBE' : undefined,
                                      videoId: lessonForm.type === 'VIDEO' ? lessonForm.videoId : undefined,
                                      order: mod.lessons?.length ?? 0,
                                    },
                                  });
                                  setNewLessonForms((p) => ({ ...p, [mod.id]: { title: '', type: 'VIDEO', videoId: '' } }));
                                }}
                                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors">
                                Dodaj lekcję
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </SortableItem>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

          <div className="flex gap-2">
            <input value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)}
              placeholder="Nazwa nowego modułu" className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"/>
            <button
              onClick={() => { if (newModuleTitle.trim()) { createModuleMutation.mutate(newModuleTitle); setNewModuleTitle(''); }}}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4"/> Dodaj moduł
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
