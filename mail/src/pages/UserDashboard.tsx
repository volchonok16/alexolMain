import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../api/axios'
import { Mail, Send, Inbox, LogOut, User, RefreshCw, Users, FileText, Menu, X, LayoutDashboard, File, Edit, Trash2 } from 'lucide-react'
import { ThemeSwitch } from '../components/ThemeSwitch'
import { PeerAvatar } from '../components/PeerAvatar'
import { useToast } from '../components/Toast'
import { openSiteAdmin } from '../sso'
import { resolveAvatarUrl } from '../utils/avatarUrl'
import {
  starterHtml,
  templateTypeLabel,
  type EmailTemplate,
  type TemplateType,
} from '../utils/templateStarters'
import './UserDashboard.css'

interface Email {
  id: number
  from_address: string
  to_address: string
  subject: string
  body: string
  html_body?: string
  is_read: boolean
  is_sent: boolean
  received_at: string
  from_avatar_url?: string | null
  to_avatar_url?: string | null
  from_name?: string | null
  to_name?: string | null
}

export default function UserDashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox')
  const [showCompose, setShowCompose] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [siteAdminLoading, setSiteAdminLoading] = useState(false)
  const [composeData, setComposeData] = useState({
    to_address: '',
    subject: '',
    body: '',
    html_body: '',
  })
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [showManageTemplates, setShowManageTemplates] = useState(false)
  const [templatesTab, setTemplatesTab] = useState<TemplateType>('body')
  const [templatesScope, setTemplatesScope] = useState<'all' | 'mine' | 'shared'>('all')
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<number[]>([])
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    html_content: '',
  })
  const [attachments, setAttachments] = useState<File[]>([])
  const [attachmentPreviews, setAttachmentPreviews] = useState<
    { name: string; size: number; isImage: boolean; url: string | null }[]
  >([])

  useEffect(() => {
    return () => {
      attachmentPreviews.forEach((p) => {
        if (p.url) URL.revokeObjectURL(p.url)
      })
    }
  }, [attachmentPreviews])

  // Fetch inbox
  const { data: inbox } = useQuery({
    queryKey: ['inbox'],
    queryFn: async () => {
      const { data } = await api.get<Email[]>('/emails/inbox')
      return data
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Fetch sent
  const { data: sent } = useQuery({
    queryKey: ['sent'],
    queryFn: async () => {
      const { data } = await api.get<Email[]>('/emails/sent')
      return data
    },
  })

  // Templates
  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data } = await api.get<EmailTemplate[]>('/templates')
      return data
    },
  })

  const openCreateTemplate = (type: TemplateType) => {
    setEditingTemplate(null)
    setTemplateForm({
      name: '',
      description: '',
      html_content: starterHtml(type),
    })
  }

  const switchTemplatesTab = (type: TemplateType) => {
    setTemplatesTab(type)
    openCreateTemplate(type)
  }

  const startEditTemplate = (template: EmailTemplate) => {
    setTemplatesTab(template.type)
    setEditingTemplate(template)
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      html_content: template.html_content,
    })
  }

  const createTemplateMutation = useMutation({
    mutationFn: async (payload: {
      name: string
      type: TemplateType
      description: string
      html_content: string
    }) => {
      const { data } = await api.post<EmailTemplate>('/templates', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setEditingTemplate(null)
      openCreateTemplate(templatesTab)
      toast.success('Шаблон сохранён')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Ошибка сохранения шаблона')
    },
  })

  const updateTemplateMutation = useMutation({
    mutationFn: async (payload: {
      id: number
      data: {
        name: string
        type: TemplateType
        description: string
        html_content: string
      }
    }) => {
      const { data } = await api.put<EmailTemplate>(`/templates/${payload.id}`, payload.data)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setEditingTemplate(null)
      openCreateTemplate(templatesTab)
      toast.success('Шаблон обновлён')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Ошибка обновления шаблона')
    },
  })

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/templates/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Шаблон удалён')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Ошибка удаления шаблона')
    },
  })

  const handleTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: templateForm.name,
      type: editingTemplate ? editingTemplate.type : templatesTab,
      description: templateForm.description,
      html_content: templateForm.html_content,
    }
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: payload })
    } else {
      createTemplateMutation.mutate(payload)
    }
  }

  // Send email mutation
  type ComposePayload = typeof composeData & { attachments: File[] }

  const sendMutation = useMutation({
    mutationFn: async (emailData: ComposePayload) => {
      if (emailData.attachments && emailData.attachments.length > 0) {
        const formData = new FormData()
        formData.append('to_address', emailData.to_address)
        formData.append('subject', emailData.subject)
        formData.append('body', emailData.body)
        if (emailData.html_body) {
          formData.append('html_body', emailData.html_body)
        }
        emailData.attachments.forEach((file) => {
          formData.append('files', file)
        })
        const { data } = await api.post('/emails/send-with-attachments', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        return data
      } else {
        const { data } = await api.post('/emails/send', {
          to_address: emailData.to_address,
          subject: emailData.subject,
          body: emailData.body,
          html_body: emailData.html_body,
        })
        return data
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sent'] })
      setShowCompose(false)
      setComposeData({ to_address: '', subject: '', body: '', html_body: '' })
      setAttachments([])
      setAttachmentPreviews((prev) => {
        prev.forEach((p) => p.url && URL.revokeObjectURL(p.url))
        return []
      })
      toast.success('Письмо отправлено')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Ошибка отправки')
    },
  })

  // Delete email mutation
  const deleteMutation = useMutation({
    mutationFn: async (emailId: number) => {
      await api.delete(`/emails/${emailId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] })
      queryClient.invalidateQueries({ queryKey: ['sent'] })
      setSelectedEmail(null)
      toast.success('Письмо удалено')
    },
  })

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()

    let currentHtml = composeData.html_body

    if (!composeData.body && !currentHtml) {
      toast.error('Нужно указать либо текст письма, либо HTML (шаблон).')
      return
    }

    if (currentHtml) {
      const wrapper = document.createElement('div')
      wrapper.innerHTML = currentHtml

      const anchors = Array.from(wrapper.querySelectorAll('a')) as HTMLAnchorElement[]
      anchors.forEach((a) => {
        const raw = a.textContent || ''
        const text = raw.trim()
        if (!text) return

        const digitsOnly = text.replace(/\D+/g, '')
        const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
        const looksLikePhone = digitsOnly.length >= 5 && !text.includes('@')

        if (looksLikePhone) {
          const hasPlus = text.includes('+')
          const telValue = hasPlus ? `+${digitsOnly}` : digitsOnly
          if (telValue) {
            a.href = `tel:${telValue}`
          }
        } else if (emailLike) {
          a.href = `mailto:${text}`
        } else {
          // Для веб-сайтов: если нет схемы, добавляем https://
          let hrefText = text
          if (!/^https?:\/\//i.test(hrefText)) {
            hrefText = `https://${hrefText}`
          }
          a.href = hrefText
        }
      })

      currentHtml = wrapper.innerHTML
    }

    sendMutation.mutate({ ...composeData, html_body: currentHtml, attachments })
  }

  const handleAttachmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachmentPreviews((prev) => {
      prev.forEach((p) => p.url && URL.revokeObjectURL(p.url))
      return files.map((file) => {
        const isImage = file.type.startsWith('image/')
        return {
          name: file.name,
          size: file.size,
          isImage,
          url: isImage ? URL.createObjectURL(file) : null,
        }
      })
    })
    setAttachments(files)
  }

  const removeAttachment = (index: number) => {
    setAttachmentPreviews((prev) => {
      const doomed = prev[index]
      if (doomed?.url) URL.revokeObjectURL(doomed.url)
      return prev.filter((_, i) => i !== index)
    })
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const emails = activeTab === 'inbox' ? inbox : sent

  const filteredTemplates = (templates || []).filter((t) => {
    if (t.type !== templatesTab) return false
    if (templatesScope === 'mine') return Boolean(t.is_mine)
    if (templatesScope === 'shared') return Boolean(t.is_shared) && !t.is_mine
    return true
  })

  const myTemplates = (templates || []).filter(
    (t) => t.type === templatesTab && t.is_mine
  )

  const toggleTemplateSelection = (template: EmailTemplate) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(template.id) ? prev.filter((id) => id !== template.id) : [...prev, template.id]
    )
  }

  const applySelectedTemplates = () => {
    if (!templates || selectedTemplateIds.length === 0) {
      setShowTemplatesModal(false)
      return
    }
    const selected = templates.filter((t) => selectedTemplateIds.includes(t.id))
    if (selected.length === 0) {
      setShowTemplatesModal(false)
      return
    }

    setComposeData((prev) => {
      let html = prev.html_body || ''

      const bodyTemplates = selected.filter((t) => t.type === 'body')
      const otherTemplates = selected.filter((t) => t.type !== 'body')

      if (bodyTemplates.length > 0) {
        // Берём первый выбранный шаблон основного письма как базовый контент
        html = bodyTemplates[0].html_content
      }

      const appendTemplate = (tpl: EmailTemplate) => {
        html = html
          ? `${html}\n<br />\n${tpl.html_content}`
          : tpl.html_content
      }

      otherTemplates.forEach(appendTemplate)

      return {
        ...prev,
        html_body: html,
      }
    })

    setShowTemplatesModal(false)
    setSelectedTemplateIds([])
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <button
            type="button"
            className="btn-menu"
            aria-label={mobileNavOpen ? 'Закрыть меню' : 'Открыть меню'}
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Mail size={28} />
          <div>
            <h1>Почта</h1>
            <span className="domain">alexol.io</span>
          </div>
        </div>
        <div className="nav-actions">
          <ThemeSwitch />
          {user?.is_admin && (
            <>
              <button
                onClick={async () => {
                  setSiteAdminLoading(true)
                  try {
                    await openSiteAdmin(api)
                  } catch {
                    toast.error('Не удалось открыть admin.alexol.io')
                    window.open('https://admin.alexol.io', '_blank', 'noopener,noreferrer')
                  } finally {
                    setSiteAdminLoading(false)
                  }
                }}
                className="btn-admin-panel"
                disabled={siteAdminLoading}
                title="admin.alexol.io без повторного входа"
              >
                <LayoutDashboard size={20} />
                <span className="btn-label">{siteAdminLoading ? '…' : 'Сайт'}</span>
              </button>
              <button onClick={() => navigate('/admin')} className="btn-admin-panel">
                <Users size={20} />
                <span className="btn-label">Ящики</span>
              </button>
            </>
          )}
          <button
            onClick={() => {
              setShowManageTemplates(true)
              setTemplatesTab('body')
              openCreateTemplate('body')
            }}
            className="btn-profile"
            title="Мои шаблоны писем"
          >
            <FileText size={20} />
            <span className="btn-label">Шаблоны</span>
          </button>
          <button onClick={() => navigate('/profile')} className="btn-profile">
            <User size={20} />
            <span className="btn-label">Профиль</span>
          </button>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={20} />
            <span className="btn-label">Выйти</span>
          </button>
        </div>
      </nav>

      {mobileNavOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Закрыть меню"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div className="dashboard-content">
        <aside className={`sidebar ${mobileNavOpen ? 'sidebar--open' : ''}`}>
          <button
            onClick={() => {
              setShowCompose(true)
              setMobileNavOpen(false)
            }}
            className="btn-compose"
          >
            <Send size={20} />
            Написать письмо
          </button>

          <div className="sidebar-menu">
            <button
              className={`menu-item ${activeTab === 'inbox' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('inbox')
                setMobileNavOpen(false)
              }}
            >
              <Inbox size={20} />
              Входящие
              {inbox && inbox.filter(e => !e.is_read).length > 0 && (
                <span className="badge">{inbox.filter(e => !e.is_read).length}</span>
              )}
            </button>
            <button
              className={`menu-item ${activeTab === 'sent' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('sent')
                setMobileNavOpen(false)
              }}
            >
              <Send size={20} />
              Отправленные
            </button>
          </div>

          <div className="user-info">
            {resolveAvatarUrl(user?.avatar_url) ? (
              <img
                src={resolveAvatarUrl(user?.avatar_url)!}
                alt=""
                className="user-avatar"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : null}
            <div>
              <div className="user-name">{user?.full_name}</div>
              <div className="user-email">{user?.email}</div>
              {user?.is_admin && <div className="user-role">Администратор</div>}
            </div>
          </div>
        </aside>

        <div className="main-content">
          <div className="content-header">
            <h2>{activeTab === 'inbox' ? 'Входящие' : 'Отправленные'}</h2>
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: [activeTab] })
              }}
              className="btn-refresh"
              aria-label="Обновить"
            >
              <RefreshCw size={20} />
            </button>
          </div>

          <div className="emails-list">
            {!emails || emails.length === 0 ? (
              <div className="empty-state">
                <Mail size={48} />
                <p>Нет писем</p>
              </div>
            ) : (
              emails.map((email) => {
                const peerAddress = email.is_sent ? email.to_address : email.from_address
                const peerAvatar = email.is_sent ? email.to_avatar_url : email.from_avatar_url
                const peerName = email.is_sent ? email.to_name : email.from_name
                return (
                <div
                  key={email.id}
                  className={`email-item ${!email.is_read && !email.is_sent ? 'unread' : ''}`}
                  onClick={() => {
                    const opened = { ...email, is_read: email.is_sent ? email.is_read : true }
                    setSelectedEmail(opened)
                    if (!email.is_read && !email.is_sent) {
                      // Optimistic badge update - don't wait for network
                      queryClient.setQueryData<Email[]>(['inbox'], (old) =>
                        (old || []).map((e) =>
                          e.id === email.id ? { ...e, is_read: true } : e
                        )
                      )
                      void (async () => {
                        try {
                          const { data } = await api.post<Email>(`/emails/${email.id}/read`)
                          setSelectedEmail(data)
                          queryClient.setQueryData<Email[]>(['inbox'], (old) =>
                            (old || []).map((e) =>
                              e.id === email.id ? { ...e, ...data, is_read: true } : e
                            )
                          )
                        } catch {
                          // Revert if server rejected
                          queryClient.setQueryData<Email[]>(['inbox'], (old) =>
                            (old || []).map((e) =>
                              e.id === email.id ? { ...e, is_read: false } : e
                            )
                          )
                          setSelectedEmail(email)
                        }
                      })()
                    }
                  }}
                >
                  <PeerAvatar src={peerAvatar} email={peerAddress} size={44} />
                  <div className="email-item-body">
                  <div className="email-item-top">
                    <div className="email-from">
                      {peerName ? (
                        <>
                          <span className="email-peer-name">{peerName}</span>
                          <span className="email-peer-email">{peerAddress}</span>
                        </>
                      ) : (
                        peerAddress
                      )}
                    </div>
                    <div className="email-date">
                      {new Date(email.received_at).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="email-subject">{email.subject || '(Без темы)'}</div>
                  <div className="email-preview">
                    {(email.body || '').substring(0, 100)}
                    {(email.body || '').length > 100 ? '…' : ''}
                  </div>
                  </div>
                </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Быстрые действия">
        <button
          type="button"
          className={activeTab === 'inbox' ? 'active' : ''}
          onClick={() => setActiveTab('inbox')}
        >
          <Inbox size={20} />
          Входящие
        </button>
        <button
          type="button"
          className="mobile-compose"
          onClick={() => setShowCompose(true)}
          aria-label="Написать"
        >
          <Send size={22} />
        </button>
        <button
          type="button"
          className={activeTab === 'sent' ? 'active' : ''}
          onClick={() => setActiveTab('sent')}
        >
          <Send size={20} />
          Отправленные
        </button>
      </nav>

      {showCompose && (
        <div className="modal-overlay" onClick={() => setShowCompose(false)}>
          <div className="modal compose-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Новое письмо</h3>
            <form onSubmit={handleSend}>
              <div className="form-group">
                <label>Кому</label>
                <input
                  type="email"
                  value={composeData.to_address}
                  onChange={(e) => setComposeData({ ...composeData, to_address: e.target.value })}
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label>Тема</label>
                <input
                  type="text"
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  placeholder="Тема письма"
                  required
                />
              </div>

              <div className="form-group">
                <div className="compose-header-row">
                  <label>Сообщение</label>
                  <div className="compose-actions-right">
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => {
                        setShowManageTemplates(true)
                        setTemplatesTab('body')
                        openCreateTemplate('body')
                      }}
                    >
                      <Edit size={16} />
                      Мои шаблоны
                    </button>
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => {
                        setSelectedTemplateIds([])
                        setTemplatesScope('all')
                        setShowTemplatesModal(true)
                      }}
                    >
                      <FileText size={16} />
                      Использовать шаблон
                    </button>
                  </div>
                </div>
                <textarea
                  value={composeData.body}
                  onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                  placeholder="Текст письма..."
                  rows={10}
                />
              </div>

              <div className="form-group">
                <label>Вложения (файлы, изображения)</label>
                <input
                  type="file"
                  multiple
                  onChange={handleAttachmentsChange}
                />
                {attachmentPreviews.length > 0 && (
                  <ul className="attachments-preview">
                    {attachmentPreviews.map((item, idx) => (
                      <li key={`${item.name}-${idx}`} className="attachment-chip">
                        {item.isImage && item.url ? (
                          <img src={item.url} alt={item.name} className="attachment-thumb" />
                        ) : (
                          <div className="attachment-file-icon" aria-hidden>
                            <File size={22} />
                          </div>
                        )}
                        <div className="attachment-meta">
                          <span className="attachment-name">{item.name}</span>
                          <span className="attachment-size">
                            {Math.round(item.size / 1024)} КБ
                          </span>
                        </div>
                        <button
                          type="button"
                          className="attachment-remove"
                          aria-label={`Удалить ${item.name}`}
                          onClick={() => removeAttachment(idx)}
                        >
                          <X size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="form-group">
                <label>HTML-версия (опционально)</label>
                <textarea
                  value={composeData.html_body}
                  onChange={(e) => setComposeData({ ...composeData, html_body: e.target.value })}
                  placeholder="HTML содержимое письма. Сюда подставляются выбранные шаблоны."
                  rows={6}
                />
                <div className="html-preview">
                  <div className="html-preview-label">Предпросмотр HTML</div>
                  <div
                    className="html-preview-body email-preview-shell"
                    dangerouslySetInnerHTML={{ __html: composeData.html_body || '' }}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowCompose(false)} className="btn-secondary">
                  Отмена
                </button>
                <button type="submit" className="btn-primary" disabled={sendMutation.isPending}>
                  {sendMutation.isPending ? 'Отправка...' : 'Отправить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTemplatesModal && (
        <div className="modal-overlay" onClick={() => setShowTemplatesModal(false)}>
          <div className="modal templates-modal" onClick={(e) => e.stopPropagation()}>
            <div className="templates-header">
              <h3>Выбрать шаблон</h3>
              <div className="templates-tabs">
                <button
                  type="button"
                  className={templatesTab === 'body' ? 'active' : ''}
                  onClick={() => setTemplatesTab('body')}
                >
                  Основное письмо
                </button>
                <button
                  type="button"
                  className={templatesTab === 'signature' ? 'active' : ''}
                  onClick={() => setTemplatesTab('signature')}
                >
                  Подпись
                </button>
                <button
                  type="button"
                  className={templatesTab === 'other' ? 'active' : ''}
                  onClick={() => setTemplatesTab('other')}
                >
                  Другое
                </button>
              </div>
              <div className="templates-scope">
                <button
                  type="button"
                  className={templatesScope === 'all' ? 'active' : ''}
                  onClick={() => setTemplatesScope('all')}
                >
                  Все
                </button>
                <button
                  type="button"
                  className={templatesScope === 'mine' ? 'active' : ''}
                  onClick={() => setTemplatesScope('mine')}
                >
                  Мои
                </button>
                <button
                  type="button"
                  className={templatesScope === 'shared' ? 'active' : ''}
                  onClick={() => setTemplatesScope('shared')}
                >
                  Общие
                </button>
              </div>
            </div>
            <div className="templates-list">
              {filteredTemplates.length === 0 ? (
                <p className="empty-state-text">Нет шаблонов для выбранного типа.</p>
              ) : (
                filteredTemplates.map((tpl) => {
                  const isSelected = selectedTemplateIds.includes(tpl.id)
                  return (
                    <div
                      key={tpl.id}
                      className={`template-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleTemplateSelection(tpl)}
                    >
                      <div className="template-main">
                        <div className="template-name">
                          {tpl.name}
                          <span className={`template-badge ${tpl.is_mine ? 'mine' : 'shared'}`}>
                            {tpl.is_mine ? 'мой' : 'общий'}
                          </span>
                        </div>
                        {tpl.description && (
                          <div className="template-description">{tpl.description}</div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowTemplatesModal(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={applySelectedTemplates}
                disabled={selectedTemplateIds.length === 0}
              >
                Применить выбранные
              </button>
            </div>
          </div>
        </div>
      )}

      {showManageTemplates && (
        <div className="modal-overlay" onClick={() => setShowManageTemplates(false)}>
          <div className="modal templates-manage-modal" onClick={(e) => e.stopPropagation()}>
            <div className="templates-header">
              <div className="templates-header-top">
                <h3>Мои шаблоны</h3>
                <div className="templates-tabs">
                  <button
                    type="button"
                    className={templatesTab === 'body' ? 'active' : ''}
                    onClick={() => switchTemplatesTab('body')}
                  >
                    Основное письмо
                  </button>
                  <button
                    type="button"
                    className={templatesTab === 'signature' ? 'active' : ''}
                    onClick={() => switchTemplatesTab('signature')}
                  >
                    Подпись
                  </button>
                  <button
                    type="button"
                    className={templatesTab === 'other' ? 'active' : ''}
                    onClick={() => switchTemplatesTab('other')}
                  >
                    Другое
                  </button>
                </div>
              </div>
              <p className="templates-header-hint">
                {templateTypeLabel(templatesTab)}
                {myTemplates.length > 0 && ` · ${myTemplates.length} шт.`}
              </p>
            </div>

            <div className="templates-manage-content">
              <div className="templates-list">
                {myTemplates.length === 0 ? (
                  <p className="empty-state-text">Пока нет шаблонов в этой категории. Создайте справа.</p>
                ) : (
                  myTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className={`template-item-row ${editingTemplate?.id === tpl.id ? 'selected' : ''}`}
                    >
                      <div className="template-main">
                        <div className="template-name">{tpl.name}</div>
                        {tpl.description && (
                          <div className="template-description">{tpl.description}</div>
                        )}
                      </div>
                      <div className="template-actions">
                        <button
                          type="button"
                          className="icon-button"
                          title="Редактировать"
                          onClick={() => startEditTemplate(tpl)}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-button danger"
                          title="Удалить"
                          onClick={() => {
                            if (confirm(`Удалить шаблон "${tpl.name}"?`)) {
                              deleteTemplateMutation.mutate(tpl.id)
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="template-form">
                <div className="template-form-heading">
                  <h4>{editingTemplate ? `Редактирование: ${editingTemplate.name}` : 'Новый шаблон'}</h4>
                  {!editingTemplate && (
                    <span className="template-form-category">{templateTypeLabel(templatesTab)}</span>
                  )}
                </div>
                <form onSubmit={handleTemplateSubmit}>
                  <div className="form-group">
                    <label>Название</label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) =>
                        setTemplateForm({ ...templateForm, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Описание (необязательно)</label>
                    <input
                      type="text"
                      value={templateForm.description}
                      onChange={(e) =>
                        setTemplateForm({ ...templateForm, description: e.target.value })
                      }
                      placeholder="Например: шаблон коммерческого предложения"
                    />
                  </div>
                  <div className="form-group">
                    <div className="compose-header-row">
                      <label>HTML содержимое</label>
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() =>
                          setTemplateForm({
                            ...templateForm,
                            html_content: starterHtml(
                              editingTemplate ? editingTemplate.type : templatesTab
                            ),
                          })
                        }
                      >
                        Вставить заготовку
                      </button>
                    </div>
                    <textarea
                      value={templateForm.html_content}
                      onChange={(e) =>
                        setTemplateForm({
                          ...templateForm,
                          html_content: e.target.value,
                        })
                      }
                      rows={8}
                      required
                    />
                    {templateForm.html_content && (
                      <div className="html-preview">
                        <div className="html-preview-label">Предпросмотр</div>
                        <div
                          className="html-preview-body email-preview-shell"
                          dangerouslySetInnerHTML={{ __html: templateForm.html_content }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => openCreateTemplate(templatesTab)}
                    >
                      Очистить форму
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={
                        createTemplateMutation.isPending || updateTemplateMutation.isPending
                      }
                    >
                      {editingTemplate
                        ? updateTemplateMutation.isPending
                          ? 'Сохранение...'
                          : 'Сохранить'
                        : createTemplateMutation.isPending
                          ? 'Создание...'
                          : 'Создать шаблон'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowManageTemplates(false)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEmail && (
        <div className="modal-overlay" onClick={() => setSelectedEmail(null)}>
          <div className="modal email-modal" onClick={(e) => e.stopPropagation()}>
            <div className="email-header">
              <div className="email-header-main">
                <div className="email-header-peers">
                  <div className="email-peer-row">
                    <PeerAvatar
                      src={selectedEmail.from_avatar_url}
                      email={selectedEmail.from_address}
                      size={40}
                    />
                    <div>
                      <div className="email-peer-label">От</div>
                      {selectedEmail.from_name && (
                        <div className="email-peer-address">{selectedEmail.from_name}</div>
                      )}
                      <div className={selectedEmail.from_name ? 'email-peer-email' : 'email-peer-address'}>
                        {selectedEmail.from_address}
                      </div>
                    </div>
                  </div>
                  <div className="email-peer-row">
                    <PeerAvatar
                      src={selectedEmail.to_avatar_url}
                      email={selectedEmail.to_address}
                      size={40}
                    />
                    <div>
                      <div className="email-peer-label">Кому</div>
                      {selectedEmail.to_name && (
                        <div className="email-peer-address">{selectedEmail.to_name}</div>
                      )}
                      <div className={selectedEmail.to_name ? 'email-peer-email' : 'email-peer-address'}>
                        {selectedEmail.to_address}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="email-subject-large">{selectedEmail.subject || '(Без темы)'}</div>
                <div className="email-meta">
                  <strong>Дата:</strong> {new Date(selectedEmail.received_at).toLocaleString('ru-RU')}
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Удалить письмо?')) {
                    deleteMutation.mutate(selectedEmail.id)
                  }
                }}
                className="btn-delete-email"
              >
                Удалить
              </button>
            </div>
            <div className="email-body">
              {selectedEmail.html_body ? (
                <div
                  className="email-html-content email-preview-shell"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.html_body }}
                />
              ) : (
                <pre>{selectedEmail.body}</pre>
              )}
            </div>
            <div className="modal-actions">
              <button onClick={() => setSelectedEmail(null)} className="btn-secondary">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

