import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Plus, Users } from 'lucide-react';
import { DECKS, LANGS, deckById, langById } from './data';
import {
  addCustomCard,
  cardsFor,
  loadStore,
  markCard,
  removeCustomCard,
  setLastLang,
  shuffleWeighted,
  type Store,
} from './storage';
import { getTelegram, haptic, initTelegram, queryLang } from './telegram';
import { suggestRuTranslations } from './translate';
import type { DeckTheme, LangId, QuizMode } from './types';

type Screen =
  | { id: 'home' }
  | { id: 'decks'; lang: LangId }
  | { id: 'modes'; lang: LangId; deck: DeckTheme | 'all' }
  | { id: 'quiz'; lang: LangId; deck: DeckTheme | 'all'; mode: QuizMode }
  | { id: 'words'; lang: LangId };

function isLangId(value: string | null): value is LangId {
  return value === 'en' || value === 'es' || value === 'fr' || value === 'de';
}

function deckCards(store: Store, lang: LangId, deck: DeckTheme | 'all') {
  if (deck === 'all') {
    return store.cards.filter((card) => card.lang === lang && card.deck !== 'custom');
  }
  return cardsFor(store, lang, deck);
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

export default function App() {
  const [store, setStore] = useState<Store>(loadStore);
  const [screen, setScreen] = useState<Screen>(() => {
    const fromUrl = queryLang();
    if (isLangId(fromUrl)) return { id: 'decks', lang: fromUrl };
    const saved = loadStore().lastLang;
    if (saved) return { id: 'decks', lang: saved };
    return { id: 'home' };
  });
  const [online, setOnline] = useState(() => navigator.onLine);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    initTelegram();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    window.addEventListener('beforeinstallprompt', onInstall);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('beforeinstallprompt', onInstall);
    };
  }, []);

  useEffect(() => {
    const tg = getTelegram();
    const back = tg?.BackButton;
    if (!back) return;
    const goBack = () => pop(screen, setScreen);
    if (screen.id === 'home') back.hide();
    else {
      back.show();
      back.onClick(goBack);
    }
    return () => {
      back.offClick(goBack);
      back.hide();
    };
  }, [screen]);

  const openLang = (lang: LangId) => {
    haptic();
    setStore((prev) => setLastLang(prev, lang));
    setScreen({ id: 'decks', lang });
  };

  return (
    <div className="app">
      {screen.id === 'home' && (
        <HomeScreen
          online={online}
          lastLang={store.lastLang}
          onLang={openLang}
          onInstall={
            installEvent
              ? async () => {
                  await installEvent.prompt();
                  setInstallEvent(null);
                }
              : undefined
          }
        />
      )}
      {screen.id === 'decks' && (
        <DecksScreen
          store={store}
          lang={screen.lang}
          onBack={() => setScreen({ id: 'home' })}
          onDeck={(deck) => setScreen({ id: 'modes', lang: screen.lang, deck })}
          onWords={() => setScreen({ id: 'words', lang: screen.lang })}
        />
      )}
      {screen.id === 'modes' && (
        <ModesScreen
          lang={screen.lang}
          deck={screen.deck}
          count={deckCards(store, screen.lang, screen.deck).length}
          onBack={() => setScreen({ id: 'decks', lang: screen.lang })}
          onPick={(mode) => setScreen({ id: 'quiz', lang: screen.lang, deck: screen.deck, mode })}
        />
      )}
      {screen.id === 'quiz' && (
        <QuizScreen
          store={store}
          lang={screen.lang}
          deck={screen.deck}
          mode={screen.mode}
          onMark={(id, known) => setStore((prev) => markCard(prev, id, known))}
          onBack={() => setScreen({ id: 'modes', lang: screen.lang, deck: screen.deck })}
          onHome={() => setScreen({ id: 'decks', lang: screen.lang })}
        />
      )}
      {screen.id === 'words' && (
        <WordsScreen
          store={store}
          lang={screen.lang}
          onBack={() => setScreen({ id: 'decks', lang: screen.lang })}
          onAdd={(front, back, example) =>
            setStore((prev) => addCustomCard(prev, { lang: screen.lang, front, back, example }))
          }
          onRemove={(id) => setStore((prev) => removeCustomCard(prev, id))}
        />
      )}
    </div>
  );
}

function pop(screen: Screen, setScreen: (next: Screen) => void) {
  if (screen.id === 'decks') setScreen({ id: 'home' });
  else if (screen.id === 'modes') setScreen({ id: 'decks', lang: screen.lang });
  else if (screen.id === 'quiz') setScreen({ id: 'modes', lang: screen.lang, deck: screen.deck });
  else if (screen.id === 'words') setScreen({ id: 'decks', lang: screen.lang });
}

function TopBar({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  return (
    <header className="top">
      {onBack && (
        <button className="back" type="button" onClick={onBack} aria-label="Назад">
          <ArrowLeft size={18} />
        </button>
      )}
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </header>
  );
}

function HomeScreen({
  online,
  lastLang,
  onLang,
  onInstall,
}: {
  online: boolean;
  lastLang: LangId | null;
  onLang: (lang: LangId) => void;
  onInstall?: () => void;
}) {
  return (
    <>
      <div className="hero">
        <h1>Карточки для двоих</h1>
        <p>
          Один держит телефон как словарь. На карточке слово и перевод — спрашиваешь второго.
          Слова живут в телефоне, без интернета.
        </p>
        <span className={`badge${online ? '' : ' is-offline'}`}>
          {online ? 'Онлайн · после загрузки работает офлайн' : 'Офлайн · карточки на устройстве'}
        </span>
      </div>
      <div className="grid langs">
        {LANGS.map((lang) => (
          <button key={lang.id} className="tile" type="button" onClick={() => onLang(lang.id)}>
            <span className="emoji">{lang.flag}</span>
            <span className="title">{lang.name}</span>
            <span className="meta">{lang.nameRu}{lastLang === lang.id ? ' · недавно' : ''}</span>
          </button>
        ))}
      </div>
      <p className="note">
        Важно: если закрыть Telegram без сети, кнопка «Карточки» в боте часто не откроется —
        Telegram снова грузит сайт. Один раз с интернетом нажми «Установить на экран» (на
        iPhone: Поделиться → На экран «Домой»). Потом открывай иконку — карточки и свои слова
        уже на телефоне, интернет не нужен.
      </p>
      {onInstall && (
        <div className="modes" style={{ marginTop: 12 }}>
          <button className="btn primary" type="button" onClick={onInstall}>
            Установить на экран
          </button>
        </div>
      )}
      {!onInstall && (
        <p className="note" style={{ marginTop: 10 }}>
          На iPhone: в Safari или из Mini App — «Поделиться» → «На экран „Домой“».
        </p>
      )}
    </>
  );
}

function DecksScreen({
  store,
  lang,
  onBack,
  onDeck,
  onWords,
}: {
  store: Store;
  lang: LangId;
  onBack: () => void;
  onDeck: (deck: DeckTheme | 'all') => void;
  onWords: () => void;
}) {
  const meta = langById(lang);
  const allCount = deckCards(store, lang, 'all').length;
  const customCount = cardsFor(store, lang, 'custom').length;

  return (
    <>
      <TopBar title={`${meta?.flag ?? ''} ${meta?.name ?? ''}`} subtitle="Выбери набор карточек" onBack={onBack} />
      <div className="grid">
        <button className="tile" type="button" onClick={() => onDeck('all')}>
          <span className="emoji">📚</span>
          <span className="title">Все готовые</span>
          <span className="meta">{allCount} карточек · база + путешествие + еда</span>
        </button>
        {DECKS.map((deck) => {
          const count = cardsFor(store, lang, deck.id).length;
          return (
            <button key={deck.id} className="tile" type="button" onClick={() => onDeck(deck.id)}>
              <span className="emoji">{deck.emoji}</span>
              <span className="title">{deck.title}</span>
              <span className="meta">
                {count} {count === 1 ? 'карточка' : 'карточек'} · {deck.hint}
              </span>
            </button>
          );
        })}
      </div>
      <div className="modes" style={{ marginTop: 16 }}>
        <button className="mode" type="button" onClick={onWords}>
          <span className="icon-wrap">
            <Plus size={18} />
          </span>
          <span>
            <strong>Добавить свои слова</strong>
            <span>Каждое слово сразу становится карточкой. Сейчас своих: {customCount}</span>
          </span>
        </button>
      </div>
    </>
  );
}

function ModesScreen({
  lang,
  deck,
  count,
  onBack,
  onPick,
}: {
  lang: LangId;
  deck: DeckTheme | 'all';
  count: number;
  onBack: () => void;
  onPick: (mode: QuizMode) => void;
}) {
  const title = deck === 'all' ? 'Все готовые' : deckById(deck)?.title ?? 'Набор';
  const langName = langById(lang)?.name ?? '';

  return (
    <>
      <TopBar title={title} subtitle={`${langName} · ${count} карточек`} onBack={onBack} />
      {count === 0 ? (
        <p className="empty">В этом наборе пока пусто. Добавь слова — и они станут карточками.</p>
      ) : (
        <div className="modes">
          <button className="mode" type="button" onClick={() => onPick('ask')}>
            <span className="icon-wrap">
              <Users size={18} />
            </span>
            <span>
              <strong>Спросить друга</strong>
              <span>Слово и перевод сразу видны. Ты читаешь и спрашиваешь второго человека.</span>
            </span>
          </button>
          <button className="mode" type="button" onClick={() => onPick('study')}>
            <span className="icon-wrap">
              <BookOpen size={18} />
            </span>
            <span>
              <strong>Учить самому</strong>
              <span>Сначала слово, перевод открывается по нажатию.</span>
            </span>
          </button>
        </div>
      )}
    </>
  );
}

function QuizScreen({
  store,
  lang,
  deck,
  mode,
  onMark,
  onBack,
  onHome,
}: {
  store: Store;
  lang: LangId;
  deck: DeckTheme | 'all';
  mode: QuizMode;
  onMark: (id: string, known: boolean) => void;
  onBack: () => void;
  onHome: () => void;
}) {
  const [queue] = useState(() => shuffleWeighted(deckCards(store, lang, deck), store.progress));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(mode === 'ask');
  const [known, setKnown] = useState(0);
  const [unknown, setUnknown] = useState(0);
  const done = index >= queue.length;
  const card = queue[index];
  const title = deck === 'all' ? 'Все готовые' : deckById(deck)?.title ?? 'Карточки';

  const answer = (isKnown: boolean) => {
    if (!card) return;
    haptic(isKnown ? 'ok' : 'no');
    onMark(card.id, isKnown);
    if (isKnown) setKnown((n) => n + 1);
    else setUnknown((n) => n + 1);
    setIndex((n) => n + 1);
    setRevealed(mode === 'ask');
  };

  if (done) {
    return (
      <>
        <TopBar title={title} onBack={onHome} />
        <div className="summary">
          <h2>Готово</h2>
          <p>Можно пройти ещё раз или сменить набор.</p>
          <div className="stats">
            <div>
              <b style={{ color: 'var(--ok)' }}>{known}</b>
              <span>знает</span>
            </div>
            <div>
              <b style={{ color: 'var(--no)' }}>{unknown}</b>
              <span>не знает</span>
            </div>
          </div>
          <button className="btn primary" type="button" onClick={onBack}>
            Ещё раз
          </button>
          <div style={{ height: 10 }} />
          <button className="btn ghost" type="button" onClick={onHome}>
            К наборам
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title={title}
        subtitle={`${index + 1} / ${queue.length}${mode === 'ask' ? ' · спрашивай друга' : ''}`}
        onBack={onBack}
      />
      <div className="progress">
        <i style={{ width: `${(index / queue.length) * 100}%` }} />
      </div>
      <div className="card-stage">
        <button
          className="flash"
          type="button"
          onClick={() => {
            if (mode === 'study' && !revealed) {
              haptic();
              setRevealed(true);
            }
          }}
        >
          <div className="front">{card.front}</div>
          {revealed ? (
            <>
              <div className="back">{card.back}</div>
              {card.example && <div className="example">{card.example}</div>}
            </>
          ) : (
            <div className="hint">Нажми, чтобы открыть перевод</div>
          )}
        </button>
      </div>
      <div className="actions">
        {revealed ? (
          <>
            <button className="btn no" type="button" onClick={() => answer(false)}>
              Не знает
            </button>
            <button className="btn ok" type="button" onClick={() => answer(true)}>
              Знает
            </button>
          </>
        ) : (
          <button className="btn primary full" type="button" onClick={() => setRevealed(true)}>
            Показать перевод
          </button>
        )}
      </div>
    </>
  );
}

function WordsScreen({
  store,
  lang,
  onBack,
  onAdd,
  onRemove,
}: {
  store: Store;
  lang: LangId;
  onBack: () => void;
  onAdd: (front: string, back: string, example?: string) => void;
  onRemove: (id: string) => void;
}) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [example, setExample] = useState('');
  const [online, setOnline] = useState(() => navigator.onLine);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestStatus, setSuggestStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const custom = cardsFor(store, lang, 'custom');
  const meta = langById(lang);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => {
      setOnline(false);
      setSuggestions([]);
      setSuggestStatus('idle');
    };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    const query = front.trim();
    if (!online || query.length < 2) {
      setSuggestions([]);
      setSuggestStatus('idle');
      return;
    }

    const controller = new AbortController();
    setSuggestStatus('loading');
    const timer = window.setTimeout(async () => {
      try {
        const next = await suggestRuTranslations(query, lang, controller.signal);
        setSuggestions(next);
        setSuggestStatus(next.length ? 'ready' : 'idle');
      } catch (error) {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setSuggestStatus('error');
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [front, lang, online]);

  const submit = () => {
    if (!front.trim() || !back.trim()) return;
    haptic('ok');
    onAdd(front, back, example);
    setFront('');
    setBack('');
    setExample('');
    setSuggestions([]);
    setSuggestStatus('idle');
  };

  const pickSuggestion = (value: string) => {
    haptic();
    setBack(value);
  };

  return (
    <>
      <TopBar
        title="Мои слова"
        subtitle={`${meta?.name ?? ''} · слово = карточка`}
        onBack={onBack}
      />
      <p className={`hint-line${online ? '' : ' is-offline'}`}>
        {online
          ? 'Есть сеть — после ввода слова появятся варианты перевода. Можно выбрать или написать свой.'
          : 'Офлайн — перевод вводишь сам. Подсказки появятся, когда будет интернет.'}
      </p>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label>
          Слово / фраза
          <input
            value={front}
            onChange={(event) => setFront(event.target.value)}
            placeholder="airport"
            autoCapitalize="none"
          />
        </label>
        <label>
          Перевод
          <input
            value={back}
            onChange={(event) => setBack(event.target.value)}
            placeholder={online ? 'выбери ниже или введи сам' : 'аэропорт'}
          />
        </label>
        {online && (
          <div className="suggest" aria-live="polite">
            {suggestStatus === 'loading' && <span className="suggest-meta">Ищу перевод…</span>}
            {suggestStatus === 'error' && (
              <span className="suggest-meta">Не удалось получить варианты — введи перевод сам.</span>
            )}
            {suggestions.length > 0 && (
              <>
                <span className="suggest-meta">Варианты перевода</span>
                <div className="chips">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      className={`chip${back === item ? ' is-active' : ''}`}
                      type="button"
                      onClick={() => pickSuggestion(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <label>
          Пример (необязательно)
          <input
            value={example}
            onChange={(event) => setExample(event.target.value)}
            placeholder="We're at the airport."
          />
        </label>
        <button className="btn primary" type="submit">
          Сохранить карточку
        </button>
      </form>
      {custom.length === 0 ? (
        <p className="empty">Пока пусто. Добавь слова — они останутся в телефоне и сработают офлайн.</p>
      ) : (
        <div className="list">
          {custom.map((card) => (
            <div key={card.id} className="word">
              <div>
                <div className="front">{card.front}</div>
                <div className="back">{card.back}</div>
              </div>
              <button className="kill" type="button" onClick={() => onRemove(card.id)} aria-label="Удалить">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
