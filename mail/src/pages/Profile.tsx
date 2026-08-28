import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../api/axios'
import { ArrowLeft, Upload, Save } from 'lucide-react'
import { ThemeSwitch } from '../components/ThemeSwitch'
import { PasswordInput } from '../components/PasswordInput'
import { useToast } from '../components/Toast'
import { resolveAvatarUrl } from '../utils/avatarUrl'
import './Profile.css'

export default function Profile() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user, setUser } = useAuthStore()

  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    job_title: user?.job_title || '',
    phone: user?.phone || '',
    telegram: user?.telegram || '',
    password: '',
    confirmPassword: '',
  })

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarBroken, setAvatarBroken] = useState(false)

  const remoteAvatar = resolveAvatarUrl(user?.avatar_url)
  const avatarSrc = avatarPreview || remoteAvatar

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const { data: updatedUser } = await api.put('/profile', data)
      return updatedUser
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      toast.success('Профиль обновлён')
      setFormData((prev) => ({ ...prev, password: '', confirmPassword: '' }))
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Ошибка обновления профиля')
    },
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData()
      body.append('file', file)
      const { data } = await api.post('/profile/avatar', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data as { avatar_url: string }
    },
    onSuccess: (data) => {
      const nextUrl = resolveAvatarUrl(data.avatar_url) || data.avatar_url
      const busted = nextUrl.includes('?')
        ? `${nextUrl}&t=${Date.now()}`
        : `${nextUrl}?t=${Date.now()}`
      if (user) {
        setUser({ ...user, avatar_url: busted })
      }
      setAvatarBroken(false)
      setAvatarFile(null)
      toast.success('Аватар обновлён')

      // Drop local preview only after remote image actually loads
      const probe = new Image()
      probe.onload = () => {
        setAvatarPreview(null)
        setAvatarBroken(false)
      }
      probe.onerror = () => {
        // Keep data-URL preview so UI doesn't fall back to "A"
        toast.info('Фото сохранено. Если картинка не появится - обновите страницу.')
      }
      probe.src = busted
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Ошибка загрузки аватара')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Пароли не совпадают')
      return
    }

    const updateData: Record<string, string> = {
      full_name: formData.full_name,
      job_title: formData.job_title,
      phone: formData.phone,
      telegram: formData.telegram,
    }

    if (formData.password) {
      updateData.password = formData.password
    }

    updateMutation.mutate(updateData)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Выберите файл изображения (JPG, PNG, WebP)')
      return
    }
    if (file.type.includes('heic') || file.type.includes('heif')) {
      toast.error('HEIC не поддерживается. Сохраните как JPG или PNG.')
      return
    }
    setAvatarBroken(false)
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleAvatarUpload = () => {
    if (avatarFile) {
      uploadAvatarMutation.mutate(avatarFile)
    }
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <button onClick={() => navigate(-1)} className="btn-back">
          <ArrowLeft size={20} />
          Назад
        </button>
        <h1>Профиль</h1>
        <div className="profile-header-right">
          <ThemeSwitch />
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="avatar-section">
            <div className="avatar-wrapper">
              {avatarSrc && !avatarBroken ? (
                <img
                  key={avatarSrc}
                  src={avatarSrc}
                  alt="Avatar"
                  className="profile-avatar"
                  onError={() => {
                    if (!avatarPreview) setAvatarBroken(true)
                  }}
                />
              ) : (
                <div className="avatar-placeholder">
                  {user?.full_name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="avatar-actions">
              <label htmlFor="avatar-input" className="btn-upload">
                <Upload size={20} />
                Выбрать фото
              </label>
              <input
                id="avatar-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />

              {avatarFile && (
                <button
                  onClick={handleAvatarUpload}
                  className="btn-primary"
                  disabled={uploadAvatarMutation.isPending}
                >
                  {uploadAvatarMutation.isPending ? 'Загрузка...' : 'Сохранить фото'}
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={user?.email}
                disabled
                className="input-disabled"
              />
              <small>Email нельзя изменить</small>
            </div>

            <div className="form-group">
              <label>ФИО</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
              <small>Попадает в кнопку «Вставить подпись»</small>
            </div>

            <div className="form-group">
              <label>Должность</label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                placeholder="CEO & Founder"
              />
              <small>В подписи будет: должность · Alexol. Сайт всегда alexol.io</small>
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
              <small>Нужен для сброса пароля: напишите /start боту новостей</small>
            </div>

            <div className="form-divider">
              <span>Изменить пароль (оставьте пустым, если не хотите менять)</span>
            </div>

            <div className="form-group">
              <label>Новый пароль</label>
              <PasswordInput
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label>Подтвердите пароль</label>
              <PasswordInput
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="btn-save"
              disabled={updateMutation.isPending}
            >
              <Save size={20} />
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
