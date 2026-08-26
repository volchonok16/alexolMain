type ThemeParams = {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
};

type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  disableVerticalSwipes?: () => void;
  colorScheme?: 'light' | 'dark';
  themeParams?: ThemeParams;
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (fn: () => void) => void;
    offClick: (fn: () => void) => void;
  };
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getTelegram(): TelegramWebApp | undefined {
  return window.Telegram?.WebApp;
}

export function initTelegram(): TelegramWebApp | undefined {
  const tg = getTelegram();
  if (!tg) return undefined;
  tg.ready();
  tg.expand();
  tg.setHeaderColor?.('#0A0C10');
  tg.setBackgroundColor?.('#0A0C10');
  tg.disableVerticalSwipes?.();
  return tg;
}

export function haptic(kind: 'tap' | 'ok' | 'no' = 'tap'): void {
  const hapticApi = getTelegram()?.HapticFeedback;
  if (!hapticApi) return;
  if (kind === 'ok') hapticApi.notificationOccurred('success');
  else if (kind === 'no') hapticApi.notificationOccurred('error');
  else hapticApi.impactOccurred('light');
}

export function queryLang(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('lang');
}
