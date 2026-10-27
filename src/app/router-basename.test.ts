import { describe, expect, it } from 'vitest';

import { getRouterBasename } from './router-basename';

describe('getRouterBasename', () => {
  it('uses the root basename for the root build', () => {
    expect(getRouterBasename('/')).toBe('/');
  });

  it('strips the trailing slash from a subpath build', () => {
    expect(getRouterBasename('/react-shapebound/')).toBe('/react-shapebound');
  });

  it('falls back to the root for an empty base', () => {
    expect(getRouterBasename('')).toBe('/');
  });
});
