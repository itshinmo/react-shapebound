import { BrowserRouter, Route, Routes } from 'react-router';

import { NotFoundScreen } from '@/features/not-found/not-found-screen';
import { PlayScreen } from '@/features/play/play-screen';
import { SettingsProvider } from '@/features/settings/settings-provider';
import { SettingsScreen } from '@/features/settings/settings-screen';
import { SkillsScreen } from '@/features/skills/skills-screen';
import { TitleScreen } from '@/features/title/title-screen';

import { AppErrorBoundary } from './app-error-boundary';
import { AppShell } from './app-shell';
import { PresentationLayout } from './presentation-layout';
import { getRouterBasename } from './router-basename';

const basename = getRouterBasename(import.meta.env.BASE_URL);

export function App() {
  return (
    <AppErrorBoundary>
      <SettingsProvider>
        <BrowserRouter basename={basename}>
          <AppShell>
            <Routes>
              <Route element={<PresentationLayout />}>
                <Route path="/" element={<TitleScreen />} />
                <Route path="/settings" element={<SettingsScreen />} />
                <Route path="/skills" element={<SkillsScreen />} />
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
