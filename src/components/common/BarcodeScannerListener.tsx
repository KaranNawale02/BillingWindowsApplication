import { useEffect, useRef } from 'react';

interface BarcodeScannerListenerProps {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxIntervalMs?: number;
}

/**
 * Keyboard-wedge USB barcode scanner listener.
 * Scanners emulate rapid keystrokes followed by an 'Enter' keypress.
 */
export function useBarcodeScanner({
  onScan,
  minChars = 4,
  maxIntervalMs = 50,
}: BarcodeScannerListenerProps) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside an explicit input or textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInput) return;

      const currentTime = Date.now();
      const interval = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minChars) {
          onScan(bufferRef.current.trim());
          bufferRef.current = '';
          e.preventDefault();
        } else {
          bufferRef.current = '';
        }
        return;
      }

      // If time between keystrokes was too long, reset buffer (user is hand-typing)
      if (interval > maxIntervalMs && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      // Only accumulate printable single characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan, minChars, maxIntervalMs]);
}
