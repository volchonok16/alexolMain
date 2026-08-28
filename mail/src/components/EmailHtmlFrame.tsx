import { wrapEmailDocument } from '../utils/htmlEmail'

export function EmailHtmlFrame({ html }: { html: string }) {
  return (
    <iframe
      className="email-html-frame"
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
      srcDoc={wrapEmailDocument(html)}
      title="Содержимое письма"
      referrerPolicy="no-referrer"
    />
  )
}
