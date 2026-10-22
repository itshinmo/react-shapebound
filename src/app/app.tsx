import { HashRouter, Route, Routes } from 'react-router';

import { NotFoundScreen } from '@/features/not-found/not-found-screen';
import { PlayScreen } from '@/features/play/play-screen';
import { SettingsProvider } from '@/features/settings/settings-provider';
import { SettingsScreen } from '@/features/settings/settings-screen';
import { TitleScreen } from '@/features/title/title-screen';

import { AppErrorBoundary } from './app-error-boundary';
import { AppShell } from './app-shell';

export function App() {
  return (
    <AppErrorBoundary>
      <SettingsProvider>
        <HashRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<TitleScreen />} />
              <Route path="/play" element={<PlayScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="*" element={<NotFoundScreen />} />
            </Routes>
          </AppShell>
        </HashRouter>
      </SettingsProvider>
    </AppErrorBoundary>
  );
}
