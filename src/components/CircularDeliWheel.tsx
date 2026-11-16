import {useCallback, useEffect, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {DeliCategory} from '../types';
import {CafeLogo} from './CafeLogo';
import {DishEffectsOverlay} from './DishEffectsOverlay';
import {ResilientPlateImage} from './ResilientPlateImage';

interface CircularDeliWheelProps {
  categories: DeliCategory[];
  selectedProduct: DeliCategory | null;
  isBlurred?: boolean;
  onSelectCategory: (category: DeliCategory) => void;
  onOpenOrder: (category: DeliCategory) => void;
  onLogoLongPress?: () => void;
}

function normalizeAngleDiff(target: number, current: number): number {
  let diff = (target - current) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

export function CircularDeliWheel({
  categories,
  selectedProduct,
  isBlurred = false,
  onSelectCategory,
  onOpenOrder,
  onLogoLongPress,
}: CircularDeliWheelProps) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState<number>(0);
  const rotationRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const centerPressTimerRef = useRef<number | null>(null);
  const centerPressOriginRef = useRef<{x: number; y: number} | null>(null);

  const dragState = useRef<{
    active: boolean;
    captured: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    lastAngle: number;
    lastTime: number;
    velocity: number;
    movedDistance: number;
  }>({
    active: false,
    captured: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastAngle: 0,
    lastTime: 0,
    velocity: 0,
    movedDistance: 0,
  });

  const rafRef = useRef<number | null>(null);
  const snapAnimRef = useRef<number | null>(null);

  const cancelAnimations = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (snapAnimRef.current !== null) {
      cancelAnimationFrame(snapAnimRef.current);
      snapAnimRef.current = null;
    }
  }, []);

  const clearCenterLongPress = useCallback(() => {
    if (centerPressTimerRef.current !== null) {
      window.clearTimeout(centerPressTimerRef.current);
      centerPressTimerRef.current = null;
    }
    centerPressOriginRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimations();
      clearCenterLongPress();
    };
  }, [cancelAnimations, clearCenterLongPress]);

  const getPointerAngle = (clientX: number, clientY: number): number => {
    const el = wheelRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  };

  const animateToAngle = useCallback(
    (targetAngle: number) => {
      cancelAnimations();
      const startAngle = rotationRef.current;
      const diff = normalizeAngleDiff(targetAngle, startAngle);
      const startTime = performance.now();
      const duration = 440;

      const step = (now: number) => {
        const elapsed = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - elapsed, 4);
        const next = startAngle + diff * eased;
        rotationRef.current = next;
        setRotation(next);
        if (elapsed < 1) {
          snapAnimRef.current = requestAnimationFrame(step);
        } else {
          snapAnimRef.current = null;
        }
      };

      snapAnimRef.current = requestAnimationFrame(step);
    },
    [cancelAnimations],
  );

  const startInertia = useCallback(
    (initialVelocity: number) => {
      cancelAnimations();
      let vel = Math.max(-18, Math.min(18, initialVelocity));

      const tick = () => {
        if (Math.abs(vel) < 0.04) {
          rafRef.current = null;
          return;
        }
        const next = rotationRef.current + vel;
        rotationRef.current = next;
        setRotation(next);
        vel *= 0.93;
        rafRef.current = requestAnimationFrame(tick);
      };

      if (Math.abs(vel) > 0.12) {
        rafRef.current = requestAnimationFrame(tick);
      }
    },
    [cancelAnimations],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isBlurred) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    cancelAnimations();
    const angle = getPointerAngle(e.clientX, e.clientY);
    dragState.current = {
      active: true,
      captured: false,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastAngle: angle,
      lastTime: performance.now(),
      velocity: 0,
      movedDistance: 0,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state.active || isBlurred) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    const dist = Math.hypot(dx, dy);
    state.movedDistance = Math.max(state.movedDistance, dist);

    if (!state.captured && dist > 5) {
      state.captured = true;
      setIsDragging(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }

    if (!state.captured) return;

    const currentAngle = getPointerAngle(e.clientX, e.clientY);
    let delta = currentAngle - state.lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    const now = performance.now();
    const dt = Math.max(8, now - state.lastTime);
    state.velocity = (delta / dt) * 16;
    state.lastAngle = currentAngle;
    state.lastTime = now;

    const next = rotationRef.current + delta;
    rotationRef.current = next;
    setRotation(next);
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state.active) return;
    const wasDragging = state.captured;
    const velocity = state.velocity;

    state.active = false;
    state.captured = false;
    setIsDragging(false);

    if (wasDragging) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }
      startInertia(velocity);
    }
  };

  const handleCategoryClick = (cat: DeliCategory, index: number) => {
    if (dragState.current.movedDistance > 6 || isBlurred) return;
    onSelectCategory(cat);

    const baseAngle = -90 + (index * 360) / categories.length;
    const desiredRotation = -90 - baseAngle;
    animateToAngle(desiredRotation);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isBlurred) return;
    const currentIndex = selectedProduct
      ? categories.findIndex((c) => c.id === selectedProduct.id)
      : -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % categories.length;
      handleCategoryClick(categories[nextIndex], nextIndex);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + categories.length) % categories.length;
      handleCategoryClick(categories[prevIndex], prevIndex);
    }
  };

  return (
    <div
      ref={wheelRef}
      role="region"
      aria-label="Rotatable deli category wheel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      style={{touchAction: 'none'}}
      className={`relative aspect-square w-[min(96vw,74dvh)] sm:w-[min(88vw,74dvh)] lg:w-[580px] xl:w-[620px] select-none rounded-full transition-[filter,transform,opacity] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C89B62]/60 ${
        isBlurred ? 'blur-[14px] scale-[0.95] opacity-45 pointer-events-none' : ''
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      {/* Subtle architectural orbital rings on the dark wood surface */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[9.5%] rounded-full border border-[#F5EFE6]/12"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[25.5%] rounded-full border border-[#C89B62]/20"
      />

      {/* Rotating ring layer */}
      <div
        style={{transform: `rotate(${rotation}deg)`}}
        className="absolute inset-0 will-change-transform"
      >
        {categories.map((cat, index) => {
          const angleDeg = -90 + (index * 360) / categories.length;
          const angleRad = (angleDeg * Math.PI) / 180;
          const leftPct = 50 + 40.5 * Math.cos(angleRad);
          const topPct = 50 + 40.5 * Math.sin(angleRad);
          const isActive = selectedProduct?.id === cat.id;

          return (
            <div
              key={cat.id}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
              }}
              className="absolute z-10 will-change-transform"
            >
              <button
                type="button"
                onClick={() => handleCategoryClick(cat, index)}
                aria-pressed={isActive}
                aria-label={`${cat.category}: ${cat.productName}`}
                className="group flex flex-col items-center focus-visible:outline-none"
              >
                <div
                  style={
                    isActive
                      ? {
                          boxShadow: `0 0 0 2px ${cat.accentColor}, 0 14px 32px rgba(0,0,0,0.8)`,
                        }
                      : undefined
                  }
                  className={`relative h-[82px] w-[82px] sm:h-[98px] sm:w-[98px] lg:h-[112px] lg:w-[112px] xl:h-[120px] xl:w-[120px] rounded-full transition-transform duration-200 ease-out ${
                    isActive
                      ? 'scale-110'
                      : 'opacity-90 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  <ResilientPlateImage
                    src={cat.image}
                    alt={cat.category}
                    imageScale={cat.imageScale}
                    swirl={cat.effects.includes('coffee-swirl')}
                    spinPlate={isActive}
                    className="h-full w-full"
                    shadowClassName="shadow-[0_14px_32px_rgba(0,0,0,0.76)]"
                  />
                  {/* Lively Dish Effects (Steam / Dripping Chocolate) */}
                  <DishEffectsOverlay effects={cat.effects} compact />
                </div>
                <span
                  style={isActive ? {color: cat.accentColor} : undefined}
                  className={`mt-1.5 whitespace-nowrap text-[11px] sm:text-xs lg:text-[13px] font-medium tracking-[0.04em] transition-colors duration-200 px-2 py-0.5 rounded bg-[#120E0C]/82 backdrop-blur-[2px] ${
                    isActive ? '' : 'text-[#E6DDD0]/85 group-hover:text-[#F5EFE6]'
                  }`}
                >
                  {cat.category}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Center Circle Stage: Cafe Logo initially -> Selected Product + Price + Order button on click */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!selectedProduct ? (
            <motion.div
              key="center-cafe-logo"
              initial={{opacity: 0, scale: 0.88}}
              animate={{opacity: 1, scale: 1}}
              exit={{opacity: 0, scale: 0.88}}
              transition={{duration: 0.28, ease: [0.16, 1, 0.3, 1]}}
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                if (!onLogoLongPress) return;
                centerPressOriginRef.current = {x: e.clientX, y: e.clientY};
                centerPressTimerRef.current = window.setTimeout(() => {
                  centerPressTimerRef.current = null;
                  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    navigator.vibrate(18);
                  }
                  onLogoLongPress();
                }, 600);
              }}
              onPointerMove={(e) => {
                const origin = centerPressOriginRef.current;
                if (!origin) return;
                if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 10) {
                  clearCenterLongPress();
                }
              }}
              onPointerUp={clearCenterLongPress}
              onPointerLeave={clearCenterLongPress}
              onPointerCancel={clearCenterLongPress}
              className="pointer-events-auto select-none flex h-[132px] w-[132px] sm:h-[164px] sm:w-[164px] lg:h-[192px] lg:w-[192px] items-center justify-center rounded-full bg-[#16110F]/92 border border-[#C89B62]/25 shadow-[0_18px_45px_rgba(0,0,0,0.75)] backdrop-blur-md"
            >
              <CafeLogo compact />
            </motion.div>
          ) : (
            <motion.div
              key={`center-product-${selectedProduct.id}`}
              initial={{opacity: 0, scale: 0.84}}
              animate={{opacity: 1, scale: 1}}
              exit={{opacity: 0, scale: 0.88}}
              transition={{duration: 0.3, ease: [0.16, 1, 0.3, 1]}}
              className="relative flex h-[156px] w-[156px] sm:h-[198px] sm:w-[198px] lg:h-[234px] lg:w-[234px] items-center justify-center rounded-full shadow-[0_24px_56px_rgba(0,0,0,0.85)]"
            >
              {/* Bigger Product Plate in Center */}
              <div
                style={{
                  boxShadow: `0 0 0 2px ${selectedProduct.accentColor}66`,
                }}
                className="relative h-full w-full rounded-full overflow-hidden"
              >
                <ResilientPlateImage
                  src={selectedProduct.image}
                  alt={selectedProduct.productName}
                  imageScale={selectedProduct.imageScale}
                  swirl={selectedProduct.effects.includes('coffee-swirl')}
                  className="h-full w-full"
                  shadowClassName="shadow-none"
                />

                {/* Contrast scrim across lower third for crisp price & Order button */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0E0A08]/95 via-[#0E0A08]/35 to-transparent"
                />
              </div>

              {/* Lively effects on center showcase plate */}
              <DishEffectsOverlay effects={selectedProduct.effects} />

              {/* Price + Order Action inside center circle */}
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="pointer-events-auto relative z-30 absolute bottom-3 sm:bottom-4 inset-x-3 flex flex-col items-center text-center"
                style={{position: 'absolute'}}
              >
                <span className="font-sans-ui text-base sm:text-xl lg:text-2xl font-semibold text-[#F5EFE6] tabular-nums drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  {selectedProduct.price}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenOrder(selectedProduct)}
                  style={{backgroundColor: selectedProduct.accentColor}}
                  className="mt-1 sm:mt-1.5 inline-flex min-h-[34px] sm:min-h-[38px] items-center justify-center rounded-full px-5 sm:px-6 text-xs sm:text-sm font-semibold tracking-[0.03em] text-[#120E0C] shadow-[0_8px_20px_rgba(0,0,0,0.55)] transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5EFE6]"
                >
                  Order
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
