import { useEffect, useState } from 'react';

const PORTRAIT_QUERY = '(orientation: portrait)';

function getPortrait(): boolean {
  try {
    return window.matchMedia(PORTRAIT_QUERY).matches;
  } catch {
    return false;
  }
}

export function useLandscape(): boolean {
  const [portrait, setPortrait] = useState<boolean>(getPortrait);

  useEffect(() => {
    let query: MediaQueryList;

    try {
      query = window.matchMedia(PORTRAIT_QUERY);
    } catch {
      return;
    }

    const update = () => {
      setPortrait(query.matches);
    };

    update();
    query.addEventListener('change', update);
    window.addEventListener('resize', update);

    return () => {
      query.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return !portrait;
}
