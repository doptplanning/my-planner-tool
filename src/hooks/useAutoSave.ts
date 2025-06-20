import { useEffect, useRef } from 'react';

export function useAutoSave(value: string, onSave: (val: string) => void, delay = 2000) {
  const timer = useRef<number | null>(null);
  const prevValue = useRef<string>(value);

  useEffect(() => {
    if (prevValue.current === value) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      onSave(value);
      prevValue.current = value;
    }, delay);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [value, onSave, delay]);
} 