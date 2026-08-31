import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../api/axios'
import { Users, LogOut, UserPlus, Trash2, Edit, Shield, ShieldOff, Mail, FileText, LayoutDashboard, MessageCircle } from 'lucide-react'
import { ThemeSwitch } from '../components/ThemeSwitch'
import { PasswordInput } from '../components/PasswordInput'
import { useToast } from '../components/Toast'
import { openSiteAdmin, useChatHandoff } from '../sso'
import {
  starterHtml,
  templateTypeLabel,
  type EmailTemplate,
  type TemplateType,
} from '../utils/templateStarters'
import './AdminDashboard.css'

interface User {
  id: number
  email: string
  username: string
  full_name: string
  phone?: string
  job_title?: string
  telegram?: string
  is_admin: boolean
  created_at: string
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const logout = useAuthStore((state) => state.logout)
  const currentUser = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [siteAdminLoading, setSiteAdminLoading] = useState(false)
  const { chatLoading, openChatUi } = useChatHandoff()
  
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    job_title: '',
    phone: '',
    telegram: '',
    password: '',
    is_admin: false,
  })
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    job_title: '',
    phone: '',
    telegram: '',
    password: '',
    is_admin: false,
  })

  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [templatesTab, setTemplatesTab] = useState<TemplateType>('body')
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    html_content: '',
    is_shared: true,
  })

  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<User[]>('/admin/users')
      return data
    },
  })

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data } = await api.get<EmailTemplate[]>('/templates')
      return data
    },
  })

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (userData: typeof formData) => {
      const { data } = await api.post('/admin/users', userData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowCreateForm(false)
      setFormData({ full_name: '', username: '', job_title: '', phone: '', telegram: '', password: '', is_admin: false })
      toast.success('Пользователь создан')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Ошибка создания пользователя')
    },
  })

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      await api.delete(`/admin/users/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Пользователь удалён в почте и в админке')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Ошибка удаления пользователя')
    },
  })

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number, data: typeof editFormData }) => {
      const { data: response } = await api.put(`/admin/users/${userId}`, data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowEditForm(false)
      setEditingUser(null)
      toast.success('Пользователь обновлён')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Ошибка обновления пользователя')
    },
  })

  // Toggle admin mutation
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: number, makeAdmin: boolean }) => {
      if (makeAdmin) {
        await api.post(`/admin/users/${userId}/make-admin`)
      } else {
        await api.post(`/admin/users/${userId}/remove-admin`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Ошибка изменения статуса админа')
    },
  })

  // Template mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (payload: {
      name: string
      type: TemplateType
      description: string
      html_content: string
      is_shared: boolean
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
        is_shared: boolean
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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setEditFormData({
      full_name: user.full_name,
      job_title: user.job_title || '',
      phone: user.phone || '',
      telegram: user.telegram || '',
      password: '',
      is_admin: user.is_admin,
    })
    setShowEditForm(true)
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingUser) {
      const updateData: any = {}
      if (editFormData.full_name) updateData.full_name = editFormData.full_name
      updateData.job_title = editFormData.job_title
      updateData.phone = editFormData.phone
      updateData.telegram = editFormData.telegram
      if (editFormData.password) updateData.password = editFormData.password
      updateData.is_admin = editFormData.is_admin
      
      updateMutation.mutate({ userId: editingUser.id, data: updateData })
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filteredTemplates = (templates || []).filter((t) => t.type === templatesTab)

  const openCreateTemplate = (type: TemplateType) => {
    setEditingTemplate(null)
    setTemplateForm({
      name: '',
      description: '',
      html_content: starterHtml(type),
      is_shared: true,
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
      is_shared: Boolean(template.is_shared),
    })
  }

  const handleTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const templateType = editingTemplate ? editingTemplate.type : templatesTab
    if (editingTemplate) {
      updateTemplateMutation.mutate({
        id: editingTemplate.id,
        data: {
          name: templateForm.name,
          type: templateType,
          description: templateForm.description,
          html_content: templateForm.html_content,
          is_shared: templateForm.is_shared,
        },
      })
    } else {
      createTemplateMutation.mutate({
        name: templateForm.name,
        type: templateType,
        description: templateForm.description,
        html_content: templateForm.html_content,
        is_shared: templateForm.is_shared,
      })
    }
  }

  return (
    <div className="admin-container">
      <nav className="admin-nav">
        <div className="nav-brand">
          <h1>Админ-панель</h1>
          <span className="domain">alexol.io</span>
        </div>
        <div className="nav-user">
          <ThemeSwitch />
          <span>{currentUser?.email}</span>
          <button
            onClick={async () => {
              setSiteAdminLoading(true)
              try {
                await openSiteAdmin(api)
              } catch {
                setSiteAdminLoading(false)
                window.open('https://admin.alexol.io', '_blank', 'noopener,noreferrer')
              }
            }}
            className="btn-templates"
            disabled={siteAdminLoading}
          >
            <LayoutDashboard size={20} />
            {siteAdminLoading ? '…' : 'Admin сайта'}
          </button>
          <button
            onClick={() =>
              openChatUi(() => toast.error('Не удалось открыть чат'))
            }
            className="btn-templates"
            disabled={chatLoading}
          >
            <MessageCircle size={20} />
            {chatLoading ? '…' : 'Чат'}
          </button>
          <button
            onClick={() => {
              setShowTemplatesModal(true)
              setTemplatesTab('body')
              openCreateTemplate('body')
            }}
            className="btn-templates"
          >
            <FileText size={20} />
            Управлять шаблонами писем
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn-mail">
            <Mail size={20} />
            Моя почта
          </button>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={20} />
            Выйти
          </button>
        </div>
      </nav>

      <div className="admin-content">
        <div className="content-header">
          <div className="header-title">
            <Users size={24} />
            <div>
              <h2>Управление пользователями</h2>
              <p className="sync-hint">
                Основное создание - в{' '}
                <a href="https://admin.alexol.io/users" target="_blank" rel="noreferrer">
                  admin.alexol.io
                </a>
                . Ящик <code>login@alexol.io</code> создаётся автоматически.
              </p>
            </div>
          </div>
          <button onClick={() => setShowCreateForm(true)} className="btn-create">
            <UserPlus size={20} />
            Создать пользователя
          </button>
        </div>

        {showCreateForm && (
          <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Создание пользователя</h3>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label>ФИО</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Иванов Иван Иванович"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Логин</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="IIvanov"
                    required
                  />
                  <small>Email будет: {formData.username}@alexol.io</small>
                </div>

                <div className="form-group">
                  <label>Должность</label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    placeholder="CEO & Founder"
                  />
                  <small>Для подписи: должность · Alexol</small>
                </div>

                <div className="form-group">
                  <label>Телефон</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+7 900 123-45-67"
                  />
                </div>

                <div className="form-group">
                  <label>Телеграм</label>
                  <input
                    type="text"
                    value={formData.telegram}
                    onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                    placeholder="@username"
                  />
                </div>

                <div className="form-group">
                  <label>Пароль</label>
                  <PasswordInput
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </div>

                <div className="form-group">
                  <label>Роль</label>
                  <select
                    value={formData.is_admin ? 'admin' : 'user'}
                    onChange={(e) =>
                      setFormData({ ...formData, is_admin: e.target.value === 'admin' })
                    }
                  >
                    <option value="user">Пользователь</option>
                    <option value="admin">Админ</option>
                  </select>
                  <small>Синхронизируется с admin.alexol.io</small>
                </div>

                <div className="modal-actions">
                  <button type="button" onClick={() => setShowCreateForm(false)} className="btn-secondary">
                    Отмена
                  </button>
                  <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Создание...' : 'Создать'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditForm && editingUser && (
          <div className="modal-overlay" onClick={() => setShowEditForm(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Редактирование пользователя</h3>
              <p className="edit-user-email">{editingUser.email}</p>
              <form onSubmit={handleUpdate}>
                <div className="form-group">
                  <label>ФИО</label>
                  <input
                    type="text"
                    value={editFormData.full_name}
                    onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                    placeholder="Иванов Иван Иванович"
                  />
                </div>

                <div className="form-group">
                  <label>Должность</label>
                  <input
                    type="text"
                    value={editFormData.job_title}
                    onChange={(e) => setEditFormData({ ...editFormData, job_title: e.target.value })}
                    placeholder="CEO & Founder"
                  />
                </div>

                <div className="form-group">
                  <label>Телефон</label>
                  <input
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    placeholder="+7 900 123-45-67"
                  />
                </div>

                <div className="form-group">
                  <label>Телеграм</label>
                  <input
                    type="text"
                    value={editFormData.telegram}
                    onChange={(e) => setEditFormData({ ...editFormData, telegram: e.target.value })}
                    placeholder="@username"
                  />
                </div>

                <div className="form-group">
                  <label>Новый пароль (оставьте пустым, если не нужно менять)</label>
                  <PasswordInput
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>

                <div className="form-group">
                  <label>Роль</label>
                  <select
                    value={editFormData.is_admin ? 'admin' : 'user'}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, is_admin: e.target.value === 'admin' })
                    }
                  >
                    <option value="user">Пользователь</option>
                    <option value="admin">Админ</option>
                  </select>
                </div>

                <div className="modal-actions">
                  <button type="button" onClick={() => setShowEditForm(false)} className="btn-secondary">
                    Отмена
                  </button>
                  <button type="submit" className="btn-primary" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="users-table">
          {isLoading ? (
            <div className="loading">Загрузка...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>ФИО</th>
                  <th>Должность</th>
                  <th>Email</th>
                  <th>Телефон</th>
                  <th>Телеграм</th>
                  <th>Роль</th>
                  <th>Дата создания</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((user) => (
                  <tr key={user.id}>
                    <td data-label="ID">{user.id}</td>
                    <td data-label="ФИО">{user.full_name}</td>
                    <td data-label="Должность">{user.job_title || '-'}</td>
                    <td data-label="Email">{user.email}</td>
                    <td data-label="Телефон">{user.phone || '-'}</td>
                    <td data-label="Телеграм">{user.telegram || '-'}</td>
                    <td data-label="Роль">
                      <span className={`badge ${user.is_admin ? 'badge-admin' : 'badge-user'}`}>
                        {user.is_admin ? 'Админ' : 'Пользователь'}
                      </span>
                    </td>
                    <td data-label="Дата">{new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
                    <td data-label="Действия">
                      <div className="action-buttons">
                        <button
                          onClick={() => handleEdit(user)}
                          className="btn-edit"
                          title="Редактировать"
                        >
                          <Edit size={16} />
                          <span>Изменить</span>
                        </button>
                        
                        {user.is_admin ? (
                          <button
                            onClick={() => {
                              if (confirm(`Снять права админа с ${user.full_name}?`)) {
                                toggleAdminMutation.mutate({ userId: user.id, makeAdmin: false })
                              }
                            }}
                            className="btn-admin-toggle"
                            title="Снять права админа"
                            disabled={toggleAdminMutation.isPending}
                          >
                            <ShieldOff size={16} />
                            <span>Снять</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (confirm(`Сделать ${user.full_name} админом?`)) {
                                toggleAdminMutation.mutate({ userId: user.id, makeAdmin: true })
                              }
                            }}
                            className="btn-admin-toggle make-admin"
                            title="Сделать админом"
                            disabled={toggleAdminMutation.isPending}
                          >
                            <Shield size={16} />
                            <span>Админ</span>
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Удалить ${user.full_name} в почте и в админке?`
                              )
                            ) {
                              deleteMutation.mutate(user.id)
                            }
                          }}
                          className="btn-delete"
                          title="Удалить в почте и в админке"
                          disabled={deleteMutation.isPending || user.id === currentUser?.id}
                        >
                          <Trash2 size={16} />
                          <span>Удалить</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {showTemplatesModal && (
          <div className="modal-overlay" onClick={() => setShowTemplatesModal(false)}>
            <div className="modal templates-manage-modal" onClick={(e) => e.stopPropagation()}>
              <div className="templates-header">
                <div className="templates-header-top">
                  <h3>Шаблоны писем</h3>
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
                  {filteredTemplates.length > 0 && ` · ${filteredTemplates.length} шт.`}
                </p>
              </div>

              <div className="templates-manage-content">
                <div className="templates-list">
                  {filteredTemplates.length === 0 ? (
                    <p className="empty-state-text">Пока нет шаблонов в этой категории. Создайте справа.</p>
                  ) : (
                    filteredTemplates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className={`template-item-row ${editingTemplate?.id === tpl.id ? 'selected' : ''}`}
                      >
                        <div className="template-main">
                          <div className="template-name">
                            {tpl.name}
                            <span className={`template-badge ${tpl.is_shared ? 'shared' : 'mine'}`}>
                              {tpl.is_shared ? 'общий' : 'личный'}
                            </span>
                          </div>
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
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={templateForm.is_shared}
                          onChange={(e) =>
                            setTemplateForm({ ...templateForm, is_shared: e.target.checked })
                          }
                        />
                        Общий шаблон (видят все пользователи)
                      </label>
                    </div>
                    <div className="form-group">
                      <div className="compose-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label>HTML содержимое</label>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
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
                          <div className="html-preview-label">Предпросмотр шаблона</div>
                          <div
                            className="html-preview-body"
                            dangerouslySetInnerHTML={{ __html: templateForm.html_content }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="modal-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          openCreateTemplate(templatesTab)
                        }}
                      >
                        Очистить форму
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={
                          createTemplateMutation.isPending ||
                          updateTemplateMutation.isPending
                        }
                      >
                        {editingTemplate
                          ? updateTemplateMutation.isPending
                            ? 'Сохранение...'
                            : 'Сохранить изменения'
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
                  onClick={() => setShowTemplatesModal(false)}
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

