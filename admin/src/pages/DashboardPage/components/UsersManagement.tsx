import { useUsers } from '../hooks/useUsers';
import { Pagination } from './Pagination';
import './UsersManagement.scss';

export const UsersManagement = () => {
  const { users, pagination, isLoading, error, page, setPage } = useUsers();

  if (isLoading) return <div className="users-management__loading">Загрузка...</div>;
  if (error) return <div className="users-management__error">Ошибка загрузки пользователей</div>;

  return (
    <div className="users-management">
      <h2 className="users-management__title">Управление пользователями</h2>
      
      <div className="users-management__stats">
        <p>Всего пользователей: {pagination?.total || 0}</p>
        <p>Показано: {users.length} из {pagination?.total || 0}</p>
      </div>

      <div className="users-management__table">
        <table>
          <thead>
            <tr>
              <th>UUID</th>
              <th>Логин</th>
              <th>Дата создания</th>
              <th>Дата обновления</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td className="users-management__uuid" title={user.id}>
                  {user.id}
                </td>
                <td>{user.login}</td>
                <td>{new Date(user.createdAt).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</td>
                <td>{new Date(user.updatedAt).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
