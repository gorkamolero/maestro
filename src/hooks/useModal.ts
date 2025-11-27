import { useState, useCallback } from 'react';

/**
 * Hook for managing modal/popover open state.
 * Provides consistent API for opening, closing, and toggling modals.
 *
 * @param initialOpen - Initial open state (default: false)
 * @returns Object with isOpen state and control functions
 *
 * @example
 * const modal = useModal();
 *
 * <button onClick={modal.open}>Open Modal</button>
 * <Dialog open={modal.isOpen} onOpenChange={modal.setIsOpen}>
 *   <button onClick={modal.close}>Close</button>
 * </Dialog>
 *
 * @example
 * // With initial state
 * const modal = useModal(true);
 */
export function useModal(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    setIsOpen,
    open,
    close,
    toggle,
  };
}

/**
 * Return type for useModal hook
 */
export type UseModalReturn = ReturnType<typeof useModal>;
