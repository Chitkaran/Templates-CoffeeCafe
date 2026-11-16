export type DishEffect = 'steam' | 'coffee-swirl';

export interface DeliCategory {
  id: string;
  category: string;
  productName: string;
  description: string;
  price: string;
  numericPrice: number;
  originNote: string;
  image: string;
  imageScale: number;
  accentColor: string;
  tintBg: string;
  tintBorder: string;
  effects: DishEffect[];
}

export interface CartItem {
  product: DeliCategory;
  quantity: number;
}

export type TextAlignment = 'left' | 'center' | 'right';
export type TextDepth = 'behind' | 'front';
export type LayerVisibility = 'hero' | 'showcase' | 'always';
export type LayerFontStyle = 'display' | 'freeman' | 'sans' | 'italic';

export interface TextColorRange {
  start: number;
  end: number;
  color: string;
}

export interface EditableTextLayer {
  id: string;
  label: string;
  text: string;
  x: number; // Percentage 0..100 across stage width
  y: number; // Percentage 0..100 across stage height
  fontSize: number; // Base font size in px
  isBold: boolean;
  lineHeight: number; // Unitless line height (e.g. 1.05)
  letterSpacing: number; // In em (e.g. -0.01)
  align: TextAlignment;
  depth: TextDepth;
  visibility: LayerVisibility;
  fontStyle: LayerFontStyle;
  color: string;
  colorRanges?: TextColorRange[];
  maxWidth: number; // Width in px (draggable)
}
