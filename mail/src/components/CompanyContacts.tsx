import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Search, Users } from 'lucide-react'
import api from '../api/axios'
import { PeerAvatar } from './PeerAvatar'
import { useAuthStore } from '../store/authStore'
import './CompanyOrg.css'

export type DirectoryPerson = {
  email: string
  full_name: string
  job_title?: string | null
  avatar_url?: string | null
  phone?: string | null
  telegram?: string | null
  username?: string | null
  is_busy?: boolean
  busy_until?: string | null
  busy_title?: string | null
}

export default function CompanyContacts() {
  const token = useAuthStore((s) => s.token)
  const [q, setQ] = useState('')
  const { data: people = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data } = await api.get<DirectoryPerson[]>('/contacts')
      return data
    },
  })

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return people
    return people.filter((p) =>
      [p.full_name, p.email, p.job_title, p.phone, p.telegram, p.username]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle))
    )
  }, [people, q])

  const downloadVcf = () => {
    window.open(`/api/contacts.vcf?access_token=${encodeURIComponent(token || '')}`, '_blank')
  }

  const onDownload = async () => {
    try {
      const { data } = await api.get('/contacts.vcf', { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'alexol-contacts.vcf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      downloadVcf()
    }
  }

  return (
    <div className="org-pane">
      <div className="content-header">
        <h2>Контакты компании</h2>
        <button type="button" className="btn-refresh" onClick={onDownload} aria-label="Скачать vCard">
          <Download size={20} />
        </button>
      </div>
      <div className="org-toolbar">
        <Search size={16} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Имя, почта, должность, телефон"
        />
        <span className="org-count">{filtered.length}</span>
      </div>
      <p className="org-outlook-hint">
        Единая книга в Outlook: Файл → Настройка учетных записей → Адресные книги → Создать
        → Служба каталогов Интернета (LDAP). Сервер <code>mail.alexol.io</code>, порт
        <code>636</code>, включить SSL, база <code>dc=alexol,dc=io</code>, вход — почта и
        пароль ящика. Затем Адресная книга → Сервис → Параметры → Добавить →
        <code>mail.alexol.io</code> (не «Контакты» и не Автовыбор).
        Лишние папки INBOX в Outlook: правый клик → Удалить
        (это пустые клоны, не «Входящие»).
        Имя в списке учетных записей Outlook — локальное поле, сервер его не пишет.
        Исходящие всё равно уходят с ФИО из профиля ящика. Для проверки имён коллег
        добавьте LDAP (шаги выше). vCard — запасной импорт в «Люди».
      </p>
      {isLoading ? (
        <div className="empty-state">
          <Users size={48} />
          <p>Загрузка…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <p>Никого не найдено</p>
        </div>
      ) : (
        <div className="org-contact-list">
          {filtered.map((person) => (
            <a key={person.email} className="org-contact-card" href={`mailto:${person.email}`}>
              <PeerAvatar src={person.avatar_url} email={person.email} name={person.full_name} size={48} />
              <div>
                <div className="org-contact-name">
                  {person.full_name}
                  {person.is_busy ? <span className="org-busy-badge">Занят</span> : null}
                </div>
                <div className="org-contact-meta">{person.job_title || 'Сотрудник'}</div>
                {person.is_busy && person.busy_until ? (
                  <div className="org-contact-meta org-busy-line">
                    {person.busy_title || 'Встреча'} до{' '}
                    {new Date(person.busy_until).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                ) : null}
                <div className="org-contact-meta">{person.email}</div>
                {person.phone ? <div className="org-contact-meta">{person.phone}</div> : null}
                {person.telegram ? <div className="org-contact-meta">{person.telegram}</div> : null}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
