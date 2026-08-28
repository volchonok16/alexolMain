import { useCallback, useRef } from 'react'

export function EmailHtmlFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null)

  const fit = useCallback(() => {
    const iframe = ref.current
    const doc = iframe?.contentDocument
    if (!iframe || !doc) return
    const h = Math.max(
      doc.documentElement?.scrollHeight || 0,
      doc.body?.scrollHeight || 0,
      240,
    )
    iframe.style.height = `${Math.min(h + 12, 8000)}px`
  }, [])

  return (
    <iframe
      ref={ref}
      className="email-html-frame"
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
      srcDoc={html}
      title="Содержимое письма"
      onLoad={fit}
    />
  )
}
