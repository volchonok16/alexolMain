import { Lead } from '@/api/leads';
import './LeadDetailModal.scss';

interface LeadDetailModalProps {
  lead: Lead;
  onClose: () => void;
}

const sourceLabels: Record<string, string> = {
  contact_form: 'Форма контактов',
  project_modal: 'Модал «Обсудить проект»',
  pricing_modal: 'Калькулятор цен',
  consultation_modal: 'Запись на консультацию',
};

export const LeadDetailModal = ({ lead, onClose }: LeadDetailModalProps) => {
  return (
    <div className="lead-modal__overlay" onClick={onClose}>
      <div className="lead-modal" onClick={e => e.stopPropagation()}>
        <div className="lead-modal__header">
          <h2>Заявка от {lead.name}</h2>
          <button type="button" className="lead-modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="lead-modal__body">
          <dl className="lead-modal__fields">
            <div>
              <dt>Email</dt>
              <dd>{lead.email}</dd>
            </div>
            {lead.phone && (
              <div>
                <dt>Телефон</dt>
                <dd>{lead.phone}</dd>
              </div>
            )}
            {lead.company && (
              <div>
                <dt>Компания</dt>
                <dd>{lead.company}</dd>
              </div>
            )}
            {lead.budget && (
              <div>
                <dt>Бюджет</dt>
                <dd>{lead.budget}</dd>
              </div>
            )}
            {lead.pageCount != null && (
              <div>
                <dt>Кол-во страниц / единиц</dt>
                <dd>{lead.pageCount}</dd>
              </div>
            )}
            {lead.calculatedPrice != null && (
              <div>
                <dt>Расчётная цена</dt>
                <dd>{lead.calculatedPrice.toLocaleString('ru-RU')} ₽</dd>
              </div>
            )}
            <div>
              <dt>Источник</dt>
              <dd>{sourceLabels[lead.source] || lead.source}</dd>
            </div>
            <div>
              <dt>Дата</dt>
              <dd>{new Date(lead.createdAt).toLocaleString('ru-RU')}</dd>
            </div>
            <div className="lead-modal__description">
              <dt>Описание</dt>
              <dd>{lead.description}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};
