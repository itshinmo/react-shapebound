import { createContext, useContext } from 'react';

import type { Settings } from './settings-storage';

export interface SettingsContextValue {
  readonly settings: Settings;
  readonly setReducedMotion: (value: boolean) => void;
  readonly setGlowIntensity: (value: number) => void;
  readonly resetLocalData: () => void;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);

  if (value === null) {
    throw new Error('useSettings must be used inside SettingsProvider.');
  }

  return value;
}
