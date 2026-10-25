import { useState, useCallback, useRef } from 'react';

export interface UsePullToRefreshOptions {
  /**
   * Minimum duration in milliseconds to display the refresh indicator.
   * Ensures a smooth, premium feel without visual jitter or instant flicker.
   * Default: 400ms.
   */
  minDurationMs?: number;

  /**
   * Optional error callback when refresh fails.
   */
  onError?: (error: unknown) => void;
}

export interface UsePullToRefreshReturn {
  /** Whether a refresh is currently in progress */
  refreshing: boolean;
  /** Function to attach to onRefresh */
  onRefresh: () => Promise<void>;
}

/**
 * Custom hook for native pull-to-refresh with:
 * - Duplicate API call prevention via ref lock
 * - Graceful error handling (indicator always resets in finally block)
 * - Minimum duration timer to ensure smooth visual spinner animation
 */
export function usePullToRefresh(
  refreshAction: () => Promise<unknown> | void,
  options: UsePullToRefreshOptions = {}
): UsePullToRefreshReturn {
  const { minDurationMs = 400, onError } = options;
  const [refreshing, setRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);

  const onRefresh = useCallback(async () => {
    // Prevent duplicate triggers if refresh is already in-flight
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    setRefreshing(true);
    const startTime = Date.now();

    try {
      await refreshAction();
    } catch (error) {
      console.warn('PullToRefresh error:', error);
      if (onError) {
        onError(error);
      }
    } finally {
      // Ensure smooth animation: keep indicator visible for at least minDurationMs
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, minDurationMs - elapsed);

      if (remainingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }

      isRefreshingRef.current = false;
      setRefreshing(false);
    }
  }, [refreshAction, minDurationMs, onError]);

  return {
    refreshing,
    onRefresh,
  };
}
