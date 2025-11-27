import { toast } from 'sonner';

/**
 * Error handling utilities for consistent error logging and user feedback.
 */

interface LogErrorOptions {
  /** Prefix for the log message (e.g., '[MyService]') */
  prefix?: string;
  /** Additional context to log */
  context?: Record<string, unknown>;
  /** Whether to show a toast to the user */
  showToast?: boolean;
  /** Custom toast message (defaults to error message) */
  toastMessage?: string;
  /** Toast duration in ms (default: 5000, errors: 10000) */
  toastDuration?: number;
}

/**
 * Log an error with consistent formatting and optional user notification.
 *
 * @example
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   logError(error, { prefix: '[MyService]', showToast: true });
 * }
 */
export function logError(error: unknown, options: LogErrorOptions = {}): void {
  const { prefix = '', context, showToast = false, toastMessage, toastDuration = 10000 } = options;

  const errorMessage = getErrorMessage(error);
  const logPrefix = prefix ? `${prefix} ` : '';

  // Log to console
  if (context) {
    console.error(`${logPrefix}${errorMessage}`, context);
  } else {
    console.error(`${logPrefix}${errorMessage}`);
  }

  // Show toast if requested
  if (showToast) {
    toast.error(toastMessage || errorMessage, { duration: toastDuration });
  }
}

/**
 * Log a warning with consistent formatting.
 */
export function logWarn(
  message: string,
  options: Omit<LogErrorOptions, 'showToast' | 'toastMessage' | 'toastDuration'> = {}
): void {
  const { prefix = '', context } = options;
  const logPrefix = prefix ? `${prefix} ` : '';

  if (context) {
    console.warn(`${logPrefix}${message}`, context);
  } else {
    console.warn(`${logPrefix}${message}`);
  }
}

/**
 * Extract a string message from an unknown error.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Wrap an async function with error handling.
 * Logs errors and optionally shows a toast.
 *
 * @example
 * // Basic usage - logs errors silently
 * const safeFetch = withErrorHandling(fetchData, { prefix: '[API]' });
 * await safeFetch();
 *
 * @example
 * // With user notification
 * const safeSave = withErrorHandling(saveDocument, {
 *   prefix: '[DocumentService]',
 *   showToast: true,
 *   toastMessage: 'Failed to save document'
 * });
 */
export function withErrorHandling<T extends (...args: Parameters<T>) => Promise<unknown>>(
  fn: T,
  options: LogErrorOptions = {}
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  return async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
    try {
      return (await fn(...args)) as ReturnType<T>;
    } catch (error) {
      logError(error, options);
      return undefined;
    }
  };
}

/**
 * Create a catch handler for promise chains.
 * Use with .catch() for cleaner async code.
 *
 * @example
 * // Instead of .catch(console.error)
 * fetchData().catch(handleError({ prefix: '[API]' }));
 *
 * @example
 * // With toast notification
 * saveData().catch(handleError({
 *   prefix: '[Save]',
 *   showToast: true,
 *   toastMessage: 'Failed to save changes'
 * }));
 */
export function handleError(options: LogErrorOptions = {}): (error: unknown) => void {
  return (error: unknown) => logError(error, options);
}

/**
 * Try to execute a function and return a result tuple.
 * Useful for handling errors without try/catch blocks.
 *
 * @example
 * const [result, error] = await tryCatch(() => riskyOperation());
 * if (error) {
 *   // handle error
 * }
 */
export async function tryCatch<T>(fn: () => Promise<T>): Promise<[T, null] | [null, Error]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    const err = error instanceof Error ? error : new Error(getErrorMessage(error));
    return [null, err];
  }
}

/**
 * Create a service-specific logger with a preset prefix.
 *
 * @example
 * const logger = createServiceLogger('[MyService]');
 * logger.error(error); // Logs: [MyService] Error message
 * logger.warn('Something happened');
 */
export function createServiceLogger(prefix: string) {
  return {
    error: (error: unknown, options: Omit<LogErrorOptions, 'prefix'> = {}) =>
      logError(error, { ...options, prefix }),
    warn: (message: string, context?: Record<string, unknown>) =>
      logWarn(message, { prefix, context }),
    handleError: (options: Omit<LogErrorOptions, 'prefix'> = {}) =>
      handleError({ ...options, prefix }),
  };
}
