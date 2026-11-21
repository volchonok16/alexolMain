import { X, Lock, Globe } from 'lucide-react'
import './JitsiRoomChoice.css'

type Props = {
  open: boolean
  onClose: () => void
  onPick: (openRoom: boolean) => void
}

export function JitsiRoomChoice({ open, onClose, onPick }: Props) {
  if (!open) return null
  return (
    <div className="jitsi-choice-overlay" onClick={onClose} role="presentation">
      <div
        className="jitsi-choice-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="jitsi-choice-title"
      >
        <button type="button" className="jitsi-choice-close" onClick={onClose} aria-label="Закрыть">
          <X size={20} />
        </button>
        <h2 id="jitsi-choice-title">Созвон Jitsi</h2>
        <p>Какая комната? Ссылку скопируем, её можно сразу отправить коллеге.</p>
        <div className="jitsi-choice-actions">
          <button type="button" className="jitsi-choice-card" onClick={() => onPick(true)}>
            <Globe size={22} />
            <span>Открытая</span>
            <small>Гости входят без логина</small>
          </button>
          <button type="button" className="jitsi-choice-card jitsi-choice-card--closed" onClick={() => onPick(false)}>
            <Lock size={22} />
            <span>Закрытая</span>
            <small>Только ящик @alexol.io</small>
          </button>
        </div>
      </div>
    </div>
  )
}
