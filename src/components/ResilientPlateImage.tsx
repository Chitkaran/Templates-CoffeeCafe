import {useState} from 'react';
import {motion, useReducedMotion} from 'motion/react';
import {Coffee} from 'lucide-react';

interface ResilientPlateImageProps {
  src: string;
  alt: string;
  imageScale?: number;
  className?: string;
  shadowClassName?: string;
  roundedClassName?: string;
  swirl?: boolean;
  spinPlate?: boolean;
  pushIn?: boolean;
}

export function ResilientPlateImage({
  src,
  alt,
  imageScale = 1.26,
  className = '',
  shadowClassName = 'shadow-[0_28px_60px_rgba(0,0,0,0.72),0_8px_20px_rgba(0,0,0,0.5)]',
  roundedClassName = 'rounded-full',
  swirl = false,
  spinPlate = false,
  pushIn = false,
}: ResilientPlateImageProps) {
  const [hasError, setHasError] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className={`relative ${roundedClassName} overflow-hidden bg-[#1D1714] ${shadowClassName} ${className}`}
    >
      {!hasError ? (
        <motion.div
          initial={pushIn && !prefersReducedMotion ? {scale: 1} : false}
          animate={pushIn && !prefersReducedMotion ? {scale: 1.1} : {scale: 1}}
          transition={{duration: 5.5, ease: [0.22, 1, 0.36, 1]}}
          style={{transformOrigin: '50% 50%'}}
          className="h-full w-full will-change-transform"
        >
          <div
            className={`relative h-full w-full will-change-transform ${
              spinPlate ? 'animate-plate-turntable' : ''
            }`}
          >
            {/* Base stationary dish/cup/saucer */}
            <img
              src={src}
              alt={alt}
              referrerPolicy="no-referrer"
              draggable={false}
              onError={() => setHasError(true)}
              style={{transform: `scale(${imageScale})`}}
              className="h-full w-full object-cover object-center select-none transition-transform duration-500 ease-out"
            />

            {/* Inner-cup liquid swirl only (cup rim, handle, and saucer remain stationary) */}
            {swirl && (
              <div
                aria-hidden="true"
                style={{
                  WebkitMaskImage:
                    'radial-gradient(circle at 49.2% 48.3%, #000 17%, transparent 24.5%)',
                  maskImage:
                    'radial-gradient(circle at 49.2% 48.3%, #000 17%, transparent 24.5%)',
                }}
                className="pointer-events-none absolute inset-0 overflow-hidden"
              >
                <div
                  style={{transformOrigin: '49.2% 48.3%'}}
                  className="h-full w-full animate-coffee-swirl will-change-transform"
                >
                  <img
                    src={src}
                    alt=""
                    referrerPolicy="no-referrer"
                    draggable={false}
                    style={{transform: `scale(${imageScale})`}}
                    className="h-full w-full object-cover object-center select-none"
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#2A201B] via-[#1C1512] to-[#120E0C] p-4 text-center">
          <Coffee className="h-7 w-7 text-[#C89B62]/80 mb-2" strokeWidth={1.25} />
          <span className="font-display text-sm text-[#F5EFE6]/90 line-clamp-2">{alt}</span>
        </div>
      )}
      {/* Subtle porcelain/frame edge rim */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 ${roundedClassName} ring-1 ring-inset ring-[#F5EFE6]/12 shadow-[inset_0_0_24px_rgba(0,0,0,0.35)]`}
      />
    </div>
  );
}
