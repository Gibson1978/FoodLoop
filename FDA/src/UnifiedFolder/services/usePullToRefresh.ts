// hooks/usePullToRefresh.ts
import { useState, useCallback } from 'react';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
      // Prevent over-scrolling beyond the maximum pull distance
      setPullDistance(Math.min(distance, 100)); 
    }
  }, [startY]);

  const onTouchEnd = useCallback(async () => {
    if (pullDistance > 60) { // Threshold to trigger refresh
      setRefreshing(true);
      
      const startTime = Date.now();
      const MIN_DELAY_MS = 500; // 🚨 Set minimum delay to 500ms
      
      try {
        // Execute the custom refresh logic
        await onRefresh(); 
        
      } finally {
        // --- Delay Logic ---
        const elapsedTime = Date.now() - startTime;

        if (elapsedTime < MIN_DELAY_MS) {
            // Wait the remaining time to ensure smooth UX
            await sleep(MIN_DELAY_MS - elapsedTime);
        }
        
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