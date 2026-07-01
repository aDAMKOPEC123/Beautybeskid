import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const statusLabel: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Szkic', color: 'bg-muted text-muted-foreground' },
  PUBLISHED: { label: 'Opublikowany', color: 'bg-green-100 text-green-700' },
  ARCHIVED: { label: 'Zarchiwizowany', color: 'bg-orange-100 text-orange-700' },
};

export function AdminCourseList() {
  const queryClient = useQueryClient();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['admin', 'academy', 'courses'],
    queryFn: academyApi.adminGetCourses,
  });

  const deleteMutation = useMutation({
    mutationFn: academyApi.adminDeleteCourse,
    onSuccess: () => {
      toast.success('Kurs usunięty');
      queryClient.invalidateQueries({ queryKey: ['admin', 'academy', 'courses'] });
    },
    onError: () => toast.error('Błąd podczas usuwania kursu'),
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: string }) =>
      academyApi.adminUpdateCourse(id, {
        status: currentStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'academy', 'courses'] });
    },
  });

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Usunąć kurs "${title}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold">Kursy ({courses.length})</h2>
        <Link
          to="/admin/akademia/kurs/nowy"
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nowy kurs
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse"/>)}
        </div>
      ) : courses.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">Brak kursów. Dodaj pierwszy kurs.</p>
      ) : (
        <div className="space-y-2">
          {courses.map((course: any) => {
            const { label, color } = statusLabel[course.status] ?? statusLabel.DRAFT;
            return (
              <div key={course.id} className="flex items-center gap-4 bg-card rounded-lg border p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{course.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {course.modules?.length ?? 0} modułów ·{' '}
                    {course.modules?.reduce((acc: number, m: any) => acc + (m._count?.lessons ?? 0), 0) ?? 0} lekcji ·{' '}
                    {course._count?.progress ?? 0} kursantów
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => togglePublishMutation.mutate({ id: course.id, currentStatus: course.status })}
                    title={course.status === 'PUBLISHED' ? 'Cofnij publikację' : 'Opublikuj'}
                    className="p-1.5 rounded-md hover:bg-accent transition-colors"
                  >
                    {course.status === 'PUBLISHED' ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                  <Link
                    to={`/admin/akademia/kurs/${course.id}`}
                    className="p-1.5 rounded-md hover:bg-accent transition-colors"
                  >
                    <Edit2 className="w-4 h-4"/>
                  </Link>
                  <button
                    onClick={() => handleDelete(course.id, course.title)}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
