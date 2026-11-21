import { ALEXOL_SIGNATURE_HTML } from './alexolSignature'

export type TemplateType = 'body' | 'signature' | 'other'

export function templateTypeLabel(type: TemplateType): string {
  if (type === 'signature') return 'Подпись'
  if (type === 'other') return 'Другое'
  return 'Основное письмо'
}

export interface EmailTemplate {
  id: number
  user_id: number
  name: string
  type: TemplateType
  description?: string
  html_content: string
  is_shared?: boolean
  is_mine?: boolean
  created_at: string
  updated_at: string
}

/** Starter HTML fragments - outbound mail wraps them in a 600px email shell. */
export function starterHtml(type: TemplateType): string {
  if (type === 'signature') {
    return ALEXOL_SIGNATURE_HTML
  }

  if (type === 'other') {
    return [
      '<p style="margin:0 0 12px;color:#0f172a;font-size:15px;line-height:1.55;">',
      '  Дополнительный блок: условия, P.S. или список ссылок.',
      '</p>',
      '<ul style="margin:0;padding-left:18px;color:#334155;font-size:14px;line-height:1.5;">',
      '  <li>Пункт один</li>',
      '  <li>Пункт два</li>',
      '</ul>',
    ].join('\n')
  }

  return [
    '<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#0f172a;font-weight:700;">',
    '  Заголовок письма',
    '</h1>',
    '<p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.55;">',
    '  Здравствуйте! Здесь основной текст письма. Можно добавить несколько абзацев.',
    '</p>',
    '<p style="margin:0 0 22px;color:#334155;font-size:15px;line-height:1.55;">',
    '  Второй абзац с деталями или предложением.',
    '</p>',
    '<p style="margin:0;">',
    '  <a href="https://alexol.io" style="display:inline-block;background:#0AE3FF;color:#0A0C10;',
    'padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">',
    '    Перейти на сайт',
    '  </a>',
    '</p>',
  ].join('\n')
}
