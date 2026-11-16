import {useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {Check, Minus, Plus, ShoppingBag, Trash2, X} from 'lucide-react';
import {CartItem} from '../types';
import {CafeLogo} from './CafeLogo';
import {ResilientPlateImage} from './ResilientPlateImage';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQty: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onExploreMenu: () => void;
}

export function CartDrawer({
  isOpen,
  items,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onExploreMenu,
}: CartDrawerProps) {
  const [placedOrder, setPlacedOrder] = useState(false);

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.numericPrice * item.quantity,
    0,
  );

  const handleCheckout = () => {
    setPlacedOrder(true);
    onClearCart();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          exit={{opacity: 0}}
          transition={{duration: 0.2}}
          onClick={() => {
            setPlacedOrder(false);
            onClose();
          }}
          className="fixed inset-0 z-50 flex justify-end bg-[#0C0907]/65 backdrop-blur-sm"
        >
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            initial={{x: '100%'}}
            animate={{x: 0}}
            exit={{x: '100%'}}
            transition={{duration: 0.28, ease: [0.16, 1, 0.3, 1]}}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-[400px] flex-col border-l border-[#F5EFE6]/12 bg-[#16110F]/96 text-[#F5EFE6] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#F5EFE6]/10 px-6 py-5">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="h-4 w-4 text-[#C89B62]" strokeWidth={1.6} />
                <h2 className="font-display text-2xl font-normal text-[#F5EFE6]">
                  Your Table Order
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPlacedOrder(false);
                  onClose();
                }}
                aria-label="Close cart"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#F5EFE6]/15 text-[#D5C9BA] hover:text-[#F5EFE6] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-5">
              {placedOrder ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#C89B62] text-[#120E0C] mb-4">
                    <Check className="h-6 w-6" strokeWidth={2.2} />
                  </div>
                  <h3 className="font-display text-2xl text-[#F5EFE6]">
                    Order Sent to Kitchen
                  </h3>
                  <p className="mt-2 max-w-[28ch] text-xs sm:text-sm text-[#B8ADA0]">
                    Your freshly plated items are being prepared at Maison Sorrel.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPlacedOrder(false);
                      onClose();
                    }}
                    className="mt-6 rounded-xl bg-[#C89B62] px-6 py-2.5 text-xs font-semibold text-[#120E0C] hover:bg-[#D9AE77] transition-colors"
                  >
                    Back to Table
                  </button>
                </div>
              ) : items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingBag
                    className="h-10 w-10 text-[#C89B62]/45 mb-3"
                    strokeWidth={1.25}
                  />
                  <p className="font-display text-2xl text-[#F5EFE6]">
                    Your plate is empty
                  </p>
                  <p className="mt-1.5 max-w-[26ch] text-xs text-[#B8ADA0]">
                    Select any category on the deli wheel and tap Order to add dishes.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onExploreMenu();
                    }}
                    className="mt-6 rounded-xl border border-[#C89B62]/45 px-5 py-2.5 text-xs font-medium text-[#E7C28D] hover:bg-[#C89B62]/10 transition-colors"
                  >
                    Explore Deli Wheel
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-[#F5EFE6]/10">
                  {items.map(({product, quantity}) => (
                    <li key={product.id} className="flex items-center gap-3.5 py-4">
                      <div className="h-14 w-14 shrink-0">
                        <ResilientPlateImage
                          src={product.image}
                          alt={product.productName}
                          imageScale={product.imageScale}
                          className="h-full w-full"
                          shadowClassName="shadow-md"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-lg text-[#F5EFE6]">
                          {product.productName}
                        </p>
                        <p className="text-xs font-semibold text-[#E7C28D] tabular-nums">
                          ${(product.numericPrice * quantity).toFixed(2)}
                        </p>

                        <div className="mt-2 inline-flex items-center gap-1 rounded-lg border border-[#F5EFE6]/12 bg-[#120E0C] px-1 py-0.5">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(product.id, -1)}
                            aria-label={`Decrease ${product.productName} quantity`}
                            className="flex h-7 w-7 items-center justify-center rounded text-[#D5C9BA] hover:text-[#F5EFE6]"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-semibold tabular-nums">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(product.id, 1)}
                            aria-label={`Increase ${product.productName} quantity`}
                            className="flex h-7 w-7 items-center justify-center rounded text-[#D5C9BA] hover:text-[#F5EFE6]"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(product.id)}
                        aria-label={`Remove ${product.productName}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#B8ADA0] hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && !placedOrder && (
              <div className="border-t border-[#F5EFE6]/10 px-6 py-5">
                <div className="flex items-baseline justify-between mb-4">
                  <span className="text-xs uppercase tracking-[0.12em] text-[#B8ADA0]">
                    Subtotal
                  </span>
                  <span className="font-sans-ui text-2xl font-semibold text-[#E7C28D] tabular-nums">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCheckout}
                  className="w-full h-12 rounded-xl bg-[#C89B62] text-sm font-semibold text-[#120E0C] hover:bg-[#D9AE77] transition-colors"
                >
                  Place Order Now
                </button>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateHero: () => void;
  onNavigateWheel: () => void;
}

export function MenuDrawer({
  isOpen,
  onClose,
  onNavigateHero,
  onNavigateWheel,
}: MenuDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          exit={{opacity: 0}}
          transition={{duration: 0.2}}
          onClick={onClose}
          className="fixed inset-0 z-50 flex justify-end bg-[#0C0907]/65 backdrop-blur-sm"
        >
          <motion.nav
            aria-label="Site menu"
            initial={{x: '100%'}}
            animate={{x: 0}}
            exit={{x: '100%'}}
            transition={{duration: 0.28, ease: [0.16, 1, 0.3, 1]}}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-[340px] flex-col justify-between border-l border-[#F5EFE6]/12 bg-[#16110F]/96 px-7 py-7 text-[#F5EFE6] shadow-2xl"
          >
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-[#F5EFE6]/10">
                <CafeLogo compact className="items-start text-left" />
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close menu"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#F5EFE6]/15 text-[#D5C9BA] hover:text-[#F5EFE6] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-8 flex flex-col gap-5">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateHero();
                  }}
                  className="text-left font-display text-3xl text-[#F5EFE6] hover:text-[#E7C28D] transition-colors"
                >
                  The Morning Table
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateWheel();
                  }}
                  className="text-left font-display text-3xl text-[#F5EFE6] hover:text-[#E7C28D] transition-colors"
                >
                  Circular Deli Menu
                </button>
              </div>
            </div>

            <div className="border-t border-[#F5EFE6]/10 pt-5 text-xs text-[#B8ADA0] space-y-1">
              <p className="text-[#F5EFE6]/90 font-medium">148 Rue de Turenne</p>
              <p>Open Daily · 07:00 – 19:00</p>
            </div>
          </motion.nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
