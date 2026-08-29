/** Per-user Alexol signature. Hosted PNGs on mail.alexol.io (same deploy as the mail SPA). */

const ASSET = 'https://mail.alexol.io/email'
const ASSET_V = 'v=4'
const SITE_HREF = 'https://alexol.io'
const SITE_LABEL = 'alexol.io'
const TELEGRAM_FALLBACK = 'https://t.me/AlexolBot'
const WHATSAPP_FALLBACK = '79095175557'

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
    `<img src="${ASSET}/${file}?${ASSET_V}" width="${width}" height="${height}" alt="" ` +
    `style="display:block;border:0;width:${width}px;height:${height}px;${extra}" />`
  )
}

function linkHtml(href: string, label: string): string {
  return (
    `<a href="${esc(href)}" style="font-family:Arial,Helvetica,sans-serif;` +
    `font-size:12px;color:#0AE3FF;text-decoration:underline;">` +
    `<u style="color:#0AE3FF;">${esc(label)}</u></a>`
  )
}

function contactRow(iconFile: string, innerHtml: string, last: boolean): string {
  const iconPad = last ? '0 8px 0 0' : '0 8px 6px 0'
  const textPad = last ? '0' : '0 0 6px 0'
  return [
    '<tr>',
    `<td style="padding:${iconPad};vertical-align:middle;width:16px;font-size:0;line-height:0;">`,
    png(iconFile, 14, 14),
    '</td>',
    `<td style="padding:${textPad};vertical-align:middle;">${innerHtml}</td>`,
    '</tr>',
  ].join('')
}

function socialIcon(href: string, file: string, alt: string): string {
  return [
    `<a href="${esc(href)}" title="${esc(alt)}" style="text-decoration:none;border:0;">`,
    png(file, 20, 20),
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

  return [
    '<div data-alexol-sig="1" data-alexol-layout="social-top" style="margin:0;padding:0;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="500"',
    ' style="border-collapse:collapse;table-layout:fixed;width:500px;max-width:500px;',
    'background-color:#0C0F16;border-radius:10px;">',
    '<tr>',
    '<td width="108" style="padding:16px 10px 16px 16px;vertical-align:middle;width:108px;">',
    '<img src="https://alexol.io/favicon.png" width="52" height="52" alt="Alexol"',
    ' style="display:block;margin:0 auto 8px;border:0;width:52px;height:52px;" />',
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;',
    'text-align:center;line-height:1.1;">Alexol</div>',
    '</td>',
    '<td width="10" style="padding:16px 0;vertical-align:middle;width:10px;font-size:0;line-height:0;">',
    png('sig-divider.png', 3, 124, 'margin:0 auto;'),
    '</td>',
    '<td width="382" style="padding:16px 18px 16px 10px;vertical-align:middle;width:382px;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"',
    ' style="border-collapse:collapse;width:100%;">',
    '<tr>',
    '<td style="vertical-align:top;padding:0 8px 0 0;">',
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;',
    `line-height:1.2;margin:0 0 3px;">${esc(name)}</div>`,
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8B95A8;line-height:1.4;margin:0;">',
    `${esc(roleLine)}</div>`,
    '</td>',
    '<td style="vertical-align:top;padding:2px 0 0 0;width:56px;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right"',
    ' style="border-collapse:collapse;">',
    '<tr>',
    `<td style="padding:0 8px 0 0;font-size:0;line-height:0;">${socialIcon(tg, 'icon-telegram.png', 'Telegram')}</td>`,
    `<td style="padding:0;font-size:0;line-height:0;">${socialIcon(wa, 'icon-whatsapp.png', 'WhatsApp')}</td>`,
    '</tr>',
    '</table>',
    '</td>',
    '</tr>',
    '</table>',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"',
    ' style="border-collapse:collapse;margin-top:12px;">',
    ...rows,
    '</table>',
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
  const titleDiv = divs.find((node) => (node.getAttribute('style') || '').includes('#8B95A8'))
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
