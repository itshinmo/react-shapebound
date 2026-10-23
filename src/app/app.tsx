import { BrowserRouter, Route, Routes } from 'react-router';

import { NotFoundScreen } from '@/features/not-found/not-found-screen';
import { PlayScreen } from '@/features/play/play-screen';
import { SettingsProvider } from '@/features/settings/settings-provider';
import { SettingsScreen } from '@/features/settings/settings-screen';
import { TitleScreen } from '@/features/title/title-screen';

import { AppErrorBoundary } from './app-error-boundary';
import { AppShell } from './app-shell';
import { PresentationLayout } from './presentation-layout';

export function App() {
  return (
    <AppErrorBoundary>
      <SettingsProvider>
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route element={<PresentationLayout />}>
                <Route path="/" element={<TitleScreen />} />
                <Route path="/settings" element={<SettingsScreen />} />
                <Route path="*" element={<NotFoundScreen />} />
              </Route>
              <Route path="/play" element={<PlayScreen />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </SettingsProvider>
    </AppErrorBoundary>
  );
}
