import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../api/axios'
import { Mail, Send, Inbox, LogOut, User, RefreshCw, Users, FileText, Menu, X, LayoutDashboard, File, Edit, Trash2, PenLine, Reply, Forward, ArrowLeft, Calendar, Video, MessageCircle } from 'lucide-react'
import { ThemeSwitch } from '../components/ThemeSwitch'
import { PeerAvatar } from '../components/PeerAvatar'
import { useToast } from '../components/Toast'
import { openSiteAdmin, useChatHandoff } from '../sso'
import {
  starterHtml,
  templateTypeLabel,
  type EmailTemplate,
  type TemplateType,
} from '../utils/templateStarters'
import { buildAlexolSignature, upgradeSignatureAssets } from '../utils/alexolSignature'
import {
  applyTemplatesToHtml,
  buildComposePreviewHtml,
  buildForwardCompose,
  buildReplyCompose,
  firstEmailAddress,
  looksLikeEmail,
  normalizeComposeLinks,
  replaceOrAppendSignature,
} from '../utils/composeEmail'
import { EmailHtmlFrame } from '../components/EmailHtmlFrame'
import { ComposeToField } from '../components/ComposeToField'
import { htmlForDisplay, previewTextFromParts } from '../utils/htmlEmail'
import CompanyContacts from '../components/CompanyContacts'
import CompanyCalendar from '../components/CompanyCalendar'
import { openJitsiRoom, personalJitsiUrl } from '../utils/jitsi'
import { JitsiRoomChoice } from '../components/JitsiRoomChoice'
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

function emailPreviewText(email: Email): string {
  return previewTextFromParts(email.html_body, email.body)
}

function formatListDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function UserDashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const queryClient = useQueryClient()
  
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'contacts' | 'calendar'>('inbox')
  const [showCompose, setShowCompose] = useState(false)
  const [showJitsiChoice, setShowJitsiChoice] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [siteAdminLoading, setSiteAdminLoading] = useState(false)
  const { chatLoading, openChatUi } = useChatHandoff()
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

  useEffect(() => {
    let cancelled = false
    api
      .get('/auth/me')
      .then(({ data }) => {
        if (!cancelled && data) setUser(data)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [setUser])

  // Fetch inbox
  const { data: inbox } = useQuery({
    queryKey: ['inbox'],
    queryFn: async () => {
      const { data } = await api.get<Email[]>('/emails/inbox')
      return data
    },
    refetchInterval: 10000,
  })

  // Fetch sent
  const { data: sent } = useQuery({
    queryKey: ['sent'],
    queryFn: async () => {
      const { data } = await api.get<Email[]>('/emails/sent')
      return data
    },
    refetchInterval: 10000,
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
          formData.append('html_body', upgradeSignatureAssets(emailData.html_body))
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
          html_body: emailData.html_body
            ? upgradeSignatureAssets(emailData.html_body)
            : emailData.html_body,
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

    if (!composeData.to_address.trim()) {
      toast.error('Укажите хотя бы одного получателя')
      return
    }
    const leftover = composeData.to_address
      .split(/[;,]+/)
      .map((part) => part.trim())
      .filter((part) => part && !looksLikeEmail(part) && !part.includes('@'))
    if (leftover.length) {
      toast.error('Выберите коллегу из списка или укажите полный email')
      return
    }

    const mergedHtml = buildComposePreviewHtml(composeData.body, composeData.html_body)

    if (!composeData.body.trim() && !mergedHtml.trim()) {
      toast.error('Напишите текст письма или вставьте шаблон.')
      return
    }

    const currentHtml = mergedHtml ? normalizeComposeLinks(mergedHtml) : ''

    sendMutation.mutate({
      ...composeData,
      html_body: currentHtml,
      attachments,
    })
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

  const startJitsi = async (openRoom: boolean) => {
    const url = personalJitsiUrl(user?.username, user?.email, openRoom)
    setShowJitsiChoice(false)
    try {
      await navigator.clipboard.writeText(url)
      toast.success(openRoom ? 'Открытая комната — ссылка скопирована' : 'Закрытая комната — ссылка скопирована')
    } catch {
      /* clipboard may be blocked */
    }
    await openJitsiRoom(url, user)
    setMobileNavOpen(false)
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

    setComposeData((prev) => ({
      ...prev,
      html_body: applyTemplatesToHtml(prev.html_body, selected),
    }))

    setShowTemplatesModal(false)
    setSelectedTemplateIds([])
  }

  const insertQuickSignature = async () => {
    let person = {
      full_name: user?.full_name,
      job_title: user?.job_title,
      phone: user?.phone,
      email: user?.email,
      telegram: user?.telegram,
      avatar_url: user?.avatar_url,
    }

    try {
      const { data } = await api.get('/auth/me')
      if (data) {
        setUser(data)
        person = {
          full_name: data.full_name,
          job_title: data.job_title,
          phone: data.phone,
          email: data.email,
          telegram: data.telegram,
          avatar_url: data.avatar_url,
        }
      }
    } catch {
      /* keep values from the session */
    }

    const signatureHtml = buildAlexolSignature(person)

    setComposeData((prev) => ({
      ...prev,
      html_body: replaceOrAppendSignature(prev.html_body, signatureHtml),
    }))

    const missing: string[] = []
    if (!String(person.job_title || '').trim()) missing.push('должность')
    if (!String(person.phone || '').trim()) missing.push('телефон')
    if (missing.length) {
      toast.info(`Подпись вставлена. В профиле нет: ${missing.join(', ')}.`)
    } else {
      toast.success('Подпись собрана из профиля')
    }
  }

  const composePreviewHtml = buildComposePreviewHtml(composeData.body, composeData.html_body)
  const readerHtml = selectedEmail
    ? htmlForDisplay(selectedEmail.html_body, selectedEmail.body)
    : ''

  const openReply = (email: Email) => {
    setComposeData(buildReplyCompose(email, user?.email || ''))
    setAttachments([])
    setAttachmentPreviews((prev) => {
      prev.forEach((p) => p.url && URL.revokeObjectURL(p.url))
      return []
    })
    setSelectedEmail(email)
    setShowCompose(true)
  }

  const openForward = (email: Email) => {
    setComposeData(buildForwardCompose(email))
    setAttachments([])
    setAttachmentPreviews((prev) => {
      prev.forEach((p) => p.url && URL.revokeObjectURL(p.url))
      return []
    })
    setSelectedEmail(email)
    setShowCompose(true)
  }

  const openEmail = (email: Email) => {
    const opened = { ...email, is_read: email.is_sent ? email.is_read : true }
    setSelectedEmail(opened)
    if (!email.is_read && !email.is_sent) {
      queryClient.setQueryData<Email[]>(['inbox'], (old) =>
        (old || []).map((e) => (e.id === email.id ? { ...e, is_read: true } : e))
      )
      void (async () => {
        try {
          const { data } = await api.post<Email>(`/emails/${email.id}/read`)
          setSelectedEmail((current) =>
            current?.id === email.id ? { ...data, is_read: true } : current
          )
          queryClient.setQueryData<Email[]>(['inbox'], (old) =>
            (old || []).map((e) =>
              e.id === email.id ? { ...e, ...data, is_read: true } : e
            )
          )
        } catch {
          queryClient.setQueryData<Email[]>(['inbox'], (old) =>
            (old || []).map((e) => (e.id === email.id ? { ...e, is_read: false } : e))
          )
          setSelectedEmail((current) => (current?.id === email.id ? email : current))
        }
      })()
    }
  }

  return (
    <div className={`dashboard-container ${selectedEmail ? 'is-reading' : ''}`}>
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
          <Mail size={28} className="nav-brand-icon" />
          <div>
            <h1>Почта</h1>
            <span className="domain">alexol.io</span>
          </div>
        </div>
        <div className="nav-actions">
          <ThemeSwitch />
          <div className="nav-actions__links">
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
            <button
              type="button"
              onClick={() =>
                openChatUi(() => toast.error('Не удалось открыть чат'))
              }
              className="btn-profile"
              disabled={chatLoading}
              title="chat.alexol.io — тот же вход, что у почты"
            >
              <MessageCircle size={20} />
              <span className="btn-label">{chatLoading ? '…' : 'Чат'}</span>
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
          <div className="sidebar-actions">
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
          <button type="button" onClick={() => setShowJitsiChoice(true)} className="btn-jitsi">
            <Video size={20} />
            Созвон Jitsi
          </button>
          </div>

          <div className="sidebar-menu">
            <button
              className={`menu-item ${activeTab === 'inbox' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('inbox')
                setSelectedEmail(null)
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
                setSelectedEmail(null)
                setMobileNavOpen(false)
              }}
            >
              <Send size={20} />
              Отправленные
            </button>
            <button
              className={`menu-item ${activeTab === 'contacts' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('contacts')
                setSelectedEmail(null)
                setMobileNavOpen(false)
              }}
            >
              <Users size={20} />
              Контакты
            </button>
            <button
              className={`menu-item ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('calendar')
                setSelectedEmail(null)
                setMobileNavOpen(false)
              }}
            >
              <Calendar size={20} />
              Календарь
            </button>
          </div>

          <div className="sidebar-account-actions">
            {user?.is_admin && (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    setMobileNavOpen(false)
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
                >
                  <LayoutDashboard size={20} />
                  <span className="btn-label">{siteAdminLoading ? '…' : 'Сайт'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false)
                    navigate('/admin')
                  }}
                  className="btn-admin-panel"
                >
                  <Users size={20} />
                  <span className="btn-label">Ящики</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false)
                setShowManageTemplates(true)
                setTemplatesTab('body')
                openCreateTemplate('body')
              }}
              className="btn-profile"
            >
              <FileText size={20} />
              <span className="btn-label">Шаблоны</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false)
                openChatUi(() => toast.error('Не удалось открыть чат'))
              }}
              className="btn-profile"
              disabled={chatLoading}
            >
              <MessageCircle size={20} />
              <span className="btn-label">{chatLoading ? '…' : 'Чат'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false)
                navigate('/profile')
              }}
              className="btn-profile"
            >
              <User size={20} />
              <span className="btn-label">Профиль</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false)
                handleLogout()
              }}
              className="btn-logout"
            >
              <LogOut size={20} />
              <span className="btn-label">Выйти</span>
            </button>
          </div>

          <div className="user-info">
            <PeerAvatar
              src={user?.avatar_url}
              email={user?.email || ''}
              name={user?.full_name}
              size={48}
              className="user-avatar"
            />
            <div>
              <div className="user-name">{user?.full_name}</div>
              <div className="user-email">{user?.email}</div>
              {user?.is_admin && <div className="user-role">Администратор</div>}
            </div>
          </div>
        </aside>

        {(activeTab === 'inbox' || activeTab === 'sent') && (
        <div className={`mail-workspace ${selectedEmail ? 'has-selection' : ''}`}>
          <div className="mail-list-pane">
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
                const peerAddress = firstEmailAddress(
                  email.is_sent ? email.to_address : email.from_address
                )
                const peerAvatar = email.is_sent ? email.to_avatar_url : email.from_avatar_url
                const peerName = email.is_sent ? email.to_name : email.from_name
                const preview = emailPreviewText(email)
                return (
                <div
                  key={email.id}
                  className={`email-item ${!email.is_read && !email.is_sent ? 'unread' : ''} ${selectedEmail?.id === email.id ? 'selected' : ''}`}
                  onClick={() => openEmail(email)}
                >
                  <PeerAvatar src={peerAvatar} email={peerAddress} name={peerName} size={40} />
                  <div className="email-item-body">
                  <div className="email-item-top">
                    <div className="email-from">
                      {peerName ? (
                        <span className="email-peer-name">{peerName}</span>
                      ) : (
                        peerAddress
                      )}
                    </div>
                    <div className="email-date">{formatListDate(email.received_at)}</div>
                  </div>
                  <div className="email-subject">{email.subject || '(Без темы)'}</div>
                  <div className="email-preview">
                    {preview ? (preview.length > 90 ? `${preview.slice(0, 90)}…` : preview) : 'Нет текста'}
                  </div>
                  </div>
                </div>
                )
              })
            )}
          </div>
          </div>

          <section className="mail-reader-pane" aria-label="Письмо">
            {!selectedEmail ? (
              <div className="mail-reader-empty">
                <Mail size={56} />
                <h3>Выберите письмо</h3>
                <p>Откройте сообщение из списка слева — как в Gmail или Яндекс Почте.</p>
              </div>
            ) : (
              <>
                <div className="mail-reader-toolbar">
                  <button
                    type="button"
                    className="mail-toolbar-btn mail-toolbar-back"
                    onClick={() => setSelectedEmail(null)}
                    aria-label="К списку"
                  >
                    <ArrowLeft size={18} />
                    <span>К списку</span>
                  </button>
                  <button
                    type="button"
                    className="mail-toolbar-btn"
                    onClick={() => openReply(selectedEmail)}
                    aria-label="Ответить"
                  >
                    <Reply size={18} />
                    <span>Ответить</span>
                  </button>
                  <button
                    type="button"
                    className="mail-toolbar-btn"
                    onClick={() => openForward(selectedEmail)}
                    aria-label="Переслать"
                  >
                    <Forward size={18} />
                    <span>Переслать</span>
                  </button>
                  <span className="mail-toolbar-spacer" />
                  <button
                    type="button"
                    className="mail-toolbar-btn danger"
                    aria-label="Удалить"
                    onClick={() => {
                      if (confirm('Удалить письмо?')) {
                        deleteMutation.mutate(selectedEmail.id)
                      }
                    }}
                  >
                    <Trash2 size={18} />
                    <span>Удалить</span>
                  </button>
                </div>
                <article className="mail-reader-article">
                  <h2 className="mail-reader-subject">{selectedEmail.subject || '(Без темы)'}</h2>
                  <div className="mail-reader-meta">
                    <PeerAvatar
                      src={selectedEmail.from_avatar_url}
                      email={selectedEmail.from_address}
                      name={selectedEmail.from_name}
                      size={44}
                    />
                    <div className="mail-reader-meta-text">
                      <div className="mail-reader-from-line">
                        <span className="mail-reader-from-name">
                          {selectedEmail.from_name || selectedEmail.from_address}
                        </span>
                        {selectedEmail.from_name && (
                          <span className="mail-reader-from-email">&lt;{selectedEmail.from_address}&gt;</span>
                        )}
                      </div>
                      <div className="mail-reader-to-line">
                        кому: {selectedEmail.to_name ? `${selectedEmail.to_name} ` : ''}
                        {selectedEmail.to_address}
                      </div>
                    </div>
                    <time className="mail-reader-date" dateTime={selectedEmail.received_at}>
                      {formatFullDate(selectedEmail.received_at)}
                    </time>
                  </div>
                  <div className="email-body">
                    {readerHtml ? <EmailHtmlFrame html={readerHtml} /> : <pre>{selectedEmail.body}</pre>}
                  </div>
                </article>
              </>
            )}
          </section>
        </div>
        )}
        {activeTab === 'contacts' && <CompanyContacts />}
        {activeTab === 'calendar' && <CompanyCalendar />}
      </div>

      <nav className="mobile-bottom-nav" aria-label="Быстрые действия">
        <button
          type="button"
          className={activeTab === 'inbox' ? 'active' : ''}
          onClick={() => {
            setActiveTab('inbox')
            setSelectedEmail(null)
          }}
        >
          <Inbox size={20} />
          Входящие
        </button>
        <button
          type="button"
          className={activeTab === 'contacts' ? 'active' : ''}
          onClick={() => {
            setActiveTab('contacts')
            setSelectedEmail(null)
          }}
        >
          <Users size={20} />
          Контакты
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
          className={activeTab === 'calendar' ? 'active' : ''}
          onClick={() => {
            setActiveTab('calendar')
            setSelectedEmail(null)
          }}
        >
          <Calendar size={20} />
          Календарь
        </button>
      </nav>

      {showCompose && (
        <div className="modal-overlay" onClick={() => setShowCompose(false)}>
          <div className="modal compose-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Новое письмо</h3>
            <form onSubmit={handleSend}>
              <div className="form-group">
                <label>Кому</label>
                <ComposeToField
                  value={composeData.to_address}
                  onChange={(to_address) => setComposeData({ ...composeData, to_address })}
                  disabled={sendMutation.isPending}
                />
                <small className="compose-to-hint">
                  Несколько адресов — через Enter или запятую. Начните вводить фамилию или имя коллеги.
                </small>
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

              <div className="form-group compose-message-group">
                <div className="compose-header-row">
                  <label>Текст письма</label>
                  <div className="compose-actions-right">
                    <button
                      type="button"
                      className="btn-link"
                      onClick={insertQuickSignature}
                      title="ФИО, должность и телефон из профиля; сайт всегда alexol.io"
                    >
                      <PenLine size={16} />
                      Вставить подпись
                    </button>
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
                      Вставить шаблон
                    </button>
                  </div>
                </div>
                <textarea
                  value={composeData.body}
                  onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                  placeholder="Напишите сообщение..."
                  rows={6}
                />
              </div>

              <div className="compose-preview-panel">
                <div className="compose-preview-header">
                  <span className="html-preview-label">Как будет выглядеть письмо</span>
                  <span className="compose-preview-hint">
                    Текст и шаблоны объединяются в одно письмо
                  </span>
                </div>
                <div
                  className="compose-live-preview email-preview-shell"
                  dangerouslySetInnerHTML={{
                    __html:
                      composePreviewHtml ||
                      '<p class="compose-preview-empty">Начните писать или вставьте шаблон — здесь появится итоговое письмо.</p>',
                  }}
                />
              </div>

              <details className="compose-advanced">
                <summary>HTML-фрагменты шаблонов</summary>
                <textarea
                  value={composeData.html_body}
                  onChange={(e) => setComposeData({ ...composeData, html_body: e.target.value })}
                  placeholder="Сюда попадают шаблоны и подпись. Можно править вручную."
                  rows={5}
                />
              </details>

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
                Применить в письмо
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
      <JitsiRoomChoice
        open={showJitsiChoice}
        onClose={() => setShowJitsiChoice(false)}
        onPick={(openRoom) => void startJitsi(openRoom)}
      />
    </div>
  )
}

