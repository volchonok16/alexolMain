import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Library, Plus, Users } from 'lucide-react';
import { DECKS, LANGS, deckById, langById } from './data';
import { DictionaryScreen, StageDots, StageRing, WordRing } from './dictionary';
import { LessonTasks } from './homework';
import { PanelSwitch, TutorScreen } from './tutor';
import { readCardImage } from './imageFile';
import {
  LangApiError,
  accountLabel,
  hasDevAccount,
  langApi,
  panelsFor,
  type PanelId,
  type LangAccount,
  type RemoteHomework,
  type RemoteLesson,
} from './langApi';
import { STAGE_MAX, nextStage, scaleCaption, scaleFromStages, stageColor, stageLabel, type Scale } from './progress';
import {
  addCustomCard,
  applyAssigned,
  cardsFor,
  loadStore,
  markCard,
  removeCustomCard,
  setCardsInStudy,
  setInStudy,
  setLastLang,
  shuffleWeighted,
  studyCards,
  studyQueue,
  type Store,
} from './storage';
import { getTelegram, haptic, initTelegram, queryLang, telegramInitData } from './telegram';
import { suggestRuTranslations } from './translate';
import type { DeckTheme, LangId, QuizMode } from './types';

type LessonDeck = `lesson:${string}`;
type DeckPick = DeckTheme | 'all' | 'study' | LessonDeck;

type Screen =
  | { id: 'home' }
  | { id: 'decks'; lang: LangId }
  | { id: 'dictionary'; lang: LangId }
  | { id: 'modes'; lang: LangId; deck: DeckTheme | 'all' | LessonDeck }
  | { id: 'quiz'; lang: LangId; deck: DeckPick; mode: QuizMode }
  | { id: 'words'; lang: LangId; from?: 'dictionary' }
  | { id: 'tutor'; lang: LangId; from: 'home' | 'decks' };

function isLangId(value: string | null): value is LangId {
  return value === 'en' || value === 'es' || value === 'fr' || value === 'de';
}

function deckCards(store: Store, lang: LangId, deck: DeckPick) {
  if (deck === 'study') return studyCards(store, lang);
  if (deck === 'all') {
    return store.cards.filter((card) => card.lang === lang && (card.deck === 'basics' || card.deck === 'travel' || card.deck === 'food'));
  }
  if (deck === 'basics' || deck === 'travel' || deck === 'food' || deck === 'custom' || deck === 'tutor') {
    return cardsFor(store, lang, deck);
  }
  const lessonId = deck.slice('lesson:'.length);
  return store.cards.filter((card) => card.lang === lang && card.lessonId === lessonId);
}

function lessonTasks(deck: DeckPick, homework: RemoteHomework[]) {
  if (!deck.startsWith('lesson:')) return [];
  const lessonId = deck.slice('lesson:'.length);
  return homework.filter((item) => item.lessonId === lessonId);
}

function deckScale(store: Store, lang: LangId, deck: DeckPick): Scale | null {
  if (deck !== 'custom' && !deck.startsWith('lesson:')) return null;
  const stages = deckCards(store, lang, deck).map((card) => store.progress[card.id]?.stage ?? 0);
  return scaleFromStages(stages);
}

function deckLabel(deck: DeckPick, lessons: RemoteLesson[]) {
  if (deck === 'study') return 'Словарь';
  if (deck === 'all') return 'Все готовые';
  if (deck === 'basics' || deck === 'travel' || deck === 'food' || deck === 'custom' || deck === 'tutor') {
    return deckById(deck)?.title ?? 'Набор';
  }
  const id = deck.slice('lesson:'.length);
  return lessons.find((lesson) => lesson.id === id)?.title ?? 'Урок';
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
  const [account, setAccount] = useState<LangAccount | null>(null);
  const [panel, setPanel] = useState<PanelId>('study');
  const [homework, setHomework] = useState<RemoteHomework[]>([]);
  const [lessons, setLessons] = useState<RemoteLesson[]>([]);
  const refreshAccount = useCallback(async () => {
    if (!telegramInitData() && !(import.meta.env.DEV && hasDevAccount())) {
      setAccount(null);
      setHomework([]);
      return;
    }
    try {
      const bundle = await langApi.me();
      setAccount(bundle.user);
      setHomework(bundle.homework);
      setLessons(bundle.lessons);
      setStore((prev) => applyAssigned(prev, bundle.words));
    } catch (error) {
      if (error instanceof LangApiError && error.status === 401) {
        setAccount(null);
        setHomework([]);
        setLessons([]);
      }
    }
  }, []);

  useEffect(() => {
    initTelegram();
    void refreshAccount();
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
  }, [refreshAccount]);

  useEffect(() => {
    if (screen.id === 'decks' || screen.id === 'dictionary' || screen.id === 'modes') {
      void refreshAccount();
    }
  }, [screen.id, refreshAccount]);

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

  const choosePanel = (next: PanelId) => {
    const allowed = panelsFor(account);
    const panelNext = allowed.includes(next) ? next : 'study';
    setPanel(panelNext);
    if (panelNext === 'study') {
      if (screen.id === 'tutor') setScreen({ id: 'home' });
      return;
    }
    const lang = screen.id === 'home' ? store.lastLang ?? 'en' : screen.lang;
    const from = screen.id === 'decks' || (screen.id === 'tutor' && screen.from === 'decks') ? 'decks' : 'home';
    setScreen({ id: 'tutor', lang, from });
  };

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
          account={account}
          panel={panel}
          onPanel={choosePanel}
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
          onDictionary={() => setScreen({ id: 'dictionary', lang: screen.lang })}
          account={account}
          panel={panel}
          onPanel={choosePanel}
          homework={homework}
          lessons={lessons}
          onSaveHomework={async (id, answer) => {
            await langApi.saveAnswer(id, answer);
            await refreshAccount();
          }}
        />
      )}
      {screen.id === 'tutor' && (
        <TutorScreen
          mode={panel === 'admin' ? 'admin' : 'tutor'}
          account={account}
          panel={panel}
          onPanel={choosePanel}
          onBack={() =>
            setScreen(screen.from === 'home' ? { id: 'home' } : { id: 'decks', lang: screen.lang })
          }
        />
      )}
      {screen.id === 'dictionary' && (
        <DictionaryScreen
          store={store}
          lang={screen.lang}
          onBack={() => setScreen({ id: 'decks', lang: screen.lang })}
          onToggle={(id, on) => {
            haptic();
            setStore((prev) => setInStudy(prev, id, on));
          }}
          onAddDeck={(ids) => {
            haptic('ok');
            setStore((prev) => setCardsInStudy(prev, ids, true));
          }}
          onTrain={() => setScreen({ id: 'quiz', lang: screen.lang, deck: 'study', mode: 'study' })}
          onAsk={() => setScreen({ id: 'quiz', lang: screen.lang, deck: 'study', mode: 'ask' })}
          onAddWord={() => setScreen({ id: 'words', lang: screen.lang, from: 'dictionary' })}
          lessons={lessons}
        />
      )}
      {screen.id === 'modes' && (
        <ModesScreen
          lang={screen.lang}
          deckTitle={deckLabel(screen.deck, lessons)}
          scale={deckScale(store, screen.lang, screen.deck)}
          tasks={lessonTasks(screen.deck, homework)}
          count={deckCards(store, screen.lang, screen.deck).length}
          onBack={() => setScreen({ id: 'decks', lang: screen.lang })}
          onPick={(mode) => setScreen({ id: 'quiz', lang: screen.lang, deck: screen.deck, mode })}
          onSaveHomework={async (id, answer) => {
            await langApi.saveAnswer(id, answer);
            await refreshAccount();
          }}
        />
      )}
      {screen.id === 'quiz' && (
        <QuizScreen
          store={store}
          lang={screen.lang}
          deck={screen.deck}
          mode={screen.mode}
          deckTitle={deckLabel(screen.deck, lessons)}
          onMark={(id, known) =>
            setStore((prev) => {
              const next = markCard(prev, id, known);
              if (id.startsWith('assigned:')) {
                const stats = next.progress[id];
                void langApi
                  .saveProgress(id.slice('assigned:'.length), {
                    stage: stats?.stage ?? 0,
                    known: stats?.known ?? 0,
                    unknown: stats?.unknown ?? 0,
                  })
                  .catch(() => undefined);
              }
              return next;
            })
          }
          onBack={() =>
            setScreen(
              screen.deck === 'study'
                ? { id: 'dictionary', lang: screen.lang }
                : { id: 'modes', lang: screen.lang, deck: screen.deck },
            )
          }
          onHome={() =>
            setScreen(
              screen.deck === 'study' ? { id: 'dictionary', lang: screen.lang } : { id: 'decks', lang: screen.lang },
            )
          }
        />
      )}
      {screen.id === 'words' && (
        <WordsScreen
          store={store}
          lang={screen.lang}
          onBack={() =>
            setScreen(
              screen.from === 'dictionary'
                ? { id: 'dictionary', lang: screen.lang }
                : { id: 'decks', lang: screen.lang },
            )
          }
          onAdd={(front, back, example, image) =>
            setStore((prev) => addCustomCard(prev, { lang: screen.lang, front, back, example, image }))
          }
          onRemove={(id) => setStore((prev) => removeCustomCard(prev, id))}
        />
      )}
    </div>
  );
}

function pop(screen: Screen, setScreen: (next: Screen) => void) {
  if (screen.id === 'decks') setScreen({ id: 'home' });
  else if (screen.id === 'dictionary') setScreen({ id: 'decks', lang: screen.lang });
  else if (screen.id === 'modes') setScreen({ id: 'decks', lang: screen.lang });
  else if (screen.id === 'quiz') {
    if (screen.deck === 'study') setScreen({ id: 'dictionary', lang: screen.lang });
    else setScreen({ id: 'modes', lang: screen.lang, deck: screen.deck });
  }   else if (screen.id === 'words') {
    setScreen(
      screen.from === 'dictionary'
        ? { id: 'dictionary', lang: screen.lang }
        : { id: 'decks', lang: screen.lang },
    );
  } else if (screen.id === 'tutor') {
    setScreen(screen.from === 'home' ? { id: 'home' } : { id: 'decks', lang: screen.lang });
  }
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
        <button className="back-btn" type="button" onClick={onBack} aria-label="Назад">
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
  account,
  panel,
  onPanel,
  onLang,
  onInstall,
}: {
  online: boolean;
  lastLang: LangId | null;
  account: LangAccount | null;
  panel: PanelId;
  onPanel: (panel: PanelId) => void;
  onLang: (lang: LangId) => void;
  onInstall?: () => void;
}) {
  return (
    <>
      <div className="hero">
        <h1>Карточки слов</h1>
        <p>
          Учить можно самому или вдвоём — режим выбирается в наборе.
          Самому: сначала слово, перевод открывается по нажатию.
          Вдвоём: слово и перевод сразу на карточке, и ты спрашиваешь второго.
          Слова живут в телефоне, без интернета.
        </p>
        <span className={`badge${online ? '' : ' is-offline'}`}>
          {account
            ? accountLabel(account)
            : online
              ? 'Открой из Telegram, чтобы админ увидел тебя'
              : 'Офлайн · карточки на устройстве'}
        </span>
      </div>
      <PanelSwitch account={account} panel={panel} onChange={onPanel} />
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
        Важно: если закрыть Telegram без сети, кнопка «Карточки» в боте часто не откроется -
        Telegram снова грузит сайт. Один раз с интернетом нажми «Установить на экран» (на
        iPhone: Поделиться → На экран «Домой»). Потом открывай иконку - карточки и свои слова
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
          На iPhone: в Safari или из Mini App - «Поделиться» → «На экран „Домой“».
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
  onDictionary,
  account,
  panel,
  onPanel,
  homework,
  lessons,
  onSaveHomework,
}: {
  store: Store;
  lang: LangId;
  onBack: () => void;
  onDeck: (deck: DeckTheme | 'all' | LessonDeck) => void;
  onWords: () => void;
  onDictionary: () => void;
  account: LangAccount | null;
  panel: PanelId;
  onPanel: (panel: PanelId) => void;
  homework: RemoteHomework[];
  lessons: RemoteLesson[];
  onSaveHomework: (id: string, answer: string) => Promise<void>;
}) {
  const meta = langById(lang);
  const allCount = deckCards(store, lang, 'all').length;
  const customCount = cardsFor(store, lang, 'custom').length;
  const study = studyCards(store, lang);
  const knownCount = study.filter((card) => (store.progress[card.id]?.stage ?? 0) >= 6).length;
  const lessonRows = [...lessons]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((lesson) => {
      const cards = store.cards.filter((card) => card.lang === lang && card.lessonId === lesson.id);
      const scale = scaleFromStages(cards.map((card) => store.progress[card.id]?.stage ?? 0));
      const done = cards.length > 0 && scale.known === cards.length;
      const tasks = homework.filter((item) => item.lessonId === lesson.id).length;
      return { lesson, cards, scale, done, tasks };
    });
  const openLessons = lessonRows.filter((row) => !row.done);
  const doneLessons = lessonRows.filter((row) => row.done);
  const lessonTile = (row: (typeof lessonRows)[number]) => (
    <button
      key={row.lesson.id}
      className={`tile has-ring${row.done ? ' is-done' : ''}`}
      type="button"
      onClick={() => onDeck(`lesson:${row.lesson.id}`)}
    >
      <span className="tile-copy">
        <span className="emoji">📖</span>
        <span className="title">{row.lesson.title}</span>
        <span className="meta">
          {row.done ? 'Пройден · ' : ''}
          {row.cards.length} {row.cards.length === 1 ? 'карточка' : 'карточек'}
          {row.tasks > 0 ? ` · ${row.tasks === 1 ? '1 задание' : `${row.tasks} задания`}` : ''}
          {' · '}
          {scaleCaption(row.scale)}
        </span>
      </span>
      <StageRing
        ratio={row.scale.ratio}
        label={`${row.scale.percent}%`}
        color={row.done ? '#3ee0a3' : stageColor(Math.round(row.scale.ratio * STAGE_MAX))}
        size={48}
      />
    </button>
  );

  return (
    <>
      <TopBar
        title={`${meta?.flag ?? ''} ${meta?.name ?? ''}`}
        subtitle={account ? accountLabel(account) : 'Выбери набор карточек'}
        onBack={onBack}
      />
      <PanelSwitch account={account} panel={panel} onChange={onPanel} />
      {openLessons.length > 0 && <div className="grid lessons-first">{openLessons.map(lessonTile)}</div>}
      <div className="modes" style={{ marginBottom: 16 }}>
        <button className="mode" type="button" onClick={onDictionary}>
          <span className="icon-wrap">
            <Library size={18} />
          </span>
          <span>
            <strong>Слова к изучению</strong>
            <span>
              {study.length === 0
                ? 'Отметь слова, которые нужно учить. У каждого — шкала из 6 шагов.'
                : `${knownCount} знаю из ${study.length}. Шкала из 6 шагов, как в словаре Skyeng.`}
            </span>
          </span>
        </button>
      </div>
      <div className="grid">
        <button className="tile" type="button" onClick={() => onDeck('all')}>
          <span className="emoji">📚</span>
          <span className="title">Все готовые</span>
          <span className="meta">{allCount} карточек · база + путешествие + еда</span>
        </button>
        {DECKS.filter((deck) => deck.id !== 'tutor' && deck.id !== 'custom').map((deck) => {
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
        {DECKS.filter((deck) => deck.id === 'custom').map((deck) => {
          const cards = cardsFor(store, lang, deck.id);
          const scale = scaleFromStages(cards.map((card) => store.progress[card.id]?.stage ?? 0));
          return (
            <button key={deck.id} className="tile has-ring" type="button" onClick={() => onDeck(deck.id)}>
              <span className="tile-copy">
                <span className="emoji">{deck.emoji}</span>
                <span className="title">{deck.title}</span>
                <span className="meta">
                  {cards.length} {cards.length === 1 ? 'карточка' : 'карточек'} · {scaleCaption(scale)}
                </span>
              </span>
              <StageRing
                ratio={scale.ratio}
                label={`${scale.percent}%`}
                color={stageColor(Math.round(scale.ratio * STAGE_MAX))}
                size={48}
              />
            </button>
          );
        })}
      </div>
      {doneLessons.length > 0 && <div className="grid lessons-done">{doneLessons.map(lessonTile)}</div>}
      {homework.some((item) => !item.lessonId) && (
        <div className="list" style={{ marginTop: 16 }}>
          <h2 className="section-label">Задания без урока</h2>
          <LessonTasks items={homework.filter((item) => !item.lessonId)} onSave={onSaveHomework} />
        </div>
      )}
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
  deckTitle,
  scale,
  tasks,
  count,
  onBack,
  onPick,
  onSaveHomework,
}: {
  lang: LangId;
  deckTitle: string;
  scale: Scale | null;
  tasks: RemoteHomework[];
  count: number;
  onBack: () => void;
  onPick: (mode: QuizMode) => void;
  onSaveHomework: (id: string, answer: string) => Promise<void>;
}) {
  const title = deckTitle;
  const langName = langById(lang)?.name ?? '';

  return (
    <>
      <TopBar title={title} subtitle={`${langName} · ${count} карточек`} onBack={onBack} />
      {scale && (
        <div className="lesson-scale">
          <StageRing
            ratio={scale.ratio}
            label={`${scale.percent}%`}
            color={stageColor(Math.round(scale.ratio * STAGE_MAX))}
            size={52}
          />
          <div>
            <strong>Шкала</strong>
            <span>{scaleCaption(scale)}. «Помню» заполняет кружок, «Не помню» чуть снимает.</span>
          </div>
        </div>
      )}
      {count === 0 ? (
        <p className="empty">В этом наборе пока пусто. Добавь слова - и они станут карточками.</p>
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
      {tasks.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h2 className="section-label">Домашнее задание</h2>
          <LessonTasks items={tasks} onSave={onSaveHomework} />
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
  deckTitle,
  onMark,
  onBack,
  onHome,
}: {
  store: Store;
  lang: LangId;
  deck: DeckPick;
  mode: QuizMode;
  deckTitle: string;
  onMark: (id: string, known: boolean) => void;
  onBack: () => void;
  onHome: () => void;
}) {
  const [queue, setQueue] = useState(() => {
    const cards = deckCards(store, lang, deck);
    return deck === 'study' ? studyQueue(cards, store.progress) : shuffleWeighted(cards, store.progress);
  });
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(mode === 'ask');
  const [known, setKnown] = useState(0);
  const [unknown, setUnknown] = useState(0);
  const [shownStage, setShownStage] = useState<number | null>(null);
  const done = index >= queue.length;
  const card = queue[index];
  const title = deckTitle;
  const inStudy = Boolean(card && store.progress[card.id]?.inStudy);
  const liveStage = shownStage ?? (card ? store.progress[card.id]?.stage ?? 0 : 0);

  useEffect(() => {
    if (shownStage === null) return;
    const timer = window.setTimeout(() => {
      setIndex((n) => n + 1);
      setRevealed(mode === 'ask');
      setShownStage(null);
    }, 560);
    return () => window.clearTimeout(timer);
  }, [shownStage, mode]);

  const again = () => {
    const cards = deckCards(store, lang, deck);
    setQueue(deck === 'study' ? studyQueue(cards, store.progress) : shuffleWeighted(cards, store.progress));
    setIndex(0);
    setRevealed(mode === 'ask');
    setKnown(0);
    setUnknown(0);
    setShownStage(null);
  };

  const answer = (isKnown: boolean) => {
    if (!card || shownStage !== null) return;
    haptic(isKnown ? 'ok' : 'no');
    const prevStage = store.progress[card.id]?.stage ?? 0;
    onMark(card.id, isKnown);
    if (isKnown) setKnown((n) => n + 1);
    else setUnknown((n) => n + 1);
    if (mode === 'study' && inStudy) {
      setShownStage(nextStage(prevStage, isKnown));
      return;
    }
    setIndex((n) => n + 1);
    setRevealed(mode === 'ask');
  };

  if (done) {
    return (
      <>
        <TopBar title={title} onBack={onHome} />
        <div className="summary">
          <h2>Готово</h2>
          <p>
            {deck === 'study'
              ? 'Шкала в словаре обновлена. Слабые слова снова придут раньше.'
              : 'Можно пройти ещё раз или сменить набор.'}
          </p>
          <div className="stats">
            <div>
              <b style={{ color: 'var(--ok)' }}>{known}</b>
              <span>{mode === 'study' ? 'помню' : 'знает'}</span>
            </div>
            <div>
              <b style={{ color: 'var(--no)' }}>{unknown}</b>
              <span>{mode === 'study' ? 'не помню' : 'не знает'}</span>
            </div>
          </div>
          <button className="btn primary" type="button" onClick={again}>
            Ещё раз
          </button>
          <div style={{ height: 10 }} />
          <button className="btn ghost" type="button" onClick={onHome}>
            {deck === 'study' ? 'В словарь' : 'К наборам'}
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
          <span className="flash-inner">
            {card.image && <img className="flash-photo" src={card.image} alt="" />}
            <span className="flash-front">{card.front}</span>
            {revealed ? (
              <>
                <span className="flash-translation">{card.back}</span>
                {card.example && <span className="flash-example">{card.example}</span>}
              </>
            ) : (
              <span className="flash-hint">Нажми, чтобы открыть перевод</span>
            )}
            {mode === 'study' && inStudy && (
              <span className="flash-stage">
                <WordRing stage={liveStage} size={64} />
                <StageDots stage={liveStage} size="lg" />
                <span>{stageLabel(liveStage)}</span>
              </span>
            )}
          </span>
        </button>
      </div>
      <div className="actions">
        {revealed ? (
          <>
            <button className="btn no" type="button" onClick={() => answer(false)} disabled={shownStage !== null}>
              {mode === 'study' ? 'Не помню' : 'Не знает'}
            </button>
            <button className="btn ok" type="button" onClick={() => answer(true)} disabled={shownStage !== null}>
              {mode === 'study' ? 'Помню' : 'Знает'}
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
  onAdd: (front: string, back: string, example?: string, image?: string) => void;
  onRemove: (id: string) => void;
}) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [example, setExample] = useState('');
  const [image, setImage] = useState('');
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
    onAdd(front, back, example, image || undefined);
    setFront('');
    setBack('');
    setExample('');
    setImage('');
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
          ? 'Есть сеть - после ввода слова появятся варианты перевода. Можно выбрать или написать свой.'
          : 'Офлайн - перевод вводишь сам. Подсказки появятся, когда будет интернет.'}
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
              <span className="suggest-meta">Не удалось получить варианты - введи перевод сам.</span>
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
          Картинка, если нужна
          <input
            type="file"
            accept="image/*"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                setImage(await readCardImage(file));
              } catch {
                setImage('');
              }
            }}
          />
        </label>
        {image && <img className="preview" src={image} alt="" />}
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
        <p className="empty">Пока пусто. Добавь слова - они останутся в телефоне и сработают офлайн.</p>
      ) : (
        <div className="list">
          {custom.map((card) => (
            <div key={card.id} className="word">
                <div>
                {card.image && <img className="word-photo" src={card.image} alt="" />}
                <div className="front">{card.front}</div>
                <div className="translation">{card.back}</div>
                {store.progress[card.id]?.inStudy && (
                  <div className="word-progress">
                    <WordRing stage={store.progress[card.id]?.stage ?? 0} />
                    <span>{stageLabel(store.progress[card.id]?.stage ?? 0)}</span>
                  </div>
                )}
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
