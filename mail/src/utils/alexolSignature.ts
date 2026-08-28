/** Per-user Alexol signature. Hosted PNGs on mail.alexol.io (same deploy as the mail SPA). */

const ASSET = 'https://mail.alexol.io/email'
const SITE_HREF = 'https://alexol.io'
const SITE_LABEL = 'alexol.io'
const TELEGRAM_HREF = 'https://t.me/AlexolBot'
const TELEGRAM_LABEL = 'telegram'
const WHATSAPP_LABEL = 'whatsapp'
const WHATSAPP_FALLBACK = '79095175557'

export interface SignaturePerson {
  full_name?: string
  job_title?: string
  phone?: string
  email?: string
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

function png(file: string, width: number, height: number, extra = ''): string {
  return (
    `<img src="${ASSET}/${file}" width="${width}" height="${height}" alt="" ` +
    `style="display:block;border:0;width:${width}px;height:${height}px;${extra}" />`
  )
}

function linkHtml(href: string, label: string): string {
  return (
    `<a href="${esc(href)}" style="font-family:Arial,Helvetica,sans-serif;` +
    `font-size:12px;color:#0AE3FF;text-decoration:none;">${esc(label)}</a>`
  )
}

function contactRow(iconFile: string, innerHtml: string, last: boolean): string {
  const iconPad = last ? '0 8px 0 0' : '0 8px 5px 0'
  const textPad = last ? '0' : '0 0 5px 0'
  return [
    '<tr>',
    `<td style="padding:${iconPad};vertical-align:middle;width:16px;font-size:0;line-height:0;">`,
    png(iconFile, 14, 14),
    '</td>',
    `<td style="padding:${textPad};vertical-align:middle;">${innerHtml}</td>`,
    '</tr>',
  ].join('')
}

export function buildAlexolSignature(person: SignaturePerson): string {
  const name = (person.full_name || '').trim() || 'Alexol'
  const title = (person.job_title || '').trim()
  const roleLine = title ? `${title} · Alexol` : 'Alexol'
  const phone = (person.phone || '').trim()
  const email = (person.email || '').trim()

  const items: { icon: string; inner: string }[] = []
  if (phone) {
    const href = telHref(phone)
    items.push({ icon: 'icon-phone.png', inner: href ? linkHtml(href, phone) : esc(phone) })
  }
  if (email) {
    items.push({ icon: 'icon-email.png', inner: linkHtml(`mailto:${email}`, email) })
  }
  items.push({ icon: 'icon-telegram.png', inner: linkHtml(TELEGRAM_HREF, TELEGRAM_LABEL) })
  items.push({ icon: 'icon-whatsapp.png', inner: linkHtml(waHref(phone), WHATSAPP_LABEL) })
  items.push({ icon: 'icon-web.png', inner: linkHtml(SITE_HREF, SITE_LABEL) })
  const rows = items.map((item, i) => contactRow(item.icon, item.inner, i === items.length - 1))

  return [
    '<div data-alexol-sig="1" style="margin:0;padding:0;">',
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
    png('sig-divider.png', 3, 150, 'margin:0 auto;'),
    '</td>',
    '<td width="382" style="padding:16px 18px 16px 10px;vertical-align:middle;width:382px;">',
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;',
    `line-height:1.2;margin:0 0 3px;">${esc(name)}</div>`,
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8B95A8;line-height:1.4;margin:0 0 12px;">',
    `${esc(roleLine)}</div>`,
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">',
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

/** Rewrite old SVG / unicode-icon signatures to hosted PNGs. */
export function upgradeSignatureAssets(html: string): string {
  if (!html || typeof document === 'undefined') return html
  if (html.includes('mail.alexol.io/email/')) return html

  const wrap = document.createElement('div')
  wrap.innerHTML = html

  wrap.querySelectorAll('[data-alexol-sig="1"]').forEach((root) => {
    const dividerTd = root.querySelector('td[width="12"], td[width="10"]')
    if (dividerTd && !dividerTd.querySelector('img[src*="sig-divider"]')) {
      dividerTd.setAttribute('width', '10')
      dividerTd.setAttribute(
        'style',
        'padding:16px 0;vertical-align:middle;width:10px;font-size:0;line-height:0;',
      )
      dividerTd.innerHTML = png('sig-divider.png', 3, 150, 'margin:0 auto;')
    }

    const iconFiles = ['icon-phone.png', 'icon-email.png', 'icon-telegram.png', 'icon-whatsapp.png', 'icon-web.png']
    let iconIndex = 0
    root.querySelectorAll('td').forEach((td) => {
      if (td.querySelector('table')) return
      const img = td.querySelector(':scope > img')
      const src = img?.getAttribute('src') || ''
      const text = (td.textContent || '').trim()
      const looksLikeIconCell =
        Boolean(img && (src.startsWith('data:') || src.includes('/email/icon-'))) ||
        (!img && /[☎✉🌐]/.test(text) && text.length <= 4)

      if (!looksLikeIconCell || iconIndex >= iconFiles.length) return
      const file = iconFiles[iconIndex]
      iconIndex += 1
      td.style.fontSize = '0'
      td.style.lineHeight = '0'
      td.innerHTML = png(file, 14, 14)
    })
  })

  return wrap.innerHTML
}
