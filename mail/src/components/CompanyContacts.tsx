import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Mail, Phone, Search, Users, Video } from 'lucide-react'
import api from '../api/axios'
import { PeerAvatar } from './PeerAvatar'
import { useAuthStore } from '../store/authStore'
import { useToast } from './Toast'
import { personalJitsiUrl } from '../utils/jitsi'
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

function telegramHref(value: string): string {
  const raw = value.trim()
  if (/^https?:\/\//i.test(raw)) return raw
  const handle = raw.replace(/^@/, '').replace(/^t\.me\//i, '')
  return `https://t.me/${handle}`
}

function TelegramIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.5 3.3 2.8 10.5c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.7.4 1 .9 1 .5 0 .7-.2 1-.6l2.5-2.6 5.2 3.8c1 .5 1.6.2 1.9-.9l3.4-16.1c.3-1.4-.5-2-1.6-1.4z" />
    </svg>
  )
}

export default function CompanyContacts() {
  const token = useAuthStore((s) => s.token)
  const me = useAuthStore((s) => s.user)
  const toast = useToast()
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

  const openMyJitsi = async () => {
    const url = personalJitsiUrl(me?.username, me?.email)
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Ссылка комнаты скопирована — отправьте коллеге')
    } catch {
      /* clipboard may be blocked */
    }
    window.open(url, '_blank', 'noopener,noreferrer')
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
        <div className="org-header-actions">
          <button type="button" className="btn-compose org-small-compose" onClick={openMyJitsi}>
            <Video size={16} />
            Созвон Jitsi
          </button>
          <button type="button" className="btn-refresh" onClick={onDownload} aria-label="Скачать vCard">
            <Download size={20} />
          </button>
        </div>
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
            <div key={person.email} className="org-contact-card">
              <PeerAvatar src={person.avatar_url} email={person.email} name={person.full_name} size={48} />
              <div className="org-contact-body">
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
                <a className="org-contact-line" href={`mailto:${person.email}`}>
                  <Mail size={14} />
                  <span>{person.email}</span>
                </a>
                {person.phone ? (
                  <a className="org-contact-line" href={`tel:${person.phone.replace(/\s+/g, '')}`}>
                    <Phone size={14} />
                    <span>{person.phone}</span>
                  </a>
                ) : null}
                {person.telegram ? (
                  <a
                    className="org-contact-line"
                    href={telegramHref(person.telegram)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <TelegramIcon />
                    <span>{person.telegram}</span>
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
