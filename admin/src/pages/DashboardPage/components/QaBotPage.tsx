import { useState } from 'react';
import { Bot } from 'lucide-react';
import { QaSettingsPanel } from './QaSettingsPanel';
import { QaRequestsPanel } from './QaRequestsPanel';
import './QaBotPage.scss';

type QaTab = 'settings' | 'requests';

export const QaBotPage = () => {
  const [tab, setTab] = useState<QaTab>('settings');

  return (
    <div className="dashboard__container qa-page">
      <div className="qa-page__intro">
        <div className="qa-page__icon">
          <Bot size={22} />
        </div>
        <div>
          <p className="qa-page__lead">
            Промпт уходит в рабочую модель OpenRouter вместе с вопросом клиента. Следующие сообщения
            учитывают историю диалога и описание компании. История запросов хранится 3 дня.
          </p>
        </div>
      </div>

      <div className="qa-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'settings'}
          className={`qa-tabs__item ${tab === 'settings' ? 'qa-tabs__item--active' : ''}`}
          onClick={() => setTab('settings')}
        >
          Настройки
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'requests'}
          className={`qa-tabs__item ${tab === 'requests' ? 'qa-tabs__item--active' : ''}`}
          onClick={() => setTab('requests')}
        >
          Запросы
        </button>
      </div>

      {tab === 'settings' ? <QaSettingsPanel /> : <QaRequestsPanel />}
    </div>
  );
};
