export async function requestLandscapeLock(element: HTMLElement | null): Promise<void> {
  if (element !== null && document.fullscreenElement === null) {
    const requestFullscreen = (element as Partial<HTMLElement>).requestFullscreen;

    if (typeof requestFullscreen === 'function') {
      try {
        await requestFullscreen.call(element);
      } catch {
        // Fullscreen is optional; the landscape gate remains the fallback.
      }
    }
  }

  const orientation = screen.orientation as Partial<ScreenOrientation> | undefined;

  if (orientation !== undefined && typeof orientation.lock === 'function') {
    try {
      await orientation.lock('landscape');
    } catch {
      // Orientation lock is best-effort and unsupported on some browsers.
    }
  }
}

export async function releaseLandscapeLock(element: HTMLElement | null): Promise<void> {
  const orientation = screen.orientation as Partial<ScreenOrientation> | undefined;

  if (orientation !== undefined && typeof orientation.unlock === 'function') {
    try {
      orientation.unlock();
    } catch {
      // No active lock is not an error.
    }
  }

  if (element !== null && document.fullscreenElement === element) {
    const exitFullscreen = (document as Partial<Document>).exitFullscreen;

    if (typeof exitFullscreen === 'function') {
      try {
        await exitFullscreen.call(document);
      } catch {
        // The browser may have already left fullscreen.
      }
    }
  }
}
