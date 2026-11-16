import {HERO_ASSETS} from '../data/menuData';

export function BakeryBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#120E0C]"
    >
      {/* Stationary Full-Bleed Photorealistic Bakery Interior */}
      <img
        src={HERO_ASSETS.bakeryBackdrop}
        alt=""
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover object-center scale-[1.03] brightness-[0.88] saturate-[1.1]"
      />

      {/* Ambient Drifting Sunbeam Shafts Behind the Frosted Glass */}
      <div
        style={{
          background:
            'linear-gradient(118deg, rgba(247,208,144,0.22) 0%, rgba(227,164,89,0.08) 42%, transparent 70%)',
        }}
        className="animate-bakery-sunbeam absolute inset-0 mix-blend-screen will-change-transform"
      />

      {/* Frosted Glass Pane Over the Bakery Scene */}
      <div
        style={{
          background:
            'linear-gradient(135deg, rgba(245,239,230,0.11) 0%, rgba(30,22,18,0.28) 48%, rgba(16,11,9,0.42) 100%)',
        }}
        className="absolute inset-0 backdrop-blur-[7px] backdrop-saturate-125"
      />

      {/* Subtle Glass Satin Specular Sheen & Warm Espresso Edge Vignette */}
      <div
        style={{
          background:
            'radial-gradient(circle at 22% 18%, rgba(255,244,226,0.12) 0%, transparent 48%), radial-gradient(ellipse at center, rgba(16,11,9,0.08) 0%, rgba(14,10,8,0.34) 72%, rgba(12,9,7,0.60) 100%)',
        }}
        className="absolute inset-0"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#120E0C]/42 via-transparent to-[#120E0C]/48" />
    </div>
  );
}
