import {useEffect, useState} from 'react';
import {motion} from 'motion/react';
import {Check, Minus, Plus, X} from 'lucide-react';
import {DeliCategory} from '../types';
import {DishEffectsOverlay} from './DishEffectsOverlay';
import {ResilientPlateImage} from './ResilientPlateImage';

interface FeaturedPlateShowcaseProps {
  product: DeliCategory;
  onAddToCart: (product: DeliCategory, quantity: number) => void;
  onOpenCart: () => void;
  onClose: () => void;
}

export function FeaturedPlateShowcase({
  product,
  onAddToCart,
  onOpenCart,
  onClose,
}: FeaturedPlateShowcaseProps) {
  const [quantity, setQuantity] = useState(1);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  useEffect(() => {
    setQuantity(1);
    setOrderConfirmed(false);
  }, [product.id]);

  const totalPrice = (product.numericPrice * quantity).toFixed(2);
  // Rectangular edge-hugging frame needs gentler zoom so the full plate & product look lush
  const modalImageScale = Math.max(1.12, Number((product.imageScale * 0.74).toFixed(2)));

  const handleOrderNow = () => {
    onAddToCart(product, quantity);
    setOrderConfirmed(true);
  };

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.24, ease: [0.16, 1, 0.3, 1]}}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0C0907]/36 px-3 py-4 sm:px-6"
    >
      {/* Frosted Glass Card tinted to match the selected product — minimal top/left/right padding around image */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={product.productName}
        initial={{opacity: 0, scale: 0.78, y: 18}}
        animate={{opacity: 1, scale: 1, y: 0}}
        exit={{opacity: 0, scale: 0.84, y: 12}}
        transition={{duration: 0.34, ease: [0.16, 1, 0.3, 1]}}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: product.tintBg,
          borderColor: product.tintBorder,
          boxShadow: `0 32px 80px rgba(0,0,0,0.68), 0 0 90px ${product.accentColor}24, inset 0 1px 0 rgba(255,255,255,0.14)`,
        }}
        className="relative w-full max-w-[460px] sm:max-w-[500px] overflow-hidden rounded-3xl border px-2.5 pt-2.5 pb-6 sm:px-3 sm:pt-3 sm:pb-7 text-center backdrop-blur-xl backdrop-saturate-125"
      >
        {/* Subtle item-colored ambient glow inside the frosted glass */}
        <div
          aria-hidden="true"
          style={{
            background: `radial-gradient(circle at 50% 24%, ${product.accentColor}2E 0%, transparent 66%)`,
          }}
          className="pointer-events-none absolute inset-0"
        />

        {/* Colored 'X' Close Button floating cleanly in upper-right corner */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close product view"
          style={{backgroundColor: product.accentColor}}
          className="absolute right-5 top-5 sm:right-6 sm:top-6 z-30 flex h-10 w-10 items-center justify-center rounded-full text-[#120E0C] shadow-[0_8px_22px_rgba(0,0,0,0.55)] transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5EFE6]"
        >
          <X className="h-5 w-5" strokeWidth={2.2} />
        </button>

        {/* Large Edge-Hugging Product Image with Slightly Rounded Corners */}
        <motion.div
          initial={{scale: 0.86, opacity: 0}}
          animate={{scale: 1, opacity: 1}}
          transition={{duration: 0.36, ease: [0.16, 1, 0.3, 1]}}
          className="relative w-full aspect-[5/4]"
        >
          <ResilientPlateImage
            key={product.id}
            src={product.image}
            alt={product.productName}
            imageScale={modalImageScale}
            roundedClassName="rounded-2xl"
            swirl={product.effects.includes('coffee-swirl')}
            pushIn
            className="h-full w-full"
            shadowClassName="shadow-[0_18px_42px_rgba(0,0,0,0.55)]"
          />
          <DishEffectsOverlay effects={product.effects} />
        </motion.div>

        {/* Product Details */}
        <div className="relative z-10 mt-4 sm:mt-5 px-3 sm:px-5">
          <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs tracking-[0.16em] uppercase font-sans-ui text-[#F5EFE6]/75">
            <span style={{color: product.accentColor}}>{product.category}</span>
            <span aria-hidden="true">·</span>
            <span>{product.originNote}</span>
          </div>

          <h2
            className="mt-1.5 font-display text-3xl sm:text-4xl font-normal leading-[1.08] text-[#F5EFE6]"
            style={{textWrap: 'balance'}}
          >
            {product.productName}
          </h2>

          <p className="mx-auto mt-2 max-w-[38ch] text-xs sm:text-sm leading-relaxed text-[#F5EFE6]/85">
            {product.description}
          </p>

          {/* Bold, Clear Price */}
          <div className="mt-3.5 flex items-baseline justify-center gap-2.5">
            <span
              style={{color: product.accentColor}}
              className="font-sans-ui text-3xl sm:text-[2.15rem] font-semibold tracking-tight tabular-nums drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
            >
              ${totalPrice}
            </span>
            {quantity > 1 && (
              <span className="text-xs text-[#F5EFE6]/70 tabular-nums">
                ({quantity} × {product.price})
              </span>
            )}
          </div>

          {/* Quantity Stepper (- qty +) & Order Now */}
          {!orderConfirmed ? (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              {/* Quantity Control */}
              <div className="inline-flex h-12 items-center rounded-xl border border-[#F5EFE6]/20 bg-[#120E0C]/45 px-1.5 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-[#F5EFE6] transition-colors hover:bg-[#F5EFE6]/10 disabled:opacity-35 disabled:pointer-events-none"
                >
                  <Minus className="h-4 w-4" strokeWidth={2} />
                </button>
                <span
                  aria-live="polite"
                  className="w-10 text-center font-sans-ui text-base font-semibold text-[#F5EFE6] tabular-nums"
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                  aria-label="Increase quantity"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-[#F5EFE6] transition-colors hover:bg-[#F5EFE6]/10"
                >
                  <Plus className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              {/* Order Now Primary Action */}
              <button
                type="button"
                onClick={handleOrderNow}
                style={{backgroundColor: product.accentColor}}
                className="inline-flex h-12 w-full sm:w-auto sm:min-w-[180px] items-center justify-center rounded-xl px-7 font-sans-ui text-sm font-semibold tracking-[0.03em] text-[#120E0C] shadow-[0_12px_28px_rgba(0,0,0,0.45)] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5EFE6]"
              >
                Order Now
              </button>
            </div>
          ) : (
            <motion.div
              initial={{opacity: 0, y: 6}}
              animate={{opacity: 1, y: 0}}
              className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-[#F5EFE6]/20 bg-[#120E0C]/55 px-4 py-3.5"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-[#F5EFE6]">
                <span
                  style={{backgroundColor: product.accentColor}}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[#120E0C]"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <span>
                  Added {quantity} × {product.productName} · ${totalPrice}
                </span>
              </div>
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCart();
                  }}
                  style={{color: product.accentColor}}
                  className="text-xs font-semibold underline underline-offset-4 hover:opacity-85 transition-opacity"
                >
                  View Cart
                </button>
                <button
                  type="button"
                  onClick={() => setOrderConfirmed(false)}
                  className="text-xs font-medium text-[#F5EFE6]/75 underline underline-offset-4 hover:text-[#F5EFE6] transition-colors"
                >
                  Order more
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
