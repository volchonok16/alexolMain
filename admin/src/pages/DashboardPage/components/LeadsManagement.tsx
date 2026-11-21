import { useState } from 'react';
import { Trash2, Eye } from 'lucide-react';
import { Lead, LeadStatus } from '@/api/leads';
import { useLeads } from '../hooks/useLeads';
import { Pagination } from './Pagination';
import { LeadDetailModal } from './LeadDetailModal';
import './LeadsManagement.scss';

const statusLabels: Record<LeadStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  closed: 'Закрыта',
};

const sourceLabels: Record<string, string> = {
  contact_form: 'Контакты',
  project_modal: 'Проект',
  pricing_modal: 'Калькулятор',
  consultation_modal: 'Консультация',
};

const formatSource = (source: string) => sourceLabels[source] || source;

export const LeadsManagement = () => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { leads, isLoading, error, page, setPage, totalPages, updateStatus, deleteLead } = useLeads();

  const handleDelete = (id: string) => {
    if (confirm('Удалить заявку?')) {
      deleteLead(id);
    }
  };

  if (isLoading) return <div className="dashboard__container">Загрузка...</div>;
  if (error) return <div className="dashboard__container">Ошибка загрузки заявок</div>;

  return (
    <div className="dashboard__container">
      <div className="dashboard__table leads-table">
        <table>
          <thead>
            <tr>
              <th>Имя</th>
              <th>Email</th>
              <th>Телефон</th>
              <th>Источник</th>
              <th>Статус</th>
              <th>Дата</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="leads-table__empty">
                  Заявок пока нет
                </td>
              </tr>
            ) : (
              leads.map(lead => (
                <tr key={lead.id}>
                  <td data-label="Имя">{lead.name}</td>
                  <td data-label="Email">{lead.email}</td>
                  <td data-label="Телефон">{lead.phone || '-'}</td>
                  <td data-label="Источник">{formatSource(lead.source)}</td>
                  <td data-label="Статус">
                    <select
                      className="leads-table__status"
                      value={lead.status}
                      onChange={e => updateStatus({ id: lead.id, status: e.target.value as LeadStatus })}
                    >
                      {(Object.keys(statusLabels) as LeadStatus[]).map(status => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td data-label="Дата">{new Date(lead.createdAt).toLocaleString('ru-RU')}</td>
                  <td data-label="Действия">
                    <div className="dashboard__row-actions">
                      <button
                        type="button"
                        onClick={() => setSelectedLead(lead)}
                        className="dashboard__edit"
                        aria-label="Просмотр"
                      >
                        <Eye />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(lead.id)}
                        className="dashboard__delete"
                        aria-label="Удалить"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}

      {selectedLead && <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />}
    </div>
  );
};
