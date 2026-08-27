export type TemplateType = 'body' | 'signature' | 'other'

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
    return [
      '<div data-alexol-sig="1" style="margin-top:8px;padding-top:16px;border-top:1px solid #e2e8f0;">',
      '  <div style="font-weight:600;color:#0f172a;font-size:14px;">Ваше Имя</div>',
      '  <div style="color:#64748b;font-size:13px;margin-top:2px;">Должность · alexol.io</div>',
      '  <div style="margin-top:8px;">',
      '    <a href="https://alexol.io" style="color:#0891b2;text-decoration:none;font-size:13px;">alexol.io</a>',
      '    <span style="color:#94a3b8;"> · </span>',
      '    <a href="mailto:support@alexol.io" style="color:#0891b2;text-decoration:none;font-size:13px;">support@alexol.io</a>',
      '  </div>',
      '</div>',
    ].join('\n')
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
