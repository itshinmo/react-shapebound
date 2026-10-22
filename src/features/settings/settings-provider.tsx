import { useCallback, useEffect, useMemo, useState } from 'react';

import { SAVE_STORAGE_KEY } from '@/game/save';
import { getBrowserStorage, removeStorage } from '@/shared/lib/storage';

import { SettingsContext } from './settings-context';
import {
  SETTINGS_STORAGE_KEY,
  getDefaultSettings,
  getSystemReducedMotion,
  loadSettings,
  saveSettings,
} from './settings-storage';

import type { SettingsContextValue } from './settings-context';
import type { Settings } from './settings-storage';
import type { ReactNode } from 'react';

interface SettingsProviderProps {
  readonly children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [storage] = useState(() => getBrowserStorage());
  const [settings, setSettings] = useState<Settings>(() =>
    loadSettings(storage, getSystemReducedMotion()),
  );

  useEffect(() => {
    saveSettings(storage, settings);
  }, [settings, storage]);

  useEffect(() => {
    document.documentElement.dataset['reducedMotion'] = String(settings.reducedMotion);
  }, [settings.reducedMotion]);

  const setReducedMotion = useCallback((value: boolean) => {
    setSettings({ reducedMotion: value });
  }, []);

  const resetLocalData = useCallback(() => {
    removeStorage(storage, SETTINGS_STORAGE_KEY);
    removeStorage(storage, SAVE_STORAGE_KEY);
    setSettings(getDefaultSettings(getSystemReducedMotion()));
  }, [storage]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, setReducedMotion, resetLocalData }),
    [settings, setReducedMotion, resetLocalData],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
