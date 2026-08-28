/** Per-user Alexol signature. Icons are Unicode — Gmail/Outlook strip SVG and often 404 remote PNGs. */

const SITE_HREF = 'https://alexol.io'
const SITE_LABEL = 'alexol.io'

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

function contactRow(symbol: string, innerHtml: string, last: boolean): string {
  const iconPad = last ? '0 8px 0 0' : '0 8px 5px 0'
  const textPad = last ? '0' : '0 0 5px 0'
  return [
    '<tr>',
    `<td style="padding:${iconPad};vertical-align:middle;width:18px;`,
    'font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1;color:#FFFFFF;">',
    symbol,
    '</td>',
    `<td style="padding:${textPad};vertical-align:middle;">${innerHtml}</td>`,
    '</tr>',
  ].join('')
}

function linkHtml(href: string, label: string): string {
  return (
    `<a href="${esc(href)}" style="font-family:Arial,Helvetica,sans-serif;` +
    `font-size:12px;color:#0AE3FF;text-decoration:none;">${esc(label)}</a>`
  )
}

export function buildAlexolSignature(person: SignaturePerson): string {
  const name = (person.full_name || '').trim() || 'Alexol'
  const title = (person.job_title || '').trim()
  const roleLine = title ? `${title} · Alexol` : 'Alexol'
  const phone = (person.phone || '').trim()
  const email = (person.email || '').trim()

  const items: { symbol: string; inner: string }[] = []
  if (phone) {
    const href = telHref(phone)
    items.push({ symbol: '☎', inner: href ? linkHtml(href, phone) : esc(phone) })
  }
  if (email) {
    items.push({ symbol: '✉', inner: linkHtml(`mailto:${email}`, email) })
  }
  items.push({ symbol: '🌐', inner: linkHtml(SITE_HREF, SITE_LABEL) })
  const rows = items.map((item, i) => contactRow(item.symbol, item.inner, i === items.length - 1))

  return [
    '<div data-alexol-sig="1" style="margin:0;padding:0;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"',
    ' style="border-collapse:collapse;background-color:#0C0F16;border-radius:10px;max-width:500px;">',
    '<tr>',
    '<td style="padding:16px 14px 16px 18px;vertical-align:middle;width:110px;">',
    '<img src="https://alexol.io/favicon.png" width="52" height="52" alt="Alexol"',
    ' style="display:block;margin:0 auto 8px;border:0;" />',
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;',
    'text-align:center;line-height:1.1;">Alexol</div>',
    '</td>',
    '<td width="12" style="padding:8px 4px;width:12px;vertical-align:middle;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="3" height="120"',
    ' bgcolor="#0AE3FF" style="width:3px;height:120px;background-color:#0AE3FF;border-collapse:collapse;">',
    '<tr><td width="3" height="120" bgcolor="#0AE3FF"',
    ' style="width:3px;height:120px;font-size:0;line-height:0;background-color:#0AE3FF;">&nbsp;</td></tr>',
    '</table>',
    '</td>',
    '<td style="padding:16px 18px 16px 12px;vertical-align:middle;">',
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

/** Swap SVG/data-URI icons in old stored templates for Unicode (no remote icon files). */
export function upgradeSignatureAssets(html: string): string {
  if (!html || typeof document === 'undefined') return html
  if (!html.includes('data:image/svg+xml') && !html.includes('/email/icon-')) return html

  const wrap = document.createElement('div')
  wrap.innerHTML = html
  const symbols = ['☎', '✉', '🌐']

  wrap.querySelectorAll('[data-alexol-sig="1"]').forEach((root) => {
    root.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || ''
      const width = img.getAttribute('width')
      const isIcon =
        src.startsWith('data:') ||
        src.includes('/email/icon-') ||
        src.includes('/email/sig-divider')

      if (!isIcon) return

      if (width === '3' || width === '6' || src.includes('sig-divider')) {
        const td = img.parentElement
        if (td) {
          td.innerHTML =
            '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="3" height="120"' +
            ' bgcolor="#0AE3FF" style="width:3px;height:120px;background-color:#0AE3FF;border-collapse:collapse;">' +
            '<tr><td width="3" height="120" bgcolor="#0AE3FF"' +
            ' style="width:3px;height:120px;font-size:0;line-height:0;background-color:#0AE3FF;">&nbsp;</td></tr>' +
            '</table>'
        }
        return
      }

      if (width === '14' || src.includes('/email/icon-')) {
        const index = src.includes('phone')
          ? 0
          : src.includes('email') || src.includes('mail')
            ? 1
            : src.includes('web')
              ? 2
              : symbols.length
        const symbol = symbols[Math.min(index, symbols.length - 1)]
        const span = document.createElement('span')
        span.setAttribute(
          'style',
          'font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1;color:#FFFFFF;',
        )
        span.textContent = symbol || '•'
        img.replaceWith(span)
      }
    })
  })

  return wrap.innerHTML
}
