import { useEffect, useMemo, useRef } from 'react';
import { debounce } from 'lodash';

export function useDebounce<T extends (...args: never[]) => void>(
  fn: T,
  ms: number,
  maxWait?: number
) {
  const funcRef = useRef<T | null>(null);

  useEffect(() => {
    funcRef.current = fn;
  }, [fn]);

  return useMemo(
    () =>
      debounce(
        // eslint-disable-next-line react-hooks/refs
        (...args: Parameters<T>) => {
          if (funcRef.current) {
            funcRef.current(...args);
          }
        },
        ms,
        { maxWait }
      ),
    [ms, maxWait]
  );
}
