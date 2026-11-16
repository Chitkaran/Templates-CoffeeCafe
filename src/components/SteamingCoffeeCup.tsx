import {HERO_ASSETS} from '../data/menuData';
import {ResilientPlateImage} from './ResilientPlateImage';

interface SteamingCoffeeCupProps {
  className?: string;
}

export function SteamingCoffeeCup({className = ''}: SteamingCoffeeCupProps) {
  return (
    <div className={`relative select-none ${className}`}>
      {/* Organic rising steam wisps above the espresso crema */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[18%] z-20 -translate-x-1/2 -translate-y-1/2 w-28 h-36"
      >
        <svg
          viewBox="0 0 120 150"
          className="h-full w-full overflow-visible"
          fill="none"
        >
          <defs>
            <filter id="steam-blur" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4.5" />
            </filter>
            <linearGradient id="steam-grad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#F5EFE6" stopOpacity="0.45" />
              <stop offset="55%" stopColor="#E6D8C5" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#F5EFE6" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path
            d="M52 135 C42 110, 68 90, 50 62 C36 40, 64 20, 48 2"
            stroke="url(#steam-grad)"
            strokeWidth="10"
            strokeLinecap="round"
            filter="url(#steam-blur)"
            className="animate-steam-a"
          />
          <path
            d="M66 138 C78 112, 48 86, 68 58 C82 38, 56 18, 70 0"
            stroke="url(#steam-grad)"
            strokeWidth="8"
            strokeLinecap="round"
            filter="url(#steam-blur)"
            className="animate-steam-b"
          />
          <path
            d="M58 132 C48 100, 74 78, 56 48 C46 32, 66 15, 58 -4"
            stroke="url(#steam-grad)"
            strokeWidth="7"
            strokeLinecap="round"
            filter="url(#steam-blur)"
            className="animate-steam-c"
          />
        </svg>
      </div>

      {/* Cup & saucer photographic cutout */}
      <ResilientPlateImage
        src={HERO_ASSETS.coffeeCup}
        alt="Steaming black single-origin espresso in a dark ceramic cup"
        imageScale={1.66}
        swirl
        className="h-full w-full"
        shadowClassName="shadow-[0_32px_70px_rgba(0,0,0,0.82),0_10px_25px_rgba(0,0,0,0.6)]"
      />
    </div>
  );
}
