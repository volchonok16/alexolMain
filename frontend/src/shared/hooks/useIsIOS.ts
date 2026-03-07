export const useIsIOS = () =>
  typeof window !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent);
