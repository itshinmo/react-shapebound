import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

function createMatchMedia(query: string, matches = false): MediaQueryList {
  return {
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  } as unknown as MediaQueryList;
}

// jsdom implements the <dialog> element but not its modal methods. The run-over dialog
// uses the native top layer and focus trap in browsers; tests only need the open state
// so the dialog is queryable and the component's focus movement runs.
const dialogPrototype = HTMLDialogElement.prototype as unknown as Record<string, unknown>;

if (typeof dialogPrototype['showModal'] !== 'function') {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    writable: true,
    value(this: HTMLDialogElement) {
      this.open = true;
    },
  });
}

if (typeof dialogPrototype['close'] !== 'function') {
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    writable: true,
    value(this: HTMLDialogElement) {
      this.open = false;
    },
  });
}

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => createMatchMedia(query)),
  });
});

afterEach(() => {
  cleanup();
});
