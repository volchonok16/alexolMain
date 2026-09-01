import { useUsers } from '../hooks/useUsers';
import { Pagination } from './Pagination';
import { resolveApiAssetUrl } from '@/api/client';
import './UsersManagement.scss';

const formatDate = (value: string) =>
  new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const StudentsManagement = () => {
  const { users, pagination, isLoading, error, page, setPage } = useUsers();
  const students = users.filter(user => user.role === 'user');

  if (isLoading) return <div className="dashboard__container">Загрузка...</div>;
  if (error) return <div className="dashboard__container">Ошибка загрузки учеников</div>;

  return (
    <div className="dashboard__container">
      <div className="users-management__stats">
        <p>Всего учеников: {students.length}</p>
        <p>На странице: {students.length}</p>
      </div>

      {students.length === 0 ? (
        <div className="dashboard__empty">Учеников пока нет</div>
      ) : (
        <div className="dashboard__table">
          <table>
            <thead>
              <tr>
                <th>Фото</th>
                <th>Имя</th>
                <th>Почта</th>
                <th>Должность</th>
                <th>Регистрация</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id}>
                  <td>
                    {student.photo ? (
                      <img
                        src={resolveApiAssetUrl(student.photo)}
                        alt={student.name}
                        className="users-management__photo"
                      />
                    ) : (
                      <span className="users-management__photo users-management__photo--empty">
                        {(student.email || student.name).slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td>{student.name}</td>
                  <td>{student.email || student.login}</td>
                  <td>{student.jobTitle || '—'}</td>
                  <td>{formatDate(student.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
};
