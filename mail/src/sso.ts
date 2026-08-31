import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthStore } from './store/authStore'

export const ADMIN_APP_URL =
  (import.meta.env.VITE_ADMIN_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://admin.alexol.io'

export const CHAT_APP_URL =
  (import.meta.env.VITE_CHAT_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://chat.alexol.io'

const CHAT_WINDOW_NAME = 'alexol-chat'
const HANDOFF_FORM_ID = 'alexol-chat-handoff-form'

export async function openSiteAdmin(api: {
  post: (url: string, data?: unknown) => Promise<{ data: { ticket: string } }>;
}): Promise<void> {
  const { data } = await api.post('/auth/sso/admin-ticket');
  window.location.assign(`${ADMIN_APP_URL}/sso?ticket=${encodeURIComponent(data.ticket)}`);
}

/**
 * Open chat with mailbox SSO in a named tab so the mail page stays put.
 * Same-tab POST used to leave the header button stuck in loading (`…`)
 * whenever chat opened without unloading this document (back / extra tab).
 */
export function openChat(): void {
  const token = useAuthStore.getState().token
  if (!token) {
    window.open(CHAT_APP_URL, CHAT_WINDOW_NAME)
    return
  }

  document.getElementById(HANDOFF_FORM_ID)?.remove()

  const form = document.createElement('form')
  form.id = HANDOFF_FORM_ID
  form.method = 'POST'
  form.action = '/api/oauth/chat-handoff-redirect'
  form.target = CHAT_WINDOW_NAME
  form.style.display = 'none'

  const input = document.createElement('input')
  input.type = 'hidden'
  input.name = 'access_token'
  input.value = token
  form.appendChild(input)
  document.body.appendChild(form)
  form.submit()
  window.setTimeout(() => form.remove(), 8000)
}

export function useChatHandoff(): {
  chatLoading: boolean
  openChatUi: (onError?: () => void) => void
} {
  const [chatLoading, setChatLoading] = useState(false)
  const loadingTimer = useRef(0)

  useEffect(() => {
    const reset = () => {
      window.clearTimeout(loadingTimer.current)
      setChatLoading(false)
    }
    window.addEventListener('pageshow', reset)
    return () => {
      window.clearTimeout(loadingTimer.current)
      window.removeEventListener('pageshow', reset)
    }
  }, [])

  const openChatUi = useCallback((onError?: () => void) => {
    window.clearTimeout(loadingTimer.current)
    setChatLoading(true)
    try {
      openChat()
    } catch {
      onError?.()
      window.open(CHAT_APP_URL, CHAT_WINDOW_NAME)
    }
    loadingTimer.current = window.setTimeout(() => setChatLoading(false), 600)
  }, [])

  return { chatLoading, openChatUi }
}
