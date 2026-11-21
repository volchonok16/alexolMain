import { upgradeSignatureAssets } from './alexolSignature'
import { htmlForDisplay } from './htmlEmail'
import type { EmailTemplate } from './templateStarters'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Plain text from the compose textarea → HTML paragraphs. */
export function textToHtmlParagraphs(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''

  return trimmed
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').map((line) => escapeHtml(line)).join('<br />')
      return (
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;">${lines}</p>`
      )
    })
    .join('')
}

export function extractSignature(html: string): string {
  if (!html || typeof document === 'undefined') return ''
  const wrap = document.createElement('div')
  wrap.innerHTML = html
  const sig = wrap.querySelector('[data-alexol-sig="1"]')
  return sig ? sig.outerHTML : ''
}

export function htmlWithoutSignature(html: string): string {
  if (!html || typeof document === 'undefined') return html || ''
  const wrap = document.createElement('div')
  wrap.innerHTML = html
  wrap.querySelectorAll('[data-alexol-sig="1"]').forEach((node) => node.remove())
  return wrap.innerHTML.trim()
}

export function replaceOrAppendSignature(html: string, signatureHtml: string): string {
  const without = htmlWithoutSignature(html)
  const sig = upgradeSignatureAssets(signatureHtml)
  if (!without) return sig
  return `${without}<br /><br />${sig}`
}

/** Merge selected templates into the HTML fragment (body / signature / other). */
export function applyTemplatesToHtml(currentHtml: string, selected: EmailTemplate[]): string {
  let html = currentHtml || ''

  const bodyTemplates = selected.filter((t) => t.type === 'body')
  const signatures = selected.filter((t) => t.type === 'signature')
  const otherTemplates = selected.filter((t) => t.type === 'other')

  if (bodyTemplates.length > 0) {
    const existingSig = extractSignature(html)
    html = bodyTemplates[0].html_content
    if (existingSig) {
      html = `${html}<br /><br />${existingSig}`
    }
  }

  signatures.forEach((tpl) => {
    html = replaceOrAppendSignature(html, tpl.html_content)
  })

  otherTemplates.forEach((tpl) => {
    html = html ? `${html}<br /><br />${tpl.html_content}` : tpl.html_content
  })

  return html
}

/** Unified body: user text on top, templates (incl. signature) below. */
export function buildComposePreviewHtml(plainBody: string, templateHtml: string): string {
  const textHtml = textToHtmlParagraphs(plainBody)
  const fragments = (templateHtml || '').trim()

  if (!textHtml && !fragments) return ''
  const merged = !textHtml
    ? fragments
    : !fragments
      ? textHtml
      : `${textHtml}<div style="margin-top:4px;">${fragments}</div>`
  return upgradeSignatureAssets(merged)
}

export function normalizeComposeLinks(html: string): string {
  if (!html || typeof document === 'undefined') return html

  const wrapper = document.createElement('div')
  wrapper.innerHTML = html

  wrapper.querySelectorAll('a').forEach((anchor) => {
    const text = (anchor.textContent || '').trim()
    if (!text) return

    const digitsOnly = text.replace(/\D+/g, '')
    const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
    const looksLikePhone = digitsOnly.length >= 5 && !text.includes('@')

    if (looksLikePhone) {
      const telValue = text.includes('+') ? `+${digitsOnly}` : digitsOnly
      if (telValue) anchor.href = `tel:${telValue}`
    } else if (emailLike) {
      anchor.href = `mailto:${text}`
    } else if (!/^https?:\/\//i.test(text)) {
      anchor.href = `https://${text}`
    } else {
      anchor.href = text
    }
  })

  return wrapper.innerHTML
}

export interface ComposeEmailSource {
  from_address: string
  to_address: string
  subject: string
  body: string
  html_body?: string
  is_sent: boolean
  received_at: string
  from_name?: string | null
  to_name?: string | null
}

export function replySubject(subject: string): string {
  const trimmed = (subject || '').trim()
  if (/^re:\s/i.test(trimmed)) return trimmed
  return `Re: ${trimmed || '(Без темы)'}`
}

export function forwardSubject(subject: string): string {
  const trimmed = (subject || '').trim()
  if (/^fwd:\s/i.test(trimmed) || /^fw:\s/i.test(trimmed)) return trimmed
  return `Fwd: ${trimmed || '(Без темы)'}`
}

export function replyRecipient(email: ComposeEmailSource, userEmail: string): string {
  if (email.is_sent) return email.to_address
  if (email.from_address.toLowerCase() === userEmail.toLowerCase()) return email.to_address
  return email.from_address
}

export function buildQuotedHtml(email: ComposeEmailSource): string {
  const date = new Date(email.received_at).toLocaleString('ru-RU')
  const fromLine = email.from_name
    ? `${escapeHtml(email.from_name)} &lt;${escapeHtml(email.from_address)}&gt;`
    : escapeHtml(email.from_address)
  const original = htmlForDisplay(email.html_body, email.body)
    ? htmlForDisplay(email.html_body, email.body)
    : `<pre style="margin:0;white-space:pre-wrap;font-family:inherit;">${escapeHtml(email.body || '')}</pre>`

  return [
    '<div style="color:#8B95A8;font-size:13px;margin-top:16px;margin-bottom:8px;">',
    `${escapeHtml(date)}, ${fromLine}:`,
    '</div>',
    '<blockquote style="border-left:3px solid rgba(10,227,255,0.45);margin:0;padding-left:12px;">',
    original,
    '</blockquote>',
  ].join('')
}

export function buildForwardHtml(email: ComposeEmailSource): string {
  const date = new Date(email.received_at).toLocaleString('ru-RU')
  const fromLine = email.from_name
    ? `${escapeHtml(email.from_name)} &lt;${escapeHtml(email.from_address)}&gt;`
    : escapeHtml(email.from_address)
  const original = htmlForDisplay(email.html_body, email.body)
    ? htmlForDisplay(email.html_body, email.body)
    : `<pre style="margin:0;white-space:pre-wrap;font-family:inherit;">${escapeHtml(email.body || '')}</pre>`

  return [
    '<div style="color:#8B95A8;font-size:12px;line-height:1.6;margin-top:16px;margin-bottom:10px;">',
    '---------- Пересланное сообщение ----------<br />',
    `От: ${fromLine}<br />`,
    `Кому: ${escapeHtml(email.to_address)}<br />`,
    `Дата: ${escapeHtml(date)}<br />`,
    `Тема: ${escapeHtml(email.subject || '(Без темы)')}`,
    '</div>',
    '<blockquote style="border-left:3px solid rgba(10,227,255,0.45);margin:0;padding-left:12px;">',
    original,
    '</blockquote>',
  ].join('')
}

export function buildReplyCompose(email: ComposeEmailSource, userEmail: string) {
  return {
    to_address: replyRecipient(email, userEmail),
    subject: replySubject(email.subject),
    body: '',
    html_body: buildQuotedHtml(email),
  }
}

export function buildForwardCompose(email: ComposeEmailSource) {
  return {
    to_address: '',
    subject: forwardSubject(email.subject),
    body: '',
    html_body: buildForwardHtml(email),
  }
}

export type RecipientChip = {
  email: string
  name?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function parseRecipientChips(raw: string): RecipientChip[] {
  const seen = new Set<string>()
  const chips: RecipientChip[] = []
  for (const chunk of (raw || '').split(/[;,]+/)) {
    const trimmed = chunk.trim()
    if (!trimmed) continue
    const angle = trimmed.match(/^(.*?)\s*<([^>]+)>\s*$/)
    const email = (angle ? angle[2] : trimmed).trim().toLowerCase()
    if (!email || seen.has(email) || !EMAIL_RE.test(email)) continue
    seen.add(email)
    const name = angle ? angle[1].replace(/^["']|["']$/g, '').trim() : ''
    chips.push(name && !EMAIL_RE.test(name) ? { email, name } : { email })
  }
  return chips
}

export function stringifyRecipients(chips: RecipientChip[], draft = ''): string {
  const emails = chips.map((chip) => chip.email)
  const extra = draft.trim()
  if (extra) emails.push(extra)
  return emails.join(', ')
}

export function firstEmailAddress(raw: string): string {
  return parseRecipientChips(raw)[0]?.email || (raw || '').trim()
}

export function looksLikeEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}
