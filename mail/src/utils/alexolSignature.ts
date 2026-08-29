/** Per-user Alexol signature. Hosted PNGs on mail.alexol.io (same deploy as the mail SPA). */

const ASSET = 'https://mail.alexol.io/email'
const ASSET_V = 'v=10'
const SITE_HREF = 'https://alexol.io'
const SITE_LABEL = 'alexol.io'
const TELEGRAM_FALLBACK = 'https://t.me/AlexolBot'
const WHATSAPP_FALLBACK = '79095175557'
/** Alexol dark brand tokens — same as alexol.io (globals.scss) */
const CARD = '#0C0F16'
const CYAN = '#0AE3FF'
const MUTED = '#A8B0C0'
const TAGLINE = '#A8B0C0'

export interface SignaturePerson {
  full_name?: string
  job_title?: string
  phone?: string
  email?: string
  telegram?: string
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function telHref(phone: string): string {
  const digits = phone.replace(/\D+/g, '')
  if (!digits) return ''
  return phone.includes('+') ? `tel:+${digits}` : `tel:${digits}`
}

function waHref(phone: string): string {
  let digits = phone.replace(/\D+/g, '')
  if (!digits) digits = WHATSAPP_FALLBACK
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`
  if (digits.length === 10) digits = `7${digits}`
  return `https://wa.me/${digits}`
}

function telegramHref(raw?: string): string {
  const value = (raw || '').trim()
  if (!value) return TELEGRAM_FALLBACK
  if (/^https?:\/\//i.test(value)) return value
  const withoutScheme = value.replace(/^https?:\/\//i, '')
  if (/^(t\.me|telegram\.me)\//i.test(withoutScheme)) return `https://${withoutScheme}`
  const username = value.replace(/^@/, '').replace(/^t\.me\//i, '')
  return username ? `https://t.me/${username}` : TELEGRAM_FALLBACK
}

function png(file: string, width: number, height: number, extra = ''): string {
  return (
    `<img src="${ASSET}/${file}?${ASSET_V}" width="${width}" height="${height}" alt="" border="0" ` +
    `style="display:block;border:0;outline:none;background-color:transparent;background:none;` +
    `width:${width}px;height:${height}px;${extra}" />`
  )
}

function linkHtml(href: string, label: string): string {
  return (
    `<a href="${esc(href)}" style="font-family:Arial,Helvetica,sans-serif;` +
    `font-size:12px;color:${CYAN};text-decoration:none;">` +
    `<span style="color:${CYAN};text-decoration:none;">${esc(label)}</span></a>`
  )
}

function contactRow(iconFile: string, innerHtml: string, last: boolean): string {
  const iconPad = last ? '0 8px 0 0' : '0 8px 6px 0'
  const textPad = last ? '0' : '0 0 6px 0'
  return [
    '<tr>',
    `<td style="padding:${iconPad};vertical-align:middle;width:18px;font-size:0;line-height:0;background:transparent;">`,
    png(iconFile, 16, 16),
    '</td>',
    `<td style="padding:${textPad};vertical-align:middle;background:transparent;">${innerHtml}</td>`,
    '</tr>',
  ].join('')
}

function socialIcon(href: string, file: string, alt: string): string {
  return [
    `<a href="${esc(href)}" title="${esc(alt)}" ` +
      `style="text-decoration:none;border:0;background:transparent;display:inline-block;">`,
    png(file, 24, 24),
    '</a>',
  ].join('')
}

export function buildAlexolSignature(person: SignaturePerson): string {
  const name = (person.full_name || '').trim() || 'Alexol'
  const title = (person.job_title || '').trim()
  const roleLine = title ? `${title} · Alexol` : 'Alexol'
  const phone = (person.phone || '').trim()
  const email = (person.email || '').trim()
  const tg = telegramHref(person.telegram)
  const wa = waHref(phone)

  const items: { icon: string; inner: string }[] = []
  if (phone) {
    const href = telHref(phone)
    items.push({ icon: 'icon-phone.png', inner: href ? linkHtml(href, phone) : esc(phone) })
  }
  if (email) {
    items.push({ icon: 'icon-email.png', inner: linkHtml(`mailto:${email}`, email) })
  }
  items.push({ icon: 'icon-web.png', inner: linkHtml(SITE_HREF, SITE_LABEL) })
  const rows = items.map((item, i) => contactRow(item.icon, item.inner, i === items.length - 1))
  const cardBg = `background-color:${CARD};background-image:linear-gradient(${CARD},${CARD});`

  return [
    '<div data-alexol-sig="1" data-alexol-layout="social-top" style="margin:0;padding:0;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="500"',
    ` bgcolor="${CARD}" style="border-collapse:collapse;table-layout:fixed;width:500px;max-width:500px;`,
    `${cardBg}border-radius:10px;">`,
    '<tr>',
    `<td width="108" bgcolor="${CARD}" style="padding:18px 8px 18px 16px;vertical-align:middle;width:108px;${cardBg}">`,
    '<img src="https://alexol.io/favicon.png" width="52" height="52" alt="Alexol" border="0"',
    ' style="display:block;margin:0 auto 8px;border:0;background:transparent;width:52px;height:52px;" />',
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;',
    'text-align:center;line-height:1.1;">Alexol</div>',
    '</td>',
    `<td width="18" bgcolor="${CARD}" style="padding:0;vertical-align:middle;width:18px;${cardBg}">`,
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="18"',
    ` bgcolor="${CARD}" style="border-collapse:collapse;width:18px;">`,
    '<tr>',
    `<td bgcolor="${CARD}" style="padding:8px 5px;font-size:0;line-height:0;${cardBg}">`,
    png('sig-divider.png', 7, 168),
    '</td>',
    '</tr>',
    '</table>',
    '</td>',
    `<td width="374" bgcolor="${CARD}" style="padding:16px 18px 16px 10px;vertical-align:middle;width:374px;${cardBg}">`,
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"',
    ` bgcolor="${CARD}" style="border-collapse:collapse;width:100%;">`,
    '<tr>',
    `<td bgcolor="${CARD}" style="vertical-align:top;padding:0 8px 0 0;${cardBg}">`,
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;',
    `line-height:1.2;margin:0 0 3px;">${esc(name)}</div>`,
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUTED};line-height:1.4;margin:0;">`,
    `${esc(roleLine)}</div>`,
    '</td>',
    `<td bgcolor="${CARD}" style="vertical-align:top;padding:2px 0 0 0;width:60px;${cardBg}">`,
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right"',
    ` bgcolor="${CARD}" style="border-collapse:collapse;background:transparent;">`,
    '<tr>',
    `<td bgcolor="${CARD}" style="padding:0 8px 0 0;font-size:0;line-height:0;background:transparent;">${socialIcon(tg, 'icon-telegram.png', 'Telegram')}</td>`,
    `<td bgcolor="${CARD}" style="padding:0;font-size:0;line-height:0;background:transparent;">${socialIcon(wa, 'icon-whatsapp.png', 'WhatsApp')}</td>`,
    '</tr>',
    '</table>',
    '</td>',
    '</tr>',
    '</table>',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"',
    ' style="border-collapse:collapse;margin-top:12px;background:transparent;">',
    ...rows,
    '</table>',
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.45;`,
    `color:${TAGLINE};text-decoration:none;margin:14px 0 0;">`,
    'Professional IT Development: from concept to business digitalization.<br />',
    'Full-cycle development: from business analysis to implementation.',
    '</div>',
    '</td>',
    '</tr>',
    '</table>',
    '</div>',
  ].join('')
}

/** Starter for the templates editor — real mail uses buildAlexolSignature(profile). */
export const ALEXOL_SIGNATURE_HTML = buildAlexolSignature({
  full_name: 'Имя Фамилия',
  job_title: 'Должность',
  phone: '+7 000 000-00-00',
  email: 'you@alexol.io',
})

function parseSignaturePerson(root: Element): SignaturePerson {
  const links = Array.from(root.querySelectorAll('a'))
  const phone = links
    .find((anchor) => (anchor.getAttribute('href') || '').startsWith('tel:'))
    ?.textContent?.trim()
  const email = links
    .find((anchor) => (anchor.getAttribute('href') || '').startsWith('mailto:'))
    ?.textContent?.trim()
  const telegramHrefAttr = links
    .find((anchor) => /t\.me|telegram\.me/i.test(anchor.getAttribute('href') || ''))
    ?.getAttribute('href')
  const divs = Array.from(root.querySelectorAll('div'))
  const nameDiv = divs.find((node) => {
    const text = (node.textContent || '').trim()
    const style = node.getAttribute('style') || ''
    return (
      text &&
      text !== 'Alexol' &&
      style.includes('font-weight:700') &&
      style.includes('#FFFFFF') &&
      !node.querySelector('table')
    )
  })
  const titleDiv = divs.find((node) => {
    const style = node.getAttribute('style') || ''
    return style.includes('#8B95A8') || style.includes('#A8B0C0') || style.includes('#C5CDD8')
  })
  let job = (titleDiv?.textContent || '').replace(/·\s*Alexol\s*$/, '').trim()
  if (job === 'Alexol') job = ''
  return {
    full_name: nameDiv?.textContent?.trim(),
    job_title: job,
    phone,
    email,
    telegram: telegramHrefAttr || undefined,
  }
}

/** Rewrite old SVG / list-layout signatures to the current card. */
export function upgradeSignatureAssets(html: string): string {
  if (!html || typeof document === 'undefined') return html

  const wrap = document.createElement('div')
  wrap.innerHTML = html

  wrap.querySelectorAll('[data-alexol-sig="1"]').forEach((root) => {
    const person = parseSignaturePerson(root)
    const next = document.createElement('div')
    next.innerHTML = buildAlexolSignature(person)
    const node = next.firstElementChild
    if (node) root.replaceWith(node)
  })

  return wrap.innerHTML
}
