import React, { useEffect, useRef } from 'react';
import { useDeviceDetection } from '../../utils/deviceDetection';
import styles from './TouchGestureOverlay.module.scss';

interface TouchGestureOverlayProps {
  onSingleFingerMove?: (deltaX: number, deltaY: number) => void;
  onPinchZoom?: (zoomDelta: number, center: { x: number; y: number }) => void;
  onTwoFingerRotate?: (angleDelta: number) => void;
}

interface TouchState {
  isActive: boolean;
  touches: Array<{ x: number; y: number }>;
  lastDistance: number;
  lastAngle: number;
}

export const TouchGestureOverlay: React.FC<TouchGestureOverlayProps> = ({
  onSingleFingerMove,
  onPinchZoom,
  onTwoFingerRotate
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const touchStateRef = useRef<TouchState>({
    isActive: false,
    touches: [],
    lastDistance: 0,
    lastAngle: 0
  });

  const { isMobile, isTablet } = useDeviceDetection();
  
  // Show overlay only on mobile/tablet or Chrome emulation
  const shouldShowOverlay = isMobile || isTablet || 
    (window.innerWidth <= 768) || 
    navigator.userAgent.includes('Mobile') ||
    navigator.userAgent.includes('Android') ||
    navigator.userAgent.includes('iPhone');

  const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touch1: Touch, touch2: Touch) => ({
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2
  });

  const getTouchAngle = (touch1: Touch, touch2: Touch): number => {
    return Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX);
  };

  const handleTouchStart = (event: TouchEvent) => {
    // Check if touch is on a button or interactive element
    const target = event.target as HTMLElement;
    if (target && (
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'LABEL' ||
      target.closest('button') ||
      target.closest('label') ||
      target.closest('[role="button"]') ||
      target.classList.contains('clickable')
    )) {
      return;
    }

    const touches = Array.from(event.touches);
    
    touchStateRef.current.isActive = true;
    touchStateRef.current.touches = touches.map(t => ({ x: t.clientX, y: t.clientY }));

    if (touches.length === 2) {
      touchStateRef.current.lastDistance = getTouchDistance(touches[0], touches[1]);
      touchStateRef.current.lastAngle = getTouchAngle(touches[0], touches[1]);
    }
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (!touchStateRef.current.isActive) return;

    const touches = Array.from(event.touches);

    if (touches.length === 1 && touchStateRef.current.touches.length === 1) {
      // Single finger rotation
      const deltaX = touches[0].clientX - touchStateRef.current.touches[0].x;
      const deltaY = touches[0].clientY - touchStateRef.current.touches[0].y;
      
      onSingleFingerMove?.(deltaX, deltaY);
      
      touchStateRef.current.touches = [{ x: touches[0].clientX, y: touches[0].clientY }];
    } else if (touches.length === 2) {
      // Two finger gestures
      const currentDistance = getTouchDistance(touches[0], touches[1]);
      const currentAngle = getTouchAngle(touches[0], touches[1]);
      const center = getTouchCenter(touches[0], touches[1]);

      // Pinch zoom
      if (touchStateRef.current.lastDistance > 0) {
        const zoomDelta = (currentDistance - touchStateRef.current.lastDistance) * 0.01;
        onPinchZoom?.(zoomDelta, center);
      }

      // Two finger rotation
      if (touchStateRef.current.lastAngle !== 0) {
        const angleDelta = currentAngle - touchStateRef.current.lastAngle;
        onTwoFingerRotate?.(angleDelta);
      }

      touchStateRef.current.lastDistance = currentDistance;
      touchStateRef.current.lastAngle = currentAngle;
      touchStateRef.current.touches = touches.map(t => ({ x: t.clientX, y: t.clientY }));
    }

    // Prevent default only for multi-touch to avoid interfering with single taps
    if (touches.length > 1) {
      event.preventDefault();
    }
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (event.touches.length === 0) {
      touchStateRef.current.isActive = false;
      touchStateRef.current.touches = [];
      touchStateRef.current.lastDistance = 0;
      touchStateRef.current.lastAngle = 0;
    }
  };

  useEffect(() => {
    if (!shouldShowOverlay) return;

    // Attach events to document body instead of overlay to avoid blocking clicks
    document.body.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.body.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.body.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.body.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      document.body.removeEventListener('touchstart', handleTouchStart);
      document.body.removeEventListener('touchmove', handleTouchMove);
      document.body.removeEventListener('touchend', handleTouchEnd);
      document.body.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [shouldShowOverlay]);

  if (!shouldShowOverlay) {
    return null;
  }

  return (
    <div 
      ref={overlayRef}
      className={styles.touchOverlay}
      data-testid="touch-gesture-overlay"
    >
      <div className={styles.debugInfo}>
        Touch Overlay Active
      </div>
    </div>
  );
};
