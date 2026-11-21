type SpeechAlternative = { transcript: string };
type SpeechResult = ArrayLike<SpeechAlternative> & { length: number };
type SpeechEvent = { results: ArrayLike<SpeechResult> };

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: (() => void) | null;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRec;
  webkitSpeechRecognition?: new () => SpeechRec;
};

function recognitionCtor(): (new () => SpeechRec) | null {
  if (typeof window === 'undefined') return null;
  const host = window as SpeechWindow;
  return host.SpeechRecognition || host.webkitSpeechRecognition || null;
}

export function canRecognizeSpeech(): boolean {
  return Boolean(recognitionCtor());
}

export function canSpeakAloud(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speechLang(lang: string, native: boolean): string {
  if (native) return 'ru-RU';
  if (lang === 'es') return 'es-ES';
  if (lang === 'fr') return 'fr-FR';
  if (lang === 'de') return 'de-DE';
  return 'en-US';
}

export function speakAloud(text: string, lang: string): boolean {
  if (!canSpeakAloud() || !text.trim()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 0.92;
  synth.speak(utter);
  return true;
}

export function recognizeSpeech(lang: string): Promise<string[]> {
  const Ctor = recognitionCtor();
  if (!Ctor) return Promise.reject(new Error('no-recognition'));
  return new Promise((resolve, reject) => {
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    let settled = false;
    const finish = (texts: string[]) => {
      if (settled) return;
      settled = true;
      resolve(texts);
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      reject(new Error('recognition-failed'));
    };
    const timer = window.setTimeout(() => {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
      fail();
    }, 7000);
    rec.onresult = (event) => {
      window.clearTimeout(timer);
      const first = event.results[0];
      const texts: string[] = [];
      if (first) {
        for (let index = 0; index < first.length; index += 1) texts.push(first[index].transcript);
      }
      finish(texts);
    };
    rec.onerror = () => {
      window.clearTimeout(timer);
      fail();
    };
    try {
      rec.start();
    } catch {
      window.clearTimeout(timer);
      fail();
    }
  });
}
