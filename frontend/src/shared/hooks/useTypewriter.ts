import { useState, useEffect } from 'react';

export const useTypewriter = (text: string, speed: number = 50) => {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const erase = (current: string) => {
      if (current.length === 0) {
        type('', 0);
        return;
      }
      setDisplayText(current.slice(0, -1));
      timeout = setTimeout(() => erase(current.slice(0, -1)), speed / 2);
    };

    const type = (current: string, index: number) => {
      if (index >= text.length) return;
      setDisplayText(text.slice(0, index + 1));
      timeout = setTimeout(() => type(text.slice(0, index + 1), index + 1), speed);
    };

    setDisplayText(prev => {
      if (prev.length > 0) {
        timeout = setTimeout(() => erase(prev), speed);
      } else {
        timeout = setTimeout(() => type('', 0), speed);
      }
      return prev;
    });

    return () => clearTimeout(timeout);
  }, [text, speed]);

  return displayText;
};
