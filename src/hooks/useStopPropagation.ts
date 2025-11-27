import { useCallback } from 'react';

/**
 * Returns a memoized onClick handler that stops event propagation.
 * Useful for interactive elements inside clickable containers.
 *
 * @example
 * const stopPropagation = useStopPropagation();
 * <button onClick={stopPropagation}>Click me</button>
 *
 * @example
 * // With additional handler
 * const stopPropagation = useStopPropagation();
 * <button onClick={(e) => { stopPropagation(e); doSomething(); }}>
 */
export function useStopPropagation() {
  return useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
  }, []);
}

/**
 * Wraps an event handler to stop propagation before calling it.
 * Returns a memoized handler.
 *
 * @example
 * const handleClick = useWithStopPropagation(() => {
 *   console.log('clicked');
 * });
 * <button onClick={handleClick}>Click me</button>
 */
export function useWithStopPropagation<E extends React.SyntheticEvent>(handler?: (e: E) => void) {
  return useCallback(
    (e: E) => {
      e.stopPropagation();
      handler?.(e);
    },
    [handler]
  );
}
