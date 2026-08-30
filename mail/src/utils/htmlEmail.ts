const TAG_HINTS = /<(?:table|div|h1|p|img|body|head)\b/gi

export function looksLikeHtml(text: string): boolean {
  const t = (text || '').replace(/^\uFEFF/, '').trim()
  if (!t) return false
  if (/^<!DOCTYPE\s+html/i.test(t) || /^<html[\s>]/i.test(t)) return true
  if (/<body[\s>]/i.test(t) && /<\/html>/i.test(t)) return true
  const tags = t.match(TAG_HINTS)
  return Boolean(tags && tags.length >= 4)
}

/** Prefer MIME html_body; recover newsletters that were stored as plain text. */
export function htmlForDisplay(htmlBody?: string | null, body?: string | null): string {
  const html = (htmlBody || '').replace(/^\uFEFF/, '').trim()
  if (html) return html
  const plain = (body || '').replace(/^\uFEFF/, '')
  if (looksLikeHtml(plain)) return plain.trim()
  return ''
}

export function previewTextFromParts(htmlBody?: string | null, body?: string | null): string {
  const source = htmlForDisplay(htmlBody, body) || body || ''
  return source
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const FRAME_CSS =
  '<style>html,body{margin:0;padding:18px 20px;line-height:1.55;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;background:#fff;height:auto!important;}p{margin:0 0 10px;}p:last-child{margin-bottom:0;}</style>'

/** Full document for iframe srcDoc so layout CSS in the letter actually applies. */
export function wrapEmailDocument(html: string): string {
  const src = html.replace(/^\uFEFF/, '').trim()
  if (!src) return ''
  if (/<html[\s>]/i.test(src)) {
    if (/<head[\s>]/i.test(src)) {
      return src.replace(/<head([^>]*)>/i, `<head$1>${FRAME_CSS}`)
    }
    return src.replace(/<html([^>]*)>/i, `<html$1><head>${FRAME_CSS}</head>`)
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${FRAME_CSS}</head><body>${src}</body></html>`
}
