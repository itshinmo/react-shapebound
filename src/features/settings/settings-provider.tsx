import { useCallback, useEffect, useMemo, useState } from 'react';

import { SAVE_STORAGE_KEY } from '@/game/save';
import { getBrowserStorage, removeStorage } from '@/shared/lib/storage';

import { SettingsContext } from './settings-context';
import {
  SETTINGS_STORAGE_KEY,
  getDefaultSettings,
  getSystemReducedMotion,
  loadSettings,
  normalizeGlowIntensity,
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

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--glow-intensity', String(settings.glowIntensity));

    return () => {
      root.style.removeProperty('--glow-intensity');
    };
  }, [settings.glowIntensity]);

  const setReducedMotion = useCallback((value: boolean) => {
    setSettings((current) => ({ ...current, reducedMotion: value }));
  }, []);

  const setGlowIntensity = useCallback((value: number) => {
    setSettings((current) => ({
      ...current,
      glowIntensity: normalizeGlowIntensity(value),
    }));
  }, []);

  const resetLocalData = useCallback(() => {
    removeStorage(storage, SETTINGS_STORAGE_KEY);
    removeStorage(storage, SAVE_STORAGE_KEY);
    setSettings(getDefaultSettings(getSystemReducedMotion()));
  }, [storage]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, setReducedMotion, setGlowIntensity, resetLocalData }),
    [settings, setReducedMotion, setGlowIntensity, resetLocalData],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
