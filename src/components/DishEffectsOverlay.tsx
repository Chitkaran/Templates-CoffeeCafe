import {DishEffect} from '../types';

interface DishEffectsOverlayProps {
  effects?: DishEffect[];
  compact?: boolean;
}

export function DishEffectsOverlay({
  effects = [],
  compact = false,
}: DishEffectsOverlayProps) {
  const hasSteam = effects.includes('steam');

  if (!hasSteam) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-visible">
      {/* Warm Rising Steam Wisps */}
      <div
        aria-hidden="true"
        className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 ${
          compact ? 'top-[12%] w-16 h-20' : 'top-[14%] w-28 h-36'
        }`}
      >
        <svg
          viewBox="0 0 120 150"
          className="h-full w-full overflow-visible"
          fill="none"
        >
          <defs>
            <filter
              id={compact ? 'steam-blur-sm' : 'steam-blur-lg'}
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
            >
              <feGaussianBlur stdDeviation={compact ? '5' : '4.5'} />
            </filter>
            <linearGradient
              id={compact ? 'steam-grad-sm' : 'steam-grad-lg'}
              x1="0"
              y1="1"
              x2="0"
              y2="0"
            >
              <stop offset="0%" stopColor="#F5EFE6" stopOpacity="0.52" />
              <stop offset="55%" stopColor="#E6D8C5" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#F5EFE6" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path
            d="M52 135 C42 110, 68 90, 50 62 C36 40, 64 20, 48 2"
            stroke={`url(#${compact ? 'steam-grad-sm' : 'steam-grad-lg'})`}
            strokeWidth={compact ? '12' : '10'}
            strokeLinecap="round"
            filter={`url(#${compact ? 'steam-blur-sm' : 'steam-blur-lg'})`}
            className="animate-steam-a"
          />
          <path
            d="M68 138 C78 112, 48 86, 68 58 C82 38, 56 18, 70 0"
            stroke={`url(#${compact ? 'steam-grad-sm' : 'steam-grad-lg'})`}
            strokeWidth={compact ? '10' : '8'}
            strokeLinecap="round"
            filter={`url(#${compact ? 'steam-blur-sm' : 'steam-blur-lg'})`}
            className="animate-steam-b"
          />
          <path
            d="M58 132 C48 100, 74 78, 56 48 C46 32, 66 15, 58 -4"
            stroke={`url(#${compact ? 'steam-grad-sm' : 'steam-grad-lg'})`}
            strokeWidth={compact ? '8' : '7'}
            strokeLinecap="round"
            filter={`url(#${compact ? 'steam-blur-sm' : 'steam-blur-lg'})`}
            className="animate-steam-c"
          />
        </svg>
      </div>
    </div>
  );
}
