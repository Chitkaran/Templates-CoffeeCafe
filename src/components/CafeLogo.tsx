interface CafeLogoProps {
  compact?: boolean;
  className?: string;
}

export function CafeLogo({compact = false, className = ''}: CafeLogoProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center select-none ${className}`}
    >
      {/* Bespoke minimal crest */}
      <svg
        viewBox="0 0 64 42"
        className={compact ? 'h-6 w-10 mb-1.5' : 'h-8 w-12 mb-2'}
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 24 C12 12, 52 12, 52 24"
          stroke="#C89B62"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M20 29 C24 35, 40 35, 44 29"
          stroke="#C89B62"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <circle cx="32" cy="10" r="2.2" fill="#C89B62" />
        <path
          d="M32 16 L32 27"
          stroke="#F5EFE6"
          strokeOpacity="0.65"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>

      <span
        className={`font-display tracking-[0.04em] text-[#F5EFE6] leading-none ${
          compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl lg:text-[2.15rem]'
        }`}
      >
        Maison Sorrel
      </span>

      <span className="mt-1.5 text-[10px] sm:text-[11px] tracking-[0.22em] text-[#C89B62]/90 uppercase font-sans-ui">
        Café · Artisanal Deli
      </span>
    </div>
  );
}
