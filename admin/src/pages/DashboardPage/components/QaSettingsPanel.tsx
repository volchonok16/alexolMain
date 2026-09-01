import { FormEvent, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QaConversation, qaApi } from '@/api/qa';

const TEST_SESSION_KEY = 'alexol-qa-test-session';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const readStoredSession = () => {
  try {
    const value = localStorage.getItem(TEST_SESSION_KEY) || '';
    return UUID_RE.test(value) ? value : undefined;
  } catch {
    return undefined;
  }
};

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
    return 'Модель отвечает дольше обычного. Попробуйте ещё раз — запрос не обрывается на коротком таймауте.';
  }
  return fallback;
};

export const QaSettingsPanel = () => {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [maxChars, setMaxChars] = useState(1000);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [testSessionId, setTestSessionId] = useState<string | undefined>(readStoredSession);
  const [testInput, setTestInput] = useState('');
  const [testError, setTestError] = useState<string | null>(null);
  const [testConversation, setTestConversation] = useState<QaConversation | null>(null);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['qa', 'settings'],
    queryFn: qaApi.getSettings,
  });

  useEffect(() => {
    if (!settings) return;
    setPrompt(settings.prompt);
    setMaxChars(settings.maxChars);
  }, [settings]);

  const { data: liveSession } = useQuery({
    queryKey: ['qa', 'session', testSessionId],
    queryFn: () => qaApi.getSession(testSessionId!),
    enabled: Boolean(testSessionId),
    refetchInterval: 8000,
  });

  useEffect(() => {
    if (liveSession) setTestConversation(liveSession);
  }, [liveSession]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [testConversation?.messages.length]);

  const saveMutation = useMutation({
    mutationFn: () => qaApi.saveSettings({ prompt, maxChars }),
    onSuccess: data => {
      queryClient.setQueryData(['qa', 'settings'], data);
      setSaveError(null);
      setSaveOk(true);
      window.setTimeout(() => setSaveOk(false), 2500);
    },
    onError: err => {
      setSaveOk(false);
      setSaveError(apiError(err, 'Не удалось сохранить настройки'));
    },
  });

  const chatMutation = useMutation({
    mutationFn: (message: string) => qaApi.testChat({ sessionId: testSessionId, message }),
    onSuccess: data => {
      setTestConversation(data);
      setPendingUser(null);
      setTestSessionId(data.sessionId);
      try {
        localStorage.setItem(TEST_SESSION_KEY, data.sessionId);
      } catch {
        /* ignore */
      }
      queryClient.invalidateQueries({ queryKey: ['qa', 'conversations'] });
      setTestError(null);
    },
    onError: err => {
      setPendingUser(null);
      setTestError(apiError(err, 'Не удалось получить ответ модели'));
    },
  });

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  const handleTest = (event: FormEvent) => {
    event.preventDefault();
    const message = testInput.trim();
    if (!message || chatMutation.isPending) return;
    setTestInput('');
    setPendingUser(message);
    chatMutation.mutate(message);
  };

  const resetTest = () => {
    setTestConversation(null);
    setPendingUser(null);
    setTestSessionId(undefined);
    setTestError(null);
    try {
      localStorage.removeItem(TEST_SESSION_KEY);
    } catch {
      /* ignore */
    }
  };

  if (isLoading) return <div className="qa-panel">Загрузка настроек...</div>;
  if (error) return <div className="qa-panel qa-panel--error">Не удалось загрузить настройки бота</div>;

  const lastMessage = testConversation?.messages[testConversation.messages.length - 1];
  const showPendingUser = Boolean(pendingUser && lastMessage?.content !== pendingUser);

  return (
    <div className="qa-grid">
      <form className="qa-card modal__form" onSubmit={handleSave}>
        <h2 className="qa-card__title">Промпт и лимит ответа</h2>
        <p className="qa-card__hint">
          Опишите компанию, услуги, сайт, тон общения. Этот текст вместе с вопросом клиента уходит в
          рабочую модель OpenRouter.
        </p>
        {saveError && <div className="dashboard__error">{saveError}</div>}
        {saveOk && <div className="qa-ok">Настройки сохранены</div>}
        <div className="modal__field">
          <label htmlFor="qa-prompt">Промпт / описание компании</label>
          <textarea
            id="qa-prompt"
            rows={14}
            value={prompt}
            onChange={event => setPrompt(event.target.value)}
            placeholder={
              'Мы консалтинговая компания Alexol. Сайт: https://alexol.io\nУслуги:\n— разработка ПО на заказ\n— аутсорсинг команд\n— UI/UX\n— внедрение AI/ML\nОтвечай кратко, по делу, без выдуманных цен.'
            }
          />
        </div>
        <div className="modal__field">
          <label htmlFor="qa-max-chars">Максимум символов в ответе</label>
          <input
            id="qa-max-chars"
            type="number"
            min={100}
            max={4000}
            value={maxChars}
            onChange={event => setMaxChars(Number(event.target.value) || 1000)}
          />
        </div>
        <p className="modal__hint">
          Модель должна закончить мысль в этом лимите, а не обрезать текст на полуслове. Диапазон: 100–4000.
        </p>
        <div className="modal__actions">
          <button type="submit" className="dashboard__add qa-card__save" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </form>

      <div className="qa-card qa-test">
        <div className="qa-test__head">
          <h2 className="qa-card__title">Проверка бота</h2>
          <button type="button" className="qa-test__reset" onClick={resetTest}>
            Новый диалог
          </button>
        </div>
        <p className="qa-card__hint">
          Запрос идёт в ту же модель, что и для клиентов. Диалог появится во вкладке «Запросы».
        </p>
        {testError && <div className="dashboard__error">{testError}</div>}
        <div className="qa-thread" ref={threadRef}>
          {(testConversation?.messages || []).length === 0 && !pendingUser && (
            <p className="qa-thread__empty">Задайте вопрос, чтобы проверить промпт</p>
          )}
          {(testConversation?.messages || []).map(message => (
            <div
              key={message.id}
              className={`qa-bubble qa-bubble--${message.author === 'user' ? 'user' : message.author === 'admin' ? 'admin' : 'ai'}`}
            >
              <span className="qa-bubble__meta">
                {message.author === 'user' ? 'Вы' : message.author === 'admin' ? 'Оператор' : 'AI'}
              </span>
              <p>{message.content}</p>
            </div>
          ))}
          {showPendingUser && (
            <div className="qa-bubble qa-bubble--user">
              <span className="qa-bubble__meta">Вы</span>
              <p>{pendingUser}</p>
            </div>
          )}
          {chatMutation.isPending && <div className="qa-bubble qa-bubble--ai qa-bubble--pending">Модель думает…</div>}
          {testConversation?.waitingOperator && !chatMutation.isPending && (
            <p className="qa-thread__wait">Ожидается ответ оператора. Можно ответить вручную во вкладке «Запросы».</p>
          )}
        </div>
        <form className="qa-test__form" onSubmit={handleTest}>
          <input
            value={testInput}
            onChange={event => setTestInput(event.target.value)}
            placeholder="Вопрос клиента"
            disabled={chatMutation.isPending}
          />
          <button type="submit" className="dashboard__add" disabled={chatMutation.isPending || !testInput.trim()}>
            {chatMutation.isPending ? 'Ждём…' : 'Спросить'}
          </button>
        </form>
      </div>
    </div>
  );
};
