// hooks/usePullToRefresh.ts
import { useState, useCallback } from 'react';

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [refreshing, setRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setStartY(e.touches[0].pageY);
    setPullDistance(0);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startY) return;
    
    const currentY = e.touches[0].pageY;
    const distance = currentY - startY;
    
    // Only trigger pull-to-refresh when at the top of the page
    if (window.scrollY <= 0 && distance > 0) {
      setPullDistance(Math.min(distance, 100));
    }
  }, [startY]);

  const onTouchEnd = useCallback(async () => {
    if (pullDistance > 60) { // Threshold to trigger refresh
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
    setStartY(0);
  }, [pullDistance, onRefresh]);

  return {
    refreshing,
    pullDistance,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}