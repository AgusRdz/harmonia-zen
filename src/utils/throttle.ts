/**
 * Throttle utility - limits function execution to once per specified delay
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function (...args: Parameters<T>): void {
    const now = Date.now()
    const timeSinceLastCall = now - lastCall

    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }

    if (timeSinceLastCall >= delay) {
      lastCall = now
      fn(...args)
    } else {
      timeoutId = setTimeout(() => {
        lastCall = Date.now()
        fn(...args)
        timeoutId = null
      }, delay - timeSinceLastCall)
    }
  }
}

/**
 * Debounce utility - delays function execution until after specified delay
 * since the last invocation
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function (...args: Parameters<T>): void {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}
