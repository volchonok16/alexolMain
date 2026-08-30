import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, ChevronLeft, ChevronRight, Link2, Plus, Trash2, Users } from 'lucide-react'
import api from '../api/axios'
import { ComposeToField } from './ComposeToField'
import { useToast } from './Toast'
import { parseRecipientChips } from '../utils/composeEmail'
import { useAuthStore } from '../store/authStore'
import './CompanyOrg.css'

type Attendee = {
  email: string
  display_name?: string | null
  status?: string
}

type BusySlot = {
  email: string
  full_name?: string | null
  start_at: string
  end_at: string
  event_id: number
  title: string
}

type CalEvent = {
  id: number
  organizer_email: string
  organizer_name: string
  title: string
  description?: string | null
  location?: string | null
  start_at: string
  end_at: string
  all_day: boolean
  is_company: boolean
  attendees: Attendee[]
  can_edit: boolean
  conflicts?: BusySlot[]
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toLocalInput(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultStart() {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return toLocalInput(d.toISOString())
}

function defaultEnd() {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 2)
  return toLocalInput(d.toISOString())
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function CompanyCalendar() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const me = useAuthStore((s) => s.user?.email)
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(() => new Date())
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    location: '',
    description: '',
    start_at: defaultStart(),
    end_at: defaultEnd(),
    is_company: true,
    attendees: '',
  })

  const fromAt = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const toAt = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59)

  const { data: events = [] } = useQuery({
    queryKey: ['calendar', fromAt.toISOString(), toAt.toISOString()],
    queryFn: async () => {
      const { data } = await api.get<CalEvent[]>('/calendar/events', {
        params: { from_at: fromAt.toISOString(), to_at: toAt.toISOString() },
      })
      return data
    },
  })

  const busyEmails = useMemo(() => {
    const fromChips = parseRecipientChips(form.attendees).map((c) => c.email.toLowerCase())
    const mine = me ? [me.toLowerCase()] : []
    return [...new Set([...mine, ...fromChips])]
  }, [form.attendees, me])

  const { data: busyData } = useQuery({
    queryKey: ['busy', form.start_at, form.end_at, busyEmails.join(',')],
    enabled: showForm && Boolean(form.start_at && form.end_at),
    queryFn: async () => {
      const { data } = await api.get<{ slots: BusySlot[] }>('/calendar/busy', {
        params: {
          from_at: new Date(form.start_at).toISOString(),
          to_at: new Date(form.end_at).toISOString(),
          emails: busyEmails.join(','),
        },
      })
      return data.slots
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const attendeeEmails = parseRecipientChips(form.attendees).map((c) => c.email.toLowerCase())
      const { data } = await api.post<CalEvent>('/calendar/events', {
        title: form.title,
        location: form.location || null,
        description: form.description || null,
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at).toISOString(),
        is_company: form.is_company,
        attendees: attendeeEmails.map((email) => ({ email })),
      })
      return data
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      queryClient.invalidateQueries({ queryKey: ['inbox'] })
      queryClient.invalidateQueries({ queryKey: ['sent'] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['busy'] })
      setShowForm(false)
      setForm({
        title: '',
        location: '',
        description: '',
        start_at: defaultStart(),
        end_at: defaultEnd(),
        is_company: true,
        attendees: '',
      })
      if (created.conflicts && created.conflicts.length) {
        toast.info('Встреча создана, но у кого-то уже есть пересечение по времени')
      } else {
        toast.success('Встреча создана')
      }
    },
    onError: () => toast.error('Не удалось создать встречу'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/calendar/events/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      toast.success('Встреча удалена')
    },
  })

  const copyFeed = async () => {
    try {
      const { data } = await api.get<{ url: string }>('/calendar/feed-url')
      await navigator.clipboard.writeText(data.url)
      toast.success('Ссылка скопирована. Outlook: Календарь → Добавить календарь → Из интернета')
    } catch {
      toast.error('Не удалось получить ссылку календаря')
    }
  }

  const cells = useMemo(() => {
    const first = startOfMonth(cursor)
    const startWeekday = (first.getDay() + 6) % 7
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    const grid: (Date | null)[] = []
    for (let i = 0; i < startWeekday; i++) grid.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push(new Date(cursor.getFullYear(), cursor.getMonth(), d))
    }
    while (grid.length % 7) grid.push(null)
    return grid
  }, [cursor])

  const dayEvents = events.filter((ev) => sameDay(new Date(ev.start_at), selected))
  const monthLabel = cursor.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })

  return (
    <div className="org-pane">
      <div className="content-header">
        <h2>Календарь</h2>
        <div className="org-header-actions">
          <button type="button" className="btn-refresh" onClick={copyFeed} title="Подписка ICS">
            <Link2 size={18} />
          </button>
          <button
            type="button"
            className="btn-compose org-small-compose"
            onClick={() => {
              const start = new Date(selected)
              start.setHours(10, 0, 0, 0)
              const end = new Date(start)
              end.setHours(11, 0, 0, 0)
              setForm((f) => ({
                ...f,
                start_at: toLocalInput(start.toISOString()),
                end_at: toLocalInput(end.toISOString()),
              }))
              setShowForm(true)
            }}
          >
            <Plus size={18} />
            Встреча
          </button>
        </div>
      </div>
      <p className="org-cal-hint">
        Встречи с участниками уходят в Outlook как приглашения. Встречи, созданные в Outlook
        с участниками @alexol.io, появляются здесь. Чтобы видеть все встречи сайта в Outlook —
        кнопка со ссылкой (календарь из интернета).
      </p>

      <div className="cal-nav">
        <button
          type="button"
          className="btn-refresh"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
        >
          <ChevronLeft size={18} />
        </button>
        <strong className="cal-month">{monthLabel}</strong>
        <button
          type="button"
          className="btn-refresh"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="cal-scroll">
      <div className="cal-weekdays">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="cal-cell empty" />
          const count = events.filter((ev) => sameDay(new Date(ev.start_at), day)).length
          const isSel = sameDay(day, selected)
          const isToday = sameDay(day, new Date())
          return (
            <button
              key={day.toISOString()}
              type="button"
              className={`cal-cell ${isSel ? 'selected' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => setSelected(day)}
            >
              <span>{day.getDate()}</span>
              {count > 0 ? <i className="cal-dot" /> : null}
            </button>
          )
        })}
      </div>

      <div className="cal-day-list">
        <h3>
          {selected.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
        </h3>
        {dayEvents.length === 0 ? (
          <div className="empty-state">
            <Calendar size={40} />
            <p>Нет встреч в этот день</p>
          </div>
        ) : (
          dayEvents.map((ev) => (
            <article key={ev.id} className="cal-event">
              <div>
                <div className="cal-event-title">{ev.title}</div>
                <div className="org-contact-meta">
                  {new Date(ev.start_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  {' – '}
                  {new Date(ev.end_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  {ev.location ? ` · ${ev.location}` : ''}
                </div>
                <div className="org-contact-meta">
                  {ev.is_company ? 'Календарь компании' : 'Личная'} · {ev.organizer_name}
                </div>
                {ev.attendees.length > 0 ? (
                  <div className="org-contact-meta">
                    <Users size={12} /> {ev.attendees.map((a) => a.display_name || a.email).join(', ')}
                  </div>
                ) : null}
              </div>
              {ev.can_edit ? (
                <button
                  type="button"
                  className="mail-toolbar-btn danger"
                  onClick={() => {
                    if (confirm('Удалить встречу?')) deleteMutation.mutate(ev.id)
                  }}
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
            </article>
          ))
        )}
      </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal compose-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Новая встреча</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createMutation.mutate()
              }}
            >
              <div className="form-group">
                <label>Название</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Стендап, созвон с клиентом…"
                />
              </div>
              <div className="form-group">
                <label>Участники</label>
                <ComposeToField
                  value={form.attendees}
                  onChange={(attendees) => setForm({ ...form, attendees })}
                />
                {busyData && busyData.length > 0 ? (
                  <div className="org-conflict">
                    Пересечение с занятостью:
                    <ul>
                      {busyData.map((slot) => (
                        <li key={`${slot.email}-${slot.event_id}-${slot.start_at}`}>
                          {(slot.full_name || slot.email) + ': '}
                          {slot.title} (
                          {new Date(slot.start_at).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          –{new Date(slot.end_at).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          )
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Начало</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.start_at}
                    onChange={(e) => setForm({ ...form, start_at: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Конец</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.end_at}
                    onChange={(e) => setForm({ ...form, end_at: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Место / ссылка</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Переговорка или Zoom"
                />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>
              <label className="org-check">
                <input
                  type="checkbox"
                  checked={form.is_company}
                  onChange={(e) => setForm({ ...form, is_company: e.target.checked })}
                />
                Видно всей компании
              </label>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowForm(false)}>
                  Отмена
                </button>
                <button type="submit" disabled={createMutation.isPending}>
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
