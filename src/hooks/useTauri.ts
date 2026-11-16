/**
 * Tauri IPC Integration Hook
 *
 * Provides a clean wrapper around Tauri 2 invoke() IPC commands.
 * Automatically falls back gracefully when running in web browser preview mode.
 */

import { useState, useCallback } from 'react';

export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function useTauri() {
  const [isTauri] = useState(isTauriEnvironment);

  const invokeCommand = useCallback(
    async <T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> => {
      if (isTauri) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          return await invoke<T>(cmd, args);
        } catch (err) {
          console.warn(`[Tauri IPC] Failed to invoke command '${cmd}':`, err);
          throw err;
        }
      } else {
        // Web browser preview mock responses
        console.debug(`[Tauri Mock] Invoke '${cmd}'`, args);
        if (cmd === 'get_app_version') {
          return '0.1.0' as unknown as T;
        }
        if (cmd === 'validate_role_access') {
          return { allowed: true } as unknown as T;
        }
        return null;
      }
    },
    [isTauri]
  );

  return {
    isTauri,
    invokeCommand,
  };
}
