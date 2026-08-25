import { useEffect, useState } from 'react';
import { Course } from '@/api/courses';

interface CourseModalProps {
  course: Course | null;
  isSaving: boolean;
  uploadProgress: number;
  onClose: () => void;
  onSave: (course: { title: string; topic: string; description: string; video?: File }) => void;
}

export const CourseModal = ({
  course,
  isSaving,
  uploadProgress,
  onClose,
  onSave,
}: CourseModalProps) => {
  const [title, setTitle] = useState(course?.title || '');
  const [topic, setTopic] = useState(course?.topic || '');
  const [description, setDescription] = useState(course?.description || '');
  const [video, setVideo] = useState<File | undefined>();
  const [videoPreview, setVideoPreview] = useState(course?.videoUrl || '');

  useEffect(() => {
    return () => {
      if (videoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [videoPreview]);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!course && !video) return;
    onSave({ title, topic, description, video });
  };

  return (
    <div className="modal-overlay" onClick={isSaving ? undefined : onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal__title">{course ? 'Редактировать' : 'Добавить'} курс</h2>

        <form onSubmit={handleSubmit} className="modal__form">
          <div className="modal__field">
            <label>Заголовок</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              disabled={isSaving}
            />
          </div>

          <div className="modal__field">
            <label>Тематика</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Например: английский язык"
              required
              disabled={isSaving}
            />
          </div>

          <div className="modal__field">
            <label>Описание</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={6}
              required
              disabled={isSaving}
            />
          </div>

          <div className="modal__field">
            <label>{course ? 'Видео (оставьте пустым, чтобы не менять)' : 'Видео'}</label>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv,.m4v"
              onChange={handleVideoChange}
              className="modal__file"
              required={!course}
              disabled={isSaving}
            />
            {videoPreview && (
              <video src={videoPreview} controls className="modal__preview modal__preview--video" />
            )}
          </div>

          {isSaving && (
            <div className="modal__progress">
              <div className="modal__progress-bar" style={{ width: `${uploadProgress}%` }} />
              <span>Загрузка{uploadProgress > 0 ? `: ${uploadProgress}%` : '...'}</span>
            </div>
          )}

          <div className="modal__actions">
            <button type="button" onClick={onClose} className="modal__cancel" disabled={isSaving}>
              Отмена
            </button>
            <button type="submit" className="modal__submit" disabled={isSaving || (!course && !video)}>
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
