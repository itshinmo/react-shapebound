export function isTouchDevice(): boolean {
  if (navigator.maxTouchPoints > 0) {
    return true;
  }

  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}
