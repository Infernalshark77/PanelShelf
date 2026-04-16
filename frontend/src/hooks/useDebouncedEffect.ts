import { DependencyList, useEffect } from 'react';

export function useDebouncedEffect(effect: () => void | (() => void), delay: number, deps: DependencyList) {
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      effect();
    }, delay);

    return () => {
      window.clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}
