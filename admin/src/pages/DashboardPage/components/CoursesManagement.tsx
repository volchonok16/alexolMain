import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Course } from '@/api/courses';
import { useCourses } from '../hooks/useCourses';
import { CourseModal } from './CourseModal';

export const CoursesManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const {
    courses,
    isLoading,
    error,
    uploadProgress,
    isSaving,
    createCourse,
    updateCourse,
    deleteCourse,
  } = useCourses();

  const handleDelete = (id: string) => {
    if (confirm('Удалить курс?')) {
      deleteCourse(id);
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingCourse(null);
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (payload: { title: string; topic: string; description: string; video?: File }) => {
    setSaveError(null);
    try {
      if (editingCourse) {
        await updateCourse({ id: editingCourse.id, data: payload });
      } else {
        await createCourse(payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      const apiError =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (err as { response: { data: { error: string } } }).response.data.error
          : err instanceof Error
            ? err.message
            : 'Не удалось сохранить курс';
      setSaveError(apiError);
    }
  };

  if (isLoading) return <div className="dashboard__container">Загрузка...</div>;
  if (error) return <div className="dashboard__container">Ошибка загрузки курсов</div>;

  return (
    <div className="dashboard__container">
      <div className="dashboard__actions">
        <button onClick={handleAdd} className="dashboard__add">
          <Plus />
          Добавить курс
        </button>
      </div>

      {saveError && <div className="dashboard__error">{saveError}</div>}

      {courses.length === 0 ? (
        <div className="dashboard__empty">Курсов пока нет</div>
      ) : (
        <div className="dashboard__table">
          <table>
            <thead>
              <tr>
                <th>Заголовок</th>
                <th>Тематика</th>
                <th>Описание</th>
                <th>Дата</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(course => (
                <tr key={course.id}>
                  <td data-label="Заголовок">{course.title}</td>
                  <td data-label="Тематика">{course.topic || '-'}</td>
                  <td className="dashboard__description" data-label="Описание">{course.description}</td>
                  <td data-label="Дата">
                    {course.createdAt
                      ? new Date(course.createdAt).toLocaleDateString('ru-RU')
                      : '-'}
                  </td>
                  <td data-label="Действия">
                    <div className="dashboard__row-actions">
                      <button onClick={() => handleEdit(course)} className="dashboard__edit">
                        <Edit2 />
                      </button>
                      <button onClick={() => handleDelete(course.id)} className="dashboard__delete">
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <CourseModal
          course={editingCourse}
          isSaving={isSaving}
          uploadProgress={uploadProgress}
          onClose={() => {
            if (!isSaving) setIsModalOpen(false);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};
