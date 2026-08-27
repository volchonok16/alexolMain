import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPayload, usersApi } from '@/api/users';
import { useAuth } from '@/contexts/AuthContext';
import { UserModal } from './UserModal';

export const SettingsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: me, isLoading, error } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: usersApi.getMe,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UserPayload) => {
      if (!me) throw new Error('User not loaded');
      return usersApi.update(me.id, data);
    },
    onSuccess: async () => {
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSaveError(null);
    },
  });

  const handleSave = async (payload: UserPayload) => {
    setSaveError(null);
    try {
      await updateMutation.mutateAsync(payload);
    } catch (err) {
      const apiError =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (err as { response: { data: { error: string } } }).response.data.error
          : 'Не удалось сохранить настройки';
      setSaveError(apiError);
    }
  };

  if (isLoading) return <div className="dashboard__container">Загрузка...</div>;
  if (error || !me) return <div className="dashboard__container">Не удалось загрузить профиль</div>;

  return (
    <div className="dashboard__container">
      {saveError && <div className="dashboard__error">{saveError}</div>}
      <UserModal
        key={me.id + (me.updatedAt || '')}
        embedded
        lockRole
        user={me}
        title="Мои настройки"
        cancelLabel="Назад"
        isSaving={updateMutation.isPending}
        onClose={() => navigate(-1)}
        onSave={handleSave}
      />
    </div>
  );
};
