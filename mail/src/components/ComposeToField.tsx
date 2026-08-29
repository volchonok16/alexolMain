import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import api from '../api/axios'
import { PeerAvatar } from './PeerAvatar'
import { resolveAvatarUrl } from '../utils/avatarUrl'
import {
  looksLikeEmail,
  parseRecipientChips,
  stringifyRecipients,
  type RecipientChip,
} from '../utils/composeEmail'
import './ComposeToField.css'

export type DirectoryPerson = {
  email: string
  full_name: string
  job_title?: string | null
  avatar_url?: string | null
}

type Props = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function ComposeToField({ value, onChange, disabled }: Props) {
  const [chips, setChips] = useState<RecipientChip[]>(() => parseRecipientChips(value))
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [people, setPeople] = useState<DirectoryPerson[]>([])
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = useMemo(
    () => new Set(chips.map((chip) => chip.email.toLowerCase())),
    [chips]
  )

  const suggestions = useMemo(
    () => people.filter((person) => !selected.has(person.email.toLowerCase())),
    [people, selected]
  )

  const emit = (nextChips: RecipientChip[], nextDraft: string) => {
    setChips(nextChips)
    setDraft(nextDraft)
    onChange(stringifyRecipients(nextChips, nextDraft))
  }

  const addPerson = (person: DirectoryPerson) => {
    const email = person.email.trim().toLowerCase()
    if (!email || selected.has(email)) return
    emit([...chips, { email, name: person.full_name }], '')
    setOpen(false)
    setActive(0)
    inputRef.current?.focus()
  }

  const addDraftIfEmail = () => {
    const text = draft.trim()
    if (!text) return false
    if (!looksLikeEmail(text)) return false
    const email = text.toLowerCase()
    if (selected.has(email)) {
      emit(chips, '')
      return true
    }
    emit([...chips, { email }], '')
    return true
  }

  const removeAt = (index: number) => {
    emit(
      chips.filter((_, i) => i !== index),
      draft
    )
    inputRef.current?.focus()
  }

  useEffect(() => {
    const q = draft.trim()
    const timer = window.setTimeout(() => {
      api
        .get<DirectoryPerson[]>('/directory', { params: { q } })
        .then(({ data }) => setPeople(Array.isArray(data) ? data : []))
        .catch(() => setPeople([]))
    }, 160)
    return () => window.clearTimeout(timer)
  }, [draft])

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % suggestions.length)
      return
    }
    if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault()
      setOpen(true)
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length)
      return
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      if (open && suggestions[active]) {
        event.preventDefault()
        addPerson(suggestions[active])
        return
      }
      if (addDraftIfEmail()) {
        event.preventDefault()
      }
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if ((event.key === ',' || event.key === ';' || event.key === ' ') && looksLikeEmail(draft.trim())) {
      event.preventDefault()
      addDraftIfEmail()
      return
    }
    if (event.key === 'Backspace' && !draft && chips.length) {
      event.preventDefault()
      removeAt(chips.length - 1)
    }
  }

  return (
    <div className="compose-to" ref={boxRef}>
      <div
        className="compose-to__box"
        onClick={() => inputRef.current?.focus()}
      >
        {chips.map((chip, index) => (
          <span key={chip.email} className="compose-to__chip">
            <span className="compose-to__chip-label">
              {chip.name || chip.email}
            </span>
            <button
              type="button"
              className="compose-to__chip-remove"
              aria-label={`Убрать ${chip.name || chip.email}`}
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation()
                removeAt(index)
              }}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="compose-to__input"
          value={draft}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          placeholder={chips.length ? 'Ещё имя или email' : 'Фамилия, имя или email'}
          onChange={(event) => {
            emit(chips, event.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onBlur={() => addDraftIfEmail()}
        />
      </div>
      {open && suggestions.length > 0 && (
        <ul className="compose-to__list" role="listbox">
          {suggestions.map((person, index) => (
            <li key={person.email}>
              <button
                type="button"
                className={`compose-to__option ${index === active ? 'is-active' : ''}`}
                onMouseDown={(event) => {
                  event.preventDefault()
                  addPerson(person)
                }}
                onMouseEnter={() => setActive(index)}
              >
                <PeerAvatar
                  src={resolveAvatarUrl(person.avatar_url)}
                  email={person.email}
                  name={person.full_name}
                  size={32}
                />
                <span className="compose-to__option-text">
                  <span className="compose-to__option-name">{person.full_name}</span>
                  <span className="compose-to__option-meta">
                    {person.email}
                    {person.job_title ? ` · ${person.job_title}` : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
