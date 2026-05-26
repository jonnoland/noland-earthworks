/**
 * usePullToRefresh — Native-feeling pull-to-refresh for scrollable containers.
 *
 * Usage:
 *   const { containerRef, pullDistance, isRefreshing } = usePullToRefresh({
 *     onRefresh: async () => { await refetch(); },
 *   });
 *   <div ref={containerRef} ...>...</div>
 *
 * The hook tracks touch events on the container. When the user pulls down
 * more than THRESHOLD px from the top of the scroll area, it calls onRefresh.
 * The pull distance is exposed so the caller can render a visual indicator.
 */
import { useRef, useState, useCallback, useEffect } from "react";

const THRESHOLD = 72;   // px of pull required to trigger refresh
const MAX_PULL = 110;   // px cap on visual pull distance

interface Options {
  onRefresh: () => Promise<void>;
  /** Only trigger if the scroll container is scrolled to the top. Default true. */
  requireScrollTop?: boolean;
}

export function usePullToRefresh({ onRefresh, requireScrollTop = true }: Options) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isRefreshing) return;
    const el = containerRef.current;
    if (!el) return;
    if (requireScrollTop && el.scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
  }, [isRefreshing, requireScrollTop]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startYRef.current === null || isRefreshing) return;
    const el = containerRef.current;
    if (!el) return;
    if (requireScrollTop && el.scrollTop > 0) {
      startYRef.current = null;
      setPullDistance(0);
      return;
    }
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }
    // Rubber-band damping: feels progressively harder to pull
    const damped = Math.min(MAX_PULL, delta * 0.5);
    setPullDistance(damped);
    // Prevent default scroll when pulling down
    if (delta > 5) {
      e.preventDefault();
    }
  }, [isRefreshing, requireScrollTop]);

  const handleTouchEnd = useCallback(async () => {
    if (startYRef.current === null) return;
    startYRef.current = null;
    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD); // hold at threshold while refreshing
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { containerRef, pullDistance, isRefreshing, threshold: THRESHOLD };
}
