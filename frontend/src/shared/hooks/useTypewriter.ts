import { useState, useEffect } from "react";

export const useTypewriter = (text: string, speed: number = 50) => {
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isDeleting) {
      if (displayText.length === 0) {
        setIsDeleting(false);
        return;
      }
      const timeout = setTimeout(() => {
        setDisplayText(displayText.slice(0, -1));
      }, speed / 2);
      return () => clearTimeout(timeout);
    } else {
      if (displayText === text) return;
      
      const timeout = setTimeout(() => {
        setDisplayText(text.slice(0, displayText.length + 1));
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [displayText, text, isDeleting, speed]);

  useEffect(() => {
    if (displayText !== text && displayText.length > 0) {
      setIsDeleting(true);
    }
  }, [text]);

  return displayText;
};
