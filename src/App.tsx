import {useCallback, useEffect, useRef, useState} from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import {onAuthStateChanged, type User} from 'firebase/auth';
import {ChevronDown, Menu, ShoppingBag} from 'lucide-react';
import {BakeryBackground} from './components/BakeryBackground';
import {CircularDeliWheel} from './components/CircularDeliWheel';
import {DishEffectsOverlay} from './components/DishEffectsOverlay';
import {
  EditableTextLayerCanvas,
  type TextSelectionRange,
} from './components/EditableTextLayerCanvas';
import {FeaturedPlateShowcase} from './components/FeaturedPlateShowcase';
import {CartDrawer, MenuDrawer} from './components/HeaderDrawers';
import {ResilientPlateImage} from './components/ResilientPlateImage';
import {SteamingCoffeeCup} from './components/SteamingCoffeeCup';
import {
  type CloudSyncStatus,
  TextLayerEditorToolbar,
} from './components/TextLayerEditorToolbar';
import {DEFAULT_TEXT_LAYERS, DELI_CATEGORIES, HERO_ASSETS} from './data/menuData';
import {
  ADMIN_EMAIL,
  auth,
  isAuthorizedAdmin,
  saveTextLayersToCloud,
  signInEditorWithGoogle,
  signOutEditor,
  subscribeToTextLayers,
} from './firebase';
import {CartItem, DeliCategory, EditableTextLayer} from './types';

const STORAGE_KEY = 'maison-sorrel-text-layers-v1';

export default function App() {
  const prefersReducedMotion = useReducedMotion();

  const [selectedCategory, setSelectedCategory] = useState<DeliCategory | null>(null);
  const [orderModalProduct, setOrderModalProduct] = useState<DeliCategory | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [textLayers, setTextLayers] = useState<EditableTextLayer[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_TEXT_LAYERS;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage read issues
    }
    return DEFAULT_TEXT_LAYERS;
  });
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    DEFAULT_TEXT_LAYERS[0].id,
  );
  const [textSelection, setTextSelection] = useState<TextSelectionRange | null>(null);
  const [scrollStage, setScrollStage] = useState<'hero' | 'transition' | 'showcase'>('hero');
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [hasPendingCloudSave, setHasPendingCloudSave] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('idle');
  const [cloudErrorMessage, setCloudErrorMessage] = useState<string | null>(null);

  const textLayersRef = useRef(textLayers);
  textLayersRef.current = textLayers;
  const hasPendingCloudSaveRef = useRef(hasPendingCloudSave);
  hasPendingCloudSaveRef.current = hasPendingCloudSave;
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(textLayers));
    } catch {
      // Ignore storage quota issues
    }
  }, [textLayers]);

  const flushCloudSave = useCallback(async (layersToSave?: EditableTextLayer[]) => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const targetLayers = layersToSave ?? textLayersRef.current;
    if (!isAuthorizedAdmin(auth.currentUser)) {
      return;
    }
    setCloudSyncStatus('saving');
    setCloudErrorMessage(null);
    try {
      await saveTextLayersToCloud(targetLayers);
      hasPendingCloudSaveRef.current = false;
      setHasPendingCloudSave(false);
      setCloudSyncStatus('saved');
    } catch (error) {
      setCloudSyncStatus('error');
      setCloudErrorMessage(
        error instanceof Error
          ? error.message.includes('permission') || error.message.includes('insufficient')
            ? `Permission denied. Sign in as ${ADMIN_EMAIL} to save permanently.`
            : 'Could not save to cloud. Please try again.'
          : 'Could not save to cloud.',
      );
    }
  }, []);

  const scheduleCloudSave = useCallback(
    (nextLayers: EditableTextLayer[]) => {
      hasPendingCloudSaveRef.current = true;
      setHasPendingCloudSave(true);
      setCloudErrorMessage(null);
      if (!isAuthorizedAdmin(auth.currentUser)) {
        return;
      }
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        void flushCloudSave(nextLayers);
      }, 450);
    },
    [flushCloudSave],
  );

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (user && !isAuthorizedAdmin(user)) {
        setCloudErrorMessage(
          `Signed in as ${user.email ?? 'guest'}. Only ${ADMIN_EMAIL} can publish permanent changes.`,
        );
      } else {
        setCloudErrorMessage(null);
      }
      if (user && isAuthorizedAdmin(user) && hasPendingCloudSaveRef.current) {
        void flushCloudSave(textLayersRef.current);
      }
    });

    const unsubLayers = subscribeToTextLayers(
      (cloudLayers) => {
        if (cloudLayers && !hasPendingCloudSaveRef.current) {
          setTextLayers(cloudLayers);
          setSelectedLayerId((prev) =>
            prev && cloudLayers.some((l) => l.id === prev)
              ? prev
              : (cloudLayers[0]?.id ?? null),
          );
          setCloudSyncStatus('saved');
        }
      },
      (err) => {
        console.warn('Text layer cloud sync warning:', err.message);
      },
    );

    return () => {
      unsubAuth();
      unsubLayers();
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [flushCloudSave]);

  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const isSnappingRef = useRef(false);
  const snapRafRef = useRef<number | null>(null);

  const {scrollYProgress} = useScroll({
    target: scrollTrackRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: prefersReducedMotion ? 1000 : 480,
    damping: prefersReducedMotion ? 100 : 36,
    mass: 0.15,
  });

  useMotionValueEvent(smoothProgress, 'change', (latest) => {
    if (latest < 0.22) {
      setScrollStage('hero');
      setOrderModalProduct(null);
    } else if (latest < 0.72) {
      setScrollStage('transition');
      setOrderModalProduct(null);
    } else {
      setScrollStage('showcase');
    }
  });

  const fastSnapTo = useCallback(
    (targetY: number) => {
      if (snapRafRef.current !== null) {
        cancelAnimationFrame(snapRafRef.current);
        snapRafRef.current = null;
      }

      if (prefersReducedMotion) {
        window.scrollTo({top: targetY, behavior: 'auto'});
        return;
      }

      const startY = window.scrollY;
      const distance = targetY - startY;
      if (Math.abs(distance) < 2) {
        window.scrollTo(0, targetY);
        return;
      }

      isSnappingRef.current = true;
      const htmlEl = document.documentElement;
      const prevSnapType = htmlEl.style.scrollSnapType;
      htmlEl.style.scrollSnapType = 'none';

      const duration = 185;
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - elapsed, 3.5);
        window.scrollTo(0, startY + distance * eased);

        if (elapsed < 1) {
          snapRafRef.current = requestAnimationFrame(step);
        } else {
          window.scrollTo(0, targetY);
          htmlEl.style.scrollSnapType = prevSnapType;
          snapRafRef.current = null;
          window.setTimeout(() => {
            isSnappingRef.current = false;
          }, 50);
        }
      };

      snapRafRef.current = requestAnimationFrame(step);
    },
    [prefersReducedMotion],
  );

  useEffect(() => {
    return () => {
      if (snapRafRef.current !== null) {
        cancelAnimationFrame(snapRafRef.current);
      }
    };
  }, []);

  // Snap cleanly & rapidly between Hero (0) and Circular Wheel (100dvh) on thumb flick or wheel
  useEffect(() => {
    let touchStartY = 0;
    let touchStartTime = 0;
    let startedOnInteractive = false;
    let flickTriggered = false;

    const isBlockedOverlay = () =>
      Boolean(orderModalProduct || cartOpen || menuOpen || isEditMode);

    const onWheel = (e: WheelEvent) => {
      if (isBlockedOverlay()) return;
      if (Math.abs(e.deltaY) < 6) return;
      const vh = window.innerHeight;
      if (e.deltaY > 0 && window.scrollY < vh * 0.72) {
        e.preventDefault();
        if (!isSnappingRef.current) fastSnapTo(vh);
      } else if (e.deltaY < 0 && window.scrollY > vh * 0.28) {
        e.preventDefault();
        if (!isSnappingRef.current) fastSnapTo(0);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? 0;
      touchStartTime = performance.now();
      flickTriggered = false;
      const target = e.target as HTMLElement | null;
      startedOnInteractive = Boolean(
        target?.closest('[role="region"][aria-label="Rotatable deli category wheel"]') ||
          target?.closest('[role="dialog"]'),
      );
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isBlockedOverlay() || startedOnInteractive || flickTriggered) return;
      const currentY = e.touches[0]?.clientY ?? touchStartY;
      const dy = touchStartY - currentY;
      const vh = window.innerHeight;

      if (dy > 20 && window.scrollY < vh * 0.85) {
        e.preventDefault();
        flickTriggered = true;
        fastSnapTo(vh);
      } else if (dy < -20 && window.scrollY > vh * 0.15) {
        e.preventDefault();
        flickTriggered = true;
        fastSnapTo(0);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (isBlockedOverlay() || startedOnInteractive || flickTriggered) return;
      const endY = e.changedTouches[0]?.clientY ?? touchStartY;
      const dy = touchStartY - endY;
      const dt = Math.max(16, performance.now() - touchStartTime);
      const velocity = Math.abs(dy) / dt;
      const vh = window.innerHeight;

      if ((dy > 12 || (dy > 6 && velocity > 0.22)) && window.scrollY < vh * 0.85) {
        fastSnapTo(vh);
      } else if ((dy < -12 || (dy < -6 && velocity > 0.22)) && window.scrollY > vh * 0.15) {
        fastSnapTo(0);
      }
    };

    window.addEventListener('wheel', onWheel, {passive: false});
    window.addEventListener('touchstart', onTouchStart, {passive: true});
    window.addEventListener('touchmove', onTouchMove, {passive: false});
    window.addEventListener('touchend', onTouchEnd, {passive: true});
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [orderModalProduct, cartOpen, menuOpen, isEditMode, fastSnapTo]);

  // Hero Cup & Plate parting choreography
  const cupX = useTransform(smoothProgress, [0, 0.78], ['0vw', '-46vw']);
  const cupY = useTransform(smoothProgress, [0, 0.78], ['0vh', '-32vh']);
  const cupScale = useTransform(smoothProgress, [0, 0.78], [1, 0.72]);
  const cupRotate = useTransform(smoothProgress, [0, 0.78], [0, -16]);
  const cupOpacity = useTransform(smoothProgress, [0, 0.35, 0.74], [1, 0.85, 0]);

  const plateX = useTransform(smoothProgress, [0, 0.78], ['0vw', '46vw']);
  const plateY = useTransform(smoothProgress, [0, 0.78], ['0vh', '28vh']);
  const plateScale = useTransform(smoothProgress, [0, 0.78], [1, 0.72]);
  const plateRotate = useTransform(smoothProgress, [0, 0.78], [0, 18]);
  const plateOpacity = useTransform(smoothProgress, [0, 0.35, 0.74], [1, 0.85, 0]);

  // Center Logo & Circular Menu reveal
  const wheelScale = useTransform(smoothProgress, [0.25, 0.92], [0.76, 1]);
  const wheelOpacity = useTransform(smoothProgress, [0.22, 0.86], [0, 1]);

  // Scroll hint fades right as scroll begins
  const scrollHintOpacity = useTransform(smoothProgress, [0, 0.2], [1, 0]);

  const handleUpdateLayer = (id: string, patch: Partial<EditableTextLayer>) => {
    setTextLayers((prev) => {
      const next = prev.map((l) => (l.id === id ? {...l, ...patch} : l));
      scheduleCloudSave(next);
      return next;
    });
  };

  const handleAddLayer = () => {
    const count = textLayers.length + 1;
    const newLayer: EditableTextLayer = {
      id: `custom-layer-${Date.now()}`,
      label: `Text ${count}`,
      text: 'Artisanal\nmorning bake',
      x: 50,
      y: 26,
      fontSize: 44,
      isBold: true,
      lineHeight: 1.05,
      letterSpacing: 0,
      align: 'center',
      depth: 'front',
      visibility: 'always',
      fontStyle: 'display',
      color: '#F5EFE6',
      maxWidth: 420,
    };
    setTextLayers((prev) => {
      const next = [...prev, newLayer];
      scheduleCloudSave(next);
      return next;
    });
    setSelectedLayerId(newLayer.id);
  };

  const handleAddToCart = (product: DeliCategory, quantity: number) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? {...i, quantity: i.quantity + quantity} : i,
        );
      }
      return [...prev, {product, quantity}];
    });
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((i) =>
          i.product.id === productId ? {...i, quantity: i.quantity + delta} : i,
        )
        .filter((i) => i.quantity > 0),
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const totalCartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const handleDeleteLayer = (id: string) => {
    setTextLayers((prev) => {
      const next = prev.filter((l) => l.id !== id);
      if (selectedLayerId === id) {
        setSelectedLayerId(next[0]?.id ?? null);
      }
      if (next.length > 0) {
        scheduleCloudSave(next);
      }
      return next;
    });
  };

  const handleResetLayers = () => {
    setTextLayers(DEFAULT_TEXT_LAYERS);
    setSelectedLayerId(DEFAULT_TEXT_LAYERS[0].id);
    scheduleCloudSave(DEFAULT_TEXT_LAYERS);
  };

  const handleSignInAndSave = async () => {
    setCloudErrorMessage(null);
    try {
      const user = await signInEditorWithGoogle();
      if (!isAuthorizedAdmin(user)) {
        setCloudErrorMessage(
          `Signed in as ${user.email ?? 'guest'}. Only ${ADMIN_EMAIL} can publish permanent changes.`,
        );
        return;
      }
      await flushCloudSave(textLayersRef.current);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('unauthorized-domain')) {
        setCloudErrorMessage(
          `Authorize "${window.location.hostname}" in Firebase Console → Authentication → Settings → Authorized domains.`,
        );
      } else if (!msg.includes('popup-closed-by-user')) {
        setCloudErrorMessage('Google sign-in could not complete. Please allow popups and try again.');
      }
    }
  };

  const handleSignOutEditor = async () => {
    await signOutEditor();
    setCloudSyncStatus('idle');
    setCloudErrorMessage(null);
  };

  const handleCloseEditor = () => {
    if (isAuthorizedAdmin(authUser) && hasPendingCloudSaveRef.current) {
      void flushCloudSave(textLayersRef.current);
    }
    setIsEditMode(false);
  };

  const [isLogoPressing, setIsLogoPressing] = useState(false);
  const logoLongPressTimerRef = useRef<number | null>(null);
  const logoLongPressOriginRef = useRef<{x: number; y: number} | null>(null);
  const logoLongPressFiredRef = useRef(false);

  const clearLogoLongPress = useCallback(() => {
    if (logoLongPressTimerRef.current !== null) {
      window.clearTimeout(logoLongPressTimerRef.current);
      logoLongPressTimerRef.current = null;
    }
    logoLongPressOriginRef.current = null;
    setIsLogoPressing(false);
  }, []);

  useEffect(() => {
    return () => clearLogoLongPress();
  }, [clearLogoLongPress]);

  const toggleEditModeFromLogo = useCallback(() => {
    setIsEditMode((prev) => {
      if (prev) {
        if (isAuthorizedAdmin(auth.currentUser) && hasPendingCloudSaveRef.current) {
          void flushCloudSave(textLayersRef.current);
        }
        return false;
      }
      return true;
    });
  }, [flushCloudSave]);

  const scrollToShowcase = () => {
    const track = scrollTrackRef.current;
    if (!track) return;
    const targetTop = track.offsetTop + track.offsetHeight - window.innerHeight;
    fastSnapTo(targetTop);
  };

  const scrollToHero = () => {
    fastSnapTo(0);
  };

  return (
    <div className="relative min-h-screen bg-[#120E0C] text-[#F5EFE6]">
      {/* Fixed Stationary Bakery Background with People Moving (never moves on scroll) */}
      <BakeryBackground />

      {/* Fixed Top Bar: Top-Left Logo (long-press to edit text) · Desktop Nav · Top-Right Cart & Hamburger Menu */}
      <header className="fixed top-0 left-0 right-0 z-40 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-8 px-4 sm:px-10 bg-gradient-to-b from-[#120E0C]/92 via-[#120E0C]/60 to-transparent backdrop-blur-[2px]">
        {/* Top-Left Logo Lockup (Tap: Hero · Long Press: Text Editor) */}
        <button
          type="button"
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            clearLogoLongPress();
            logoLongPressFiredRef.current = false;
            logoLongPressOriginRef.current = {x: e.clientX, y: e.clientY};
            setIsLogoPressing(true);
            logoLongPressTimerRef.current = window.setTimeout(() => {
              logoLongPressTimerRef.current = null;
              logoLongPressFiredRef.current = true;
              setIsLogoPressing(false);
              if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(18);
              }
              toggleEditModeFromLogo();
            }, 600);
          }}
          onPointerMove={(e) => {
            const origin = logoLongPressOriginRef.current;
            if (!origin) return;
            if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 10) {
              clearLogoLongPress();
            }
          }}
          onPointerUp={clearLogoLongPress}
          onPointerLeave={clearLogoLongPress}
          onPointerCancel={clearLogoLongPress}
          onClick={() => {
            if (logoLongPressFiredRef.current) {
              logoLongPressFiredRef.current = false;
              return;
            }
            scrollToHero();
          }}
          className={`select-none inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 text-[#F5EFE6] hover:text-[#E7C28D] transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C89B62] rounded px-1.5 py-1 ${
            isLogoPressing
              ? 'scale-95 text-[#E7C28D] ring-1 ring-[#C89B62]/60 bg-[#C89B62]/10'
              : ''
          }`}
        >
          <svg
            viewBox="0 0 40 28"
            className="h-5 w-7 shrink-0"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 17 C6 7, 34 7, 34 17"
              stroke="#C89B62"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M12 21 C15 25, 25 25, 28 21"
              stroke="#C89B62"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <circle cx="20" cy="6.5" r="2" fill="#C89B62" />
          </svg>
          <span className="font-display text-lg sm:text-xl font-medium tracking-[0.04em]">
            Maison Sorrel
          </span>
        </button>

        {/* Center Single-Line Nav Links (Desktop) */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-xs sm:text-[13px] font-medium tracking-[0.04em] text-[#D5C9BA]"
        >
          <button
            type="button"
            onClick={scrollToHero}
            className="hover:text-[#F5EFE6] transition-colors whitespace-nowrap shrink-0"
          >
            The Table
          </button>
          <button
            type="button"
            onClick={scrollToShowcase}
            className="hover:text-[#F5EFE6] transition-colors whitespace-nowrap shrink-0"
          >
            Deli Wheel
          </button>
        </nav>

        {/* Top-Right Controls: Cart (left of menu) · Hamburger Menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">

          {/* Cart Icon on the left of Hamburger Menu */}
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Open cart (${totalCartCount} items)`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#F5EFE6] hover:bg-[#F5EFE6]/10 hover:text-[#E7C28D] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C89B62]"
          >
            <ShoppingBag className="h-5 w-5" strokeWidth={1.65} />
            {totalCartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#C89B62] px-1 text-[10px] font-bold text-[#120E0C] tabular-nums">
                {totalCartCount}
              </span>
            )}
          </button>

          {/* Hamburger Menu Icon on top right */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#F5EFE6] hover:bg-[#F5EFE6]/10 hover:text-[#E7C28D] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C89B62]"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* Scroll-Driven Coffee Table Stage (2-Stop Flick Snap: Hero -> Circular Wheel) */}
      <section
        ref={scrollTrackRef}
        aria-label="Interactive cafe table showcase"
        className="relative z-10 h-[200dvh] w-full"
      >
        {/* Two mandatory snap stops for thumb-flick transition */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 right-0 h-[100dvh] snap-start snap-always"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-[100dvh] left-0 right-0 h-[100dvh] snap-start snap-always"
        />

        <div
          ref={stageRef}
          className="sticky top-0 h-[100dvh] w-full overflow-hidden bg-transparent"
        >

          {/* Z-10: Editable Text Layers Placed BEHIND Images */}
          <EditableTextLayerCanvas
            layers={textLayers}
            planeDepth="behind"
            isEditMode={isEditMode}
            selectedLayerId={selectedLayerId}
            scrollStage={scrollStage}
            stageRef={stageRef}
            onSelectLayer={(id) => {
              setSelectedLayerId(id);
              setTextSelection(null);
            }}
            onUpdateLayer={handleUpdateLayer}
            onTextSelectionChange={setTextSelection}
          />

          {/* Z-20: Foreground Product Imagery (Cup, Croissant Plate, Center Logo, Circular Wheel, Featured Plate) */}
          <div className="relative z-20 h-full w-full pointer-events-none">
            {/* Hero Steaming Black Coffee Cup */}
            <motion.div
              style={{
                x: cupX,
                y: cupY,
                scale: cupScale,
                rotate: cupRotate,
                opacity: cupOpacity,
              }}
              className="absolute left-[4%] sm:left-[14%] lg:left-[21%] top-[24%] sm:top-[28%] lg:top-[28%] h-[195px] w-[195px] sm:h-[240px] sm:w-[240px] lg:h-[295px] lg:w-[295px] will-change-transform"
            >
              <SteamingCoffeeCup className="h-full w-full" />
            </motion.div>

            {/* Hero Plate with Rich Chocolate-Dripping Croissant */}
            <motion.div
              style={{
                x: plateX,
                y: plateY,
                scale: plateScale,
                rotate: plateRotate,
                opacity: plateOpacity,
              }}
              className="absolute right-[3%] sm:right-[12%] lg:right-[18%] top-[44%] sm:top-[36%] lg:top-[29%] h-[238px] w-[238px] sm:h-[305px] sm:w-[305px] lg:h-[385px] lg:w-[385px] will-change-transform"
            >
              <ResilientPlateImage
                src={HERO_ASSETS.chocolateCroissant}
                alt="Flaky butter croissant drizzled with warm dark chocolate on stoneware plate"
                imageScale={1.62}
                className="h-full w-full"
                shadowClassName="shadow-[0_36px_80px_rgba(0,0,0,0.86),0_12px_28px_rgba(0,0,0,0.6)]"
              />
              <DishEffectsOverlay effects={['steam']} />
            </motion.div>

            {/* Circular Rotatable Deli Menu + Center Stage (Dead-Center on All Viewports) */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                style={{
                  scale: wheelScale,
                  opacity: wheelOpacity,
                }}
                className={`relative flex items-center justify-center will-change-transform ${
                  scrollStage === 'hero' ? 'pointer-events-none' : 'pointer-events-auto'
                }`}
              >
                <CircularDeliWheel
                  categories={DELI_CATEGORIES}
                  selectedProduct={selectedCategory}
                  isBlurred={Boolean(orderModalProduct)}
                  onSelectCategory={(cat) => setSelectedCategory(cat)}
                  onOpenOrder={(cat) => setOrderModalProduct(cat)}
                  onLogoLongPress={toggleEditModeFromLogo}
                />
              </motion.div>
            </div>

            {/* Centered Highlighted Pill Hero CTA */}
            <div className="pointer-events-none absolute inset-x-0 bottom-6 sm:bottom-8 flex justify-center px-4">
              <motion.button
                type="button"
                onClick={scrollToShowcase}
                style={{opacity: scrollHintOpacity}}
                aria-label="Scroll down to reveal deli menu"
                className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#C89B62] to-[#E2BA82] px-6 py-2.5 sm:px-7 sm:py-3 text-xs sm:text-[13px] font-semibold tracking-[0.1em] uppercase text-[#120E0C] ring-1 ring-[#F5EFE6]/35 shadow-[0_12px_30px_rgba(0,0,0,0.65),0_0_24px_rgba(200,155,98,0.38)] transition-transform duration-150 hover:scale-[1.04] hover:brightness-105 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5EFE6] ${
                  scrollStage === 'hero' ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
              >
                <span>Explore Menu</span>
                <ChevronDown className="h-4 w-4 animate-bounce" strokeWidth={2.2} />
              </motion.button>
            </div>
          </div>

          {/* Z-30: Editable Text Layers Placed IN FRONT OF Images */}
          <EditableTextLayerCanvas
            layers={textLayers}
            planeDepth="front"
            isEditMode={isEditMode}
            selectedLayerId={selectedLayerId}
            scrollStage={scrollStage}
            stageRef={stageRef}
            onSelectLayer={(id) => {
              setSelectedLayerId(id);
              setTextSelection(null);
            }}
            onUpdateLayer={handleUpdateLayer}
            onTextSelectionChange={setTextSelection}
          />
        </div>
      </section>

      {/* Frosted Glass Order Zoom View (blurs circle behind and tints glass to match product) */}
      <AnimatePresence>
        {orderModalProduct && (
          <FeaturedPlateShowcase
            product={orderModalProduct}
            onAddToCart={handleAddToCart}
            onOpenCart={() => setCartOpen(true)}
            onClose={() => setOrderModalProduct(null)}
          />
        )}
      </AnimatePresence>

      {/* Slide-Over Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        items={cartItems}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onExploreMenu={scrollToShowcase}
      />

      {/* Slide-Over Hamburger Navigation Drawer */}
      <MenuDrawer
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigateHero={scrollToHero}
        onNavigateWheel={scrollToShowcase}
      />

      {/* Floating Text Layer Editor Toolbar (active only when Edit Text mode is enabled) */}
      {isEditMode && (
        <TextLayerEditorToolbar
          layers={textLayers}
          selectedLayerId={selectedLayerId}
          textSelection={textSelection}
          isAuthorizedEditor={isAuthorizedAdmin(authUser)}
          signedInEmail={authUser?.email ?? null}
          hasPendingCloudSave={hasPendingCloudSave}
          cloudSyncStatus={cloudSyncStatus}
          cloudErrorMessage={cloudErrorMessage}
          onSelectLayer={(id) => {
            setSelectedLayerId(id);
            setTextSelection(null);
          }}
          onTextSelectionChange={setTextSelection}
          onUpdateLayer={handleUpdateLayer}
          onAddLayer={handleAddLayer}
          onDeleteLayer={handleDeleteLayer}
          onResetLayers={handleResetLayers}
          onSignInAndSave={() => void handleSignInAndSave()}
          onSaveNow={() => void flushCloudSave()}
          onSignOut={() => void handleSignOutEditor()}
          onClose={() => {
            setTextSelection(null);
            handleCloseEditor();
          }}
        />
      )}
    </div>
  );
}
