import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { SettingsProvider } from '@/features/settings/settings-provider';

import type { ReactElement, ReactNode } from 'react';

interface ProvidersProps {
  readonly children: ReactNode;
  readonly route: string;
}

function Providers({ children, route }: ProvidersProps) {
  return (
    <SettingsProvider>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </SettingsProvider>
  );
}

interface RenderWithProvidersOptions {
  readonly route?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  { route = '/' }: RenderWithProvidersOptions = {},
) {
  return render(ui, {
    wrapper: ({ children }) => <Providers route={route}>{children}</Providers>,
  });
}
