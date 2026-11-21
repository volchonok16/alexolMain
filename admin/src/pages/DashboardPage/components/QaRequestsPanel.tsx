import { FormEvent, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QaConversation, QaConversationListItem, qaApi } from '@/api/qa';
import { Pagination } from './Pagination';

const apiError = (err: unknown, fallback: string) => {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
  ) {
    return (err as { response: { data: { error: string } } }).response.data.error;
  }
  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'ECONNABORTED') {
    return 'Ответ модели ещё генерируется. Повторите попытку — таймаут специально увеличен.';
  }
  return fallback;
};

const sourceLabel = (source: string) => (source === 'admin' ? 'Проверка' : 'API');

export const QaRequestsPanel = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const limit = 20;

  const listQuery = useQuery({
    queryKey: ['qa', 'conversations', page, limit],
    queryFn: () => qaApi.listConversations(page, limit),
    refetchInterval: 8000,
  });

  const detailQuery = useQuery({
    queryKey: ['qa', 'conversation', selectedId],
    queryFn: () => qaApi.getConversation(selectedId!),
    enabled: Boolean(selectedId),
    refetchInterval: 5000,
  });

  const conversation: QaConversation | undefined = detailQuery.data;
  const items: QaConversationListItem[] = listQuery.data?.data ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [conversation?.messages.length, selectedId]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['qa', 'conversations'] });
    if (selectedId) {
      queryClient.invalidateQueries({ queryKey: ['qa', 'conversation', selectedId] });
    }
  };

  const modeMutation = useMutation({
    mutationFn: (mode: 'ai' | 'human') => qaApi.setMode(selectedId!, mode),
    onSuccess: data => {
      queryClient.setQueryData(['qa', 'conversation', selectedId], data);
      invalidate();
      setActionError(null);
    },
    onError: err => setActionError(apiError(err, 'Не удалось переключить режим')),
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) => qaApi.reply(selectedId!, content),
    onSuccess: data => {
      queryClient.setQueryData(['qa', 'conversation', selectedId], data);
      setReply('');
      invalidate();
      setActionError(null);
    },
    onError: err => setActionError(apiError(err, 'Не удалось отправить ответ')),
  });

  const handleReply = (event: FormEvent) => {
    event.preventDefault();
    const content = reply.trim();
    if (!content || !selectedId || replyMutation.isPending) return;
    replyMutation.mutate(content);
  };

  if (listQuery.isLoading) return <div className="qa-panel">Загрузка запросов...</div>;
  if (listQuery.error) return <div className="qa-panel qa-panel--error">Не удалось загрузить запросы</div>;

  return (
    <div className="qa-requests">
      <div className="qa-requests__list">
        <div className="dashboard__table qa-requests__table">
          <table>
            <thead>
              <tr>
                <th>Вопрос</th>
                <th>Режим</th>
                <th>Источник</th>
                <th>Обновлён</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="leads-table__empty">
                    Запросов за последние 3 дня нет
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr
                    key={item.id}
                    className={`qa-requests__row ${selectedId === item.id ? 'qa-requests__row--active' : ''} ${item.unread ? 'qa-requests__row--unread' : ''}`}
                    onClick={() => {
                      setSelectedId(item.id);
                      setActionError(null);
                    }}
                  >
                    <td data-label="Вопрос">
                      <span className="qa-requests__preview">{item.lastPreview || 'Без текста'}</span>
                      {item.unread && <span className="dashboard__badge">новый</span>}
                    </td>
                    <td data-label="Режим">{item.mode === 'human' ? 'Оператор' : 'AI'}</td>
                    <td data-label="Источник">{sourceLabel(item.source)}</td>
                    <td data-label="Обновлён">{new Date(item.updatedAt).toLocaleString('ru-RU')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
      </div>

      <div className="qa-card qa-requests__detail">
        {!selectedId && <p className="qa-thread__empty">Выберите диалог слева</p>}
        {selectedId && detailQuery.isLoading && <p className="qa-thread__empty">Загрузка диалога...</p>}
        {selectedId && detailQuery.error && (
          <p className="qa-panel qa-panel--error">Диалог не найден или уже истёк (храним 3 дня)</p>
        )}
        {conversation && (
          <>
            <div className="qa-requests__toolbar">
              <div>
                <h2 className="qa-card__title">Диалог</h2>
                <p className="qa-card__hint">
                  {conversation.mode === 'human'
                    ? 'Сейчас отвечает оператор. AI молчит, пока не включите его снова.'
                    : 'Сейчас отвечает AI. Можно перехватить диалог и ответить вручную.'}
                </p>
              </div>
              {conversation.mode === 'ai' ? (
                <button
                  type="button"
                  className="dashboard__edit"
                  disabled={modeMutation.isPending}
                  onClick={() => modeMutation.mutate('human')}
                >
                  Отвечу сам
                </button>
              ) : (
                <button
                  type="button"
                  className="dashboard__add"
                  disabled={modeMutation.isPending}
                  onClick={() => modeMutation.mutate('ai')}
                >
                  {modeMutation.isPending ? 'AI отвечает…' : 'Продолжить ответы AI'}
                </button>
              )}
            </div>
            {actionError && <div className="dashboard__error">{actionError}</div>}
            <div className="qa-thread" ref={threadRef}>
              {conversation.messages.map(message => (
                <div
                  key={message.id}
                  className={`qa-bubble qa-bubble--${message.author === 'user' ? 'user' : message.author === 'admin' ? 'admin' : 'ai'}`}
                >
                  <span className="qa-bubble__meta">
                    {new Date(message.createdAt).toLocaleString('ru-RU')}
                  </span>
                  <p>{message.content}</p>
                </div>
              ))}
            </div>
            {conversation.mode === 'human' && (
              <form className="qa-test__form" onSubmit={handleReply}>
                <input
                  value={reply}
                  onChange={event => setReply(event.target.value)}
                  placeholder="Ответ клиенту"
                  disabled={replyMutation.isPending}
                />
                <button type="submit" className="dashboard__add" disabled={replyMutation.isPending || !reply.trim()}>
                  {replyMutation.isPending ? 'Отправка…' : 'Отправить'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
