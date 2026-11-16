import {useEffect, useRef, useState} from 'react';
import {EditableTextLayer, TextDepth} from '../types';
import {
  adjustColorRangesForTextEdit,
  splitTextIntoColorSegments,
} from '../utils/textColorRanges';

export interface TextSelectionRange {
  layerId: string;
  start: number;
  end: number;
}

interface EditableTextLayerCanvasProps {
  layers: EditableTextLayer[];
  planeDepth: TextDepth;
  isEditMode: boolean;
  selectedLayerId: string | null;
  scrollStage: 'hero' | 'transition' | 'showcase';
  stageRef: React.RefObject<HTMLDivElement | null>;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (id: string, patch: Partial<EditableTextLayer>) => void;
  onTextSelectionChange?: (selection: TextSelectionRange | null) => void;
}

export function EditableTextLayerCanvas({
  layers,
  planeDepth,
  isEditMode,
  selectedLayerId,
  scrollStage,
  stageRef,
  onSelectLayer,
  onUpdateLayer,
  onTextSelectionChange,
}: EditableTextLayerCanvasProps) {
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440,
  );

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize, {passive: true});
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      setInlineEditingId(null);
    }
  }, [isEditMode]);

  const dragMeta = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const widthDragMeta = useRef<{
    id: string;
    side: 'left' | 'right';
    startClientX: number;
    origWidth: number;
    align: EditableTextLayer['align'];
  } | null>(null);

  const filteredLayers = layers.filter((l) => l.depth === planeDepth);

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    layer: EditableTextLayer,
  ) => {
    if (!isEditMode) return;
    if (inlineEditingId === layer.id) return;
    e.stopPropagation();
    onSelectLayer(layer.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragMeta.current = {
      id: layer.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: layer.x,
      origY: layer.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const meta = dragMeta.current;
    const container = stageRef.current;
    if (!meta || !container || !isEditMode) return;

    const dx = e.clientX - meta.startClientX;
    const dy = e.clientY - meta.startClientY;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaXPct = (dx / rect.width) * 100;
    const deltaYPct = (dy / rect.height) * 100;

    const nextX = Math.max(4, Math.min(94, Number((meta.origX + deltaXPct).toFixed(1))));
    const nextY = Math.max(8, Math.min(88, Number((meta.origY + deltaYPct).toFixed(1))));

    onUpdateLayer(meta.id, {x: nextX, y: nextY});
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragMeta.current) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }
      dragMeta.current = null;
    }
  };

  const handleWidthHandleDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    layer: EditableTextLayer,
    side: 'left' | 'right',
  ) => {
    if (!isEditMode) return;
    e.stopPropagation();
    onSelectLayer(layer.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    widthDragMeta.current = {
      id: layer.id,
      side,
      startClientX: e.clientX,
      origWidth: layer.maxWidth,
      align: layer.align,
    };
  };

  const handleWidthHandleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const meta = widthDragMeta.current;
    if (!meta || !isEditMode) return;
    e.stopPropagation();
    const dx = e.clientX - meta.startClientX;
    const multiplier = meta.align === 'center' ? 2 : 1;
    const delta = meta.side === 'right' ? dx * multiplier : -dx * multiplier;
    const nextWidth = Math.max(120, Math.min(1040, Math.round(meta.origWidth + delta)));
    onUpdateLayer(meta.id, {maxWidth: nextWidth});
  };

  const handleWidthHandleUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (widthDragMeta.current) {
      e.stopPropagation();
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }
      widthDragMeta.current = null;
    }
  };

  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth >= 640 && viewportWidth < 1024;

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${
        planeDepth === 'behind' ? 'z-10' : 'z-30'
      }`}
    >
      {filteredLayers.map((layer) => {
        const isSelected = isEditMode && selectedLayerId === layer.id;
        const isInline = isEditMode && inlineEditingId === layer.id;
        const isBold = Boolean(layer.isBold);

        let visibleOpacity = 1;
        if (!isEditMode) {
          if (layer.visibility === 'hero') {
            visibleOpacity = scrollStage === 'hero' ? 1 : 0;
          } else if (layer.visibility === 'showcase') {
            visibleOpacity = scrollStage === 'showcase' ? 1 : 0;
          }
        } else {
          if (layer.visibility === 'hero' && scrollStage !== 'hero') visibleOpacity = 0.55;
          if (layer.visibility === 'showcase' && scrollStage !== 'showcase') visibleOpacity = 0.55;
        }

        const responsiveFontSize = isMobile
          ? Math.max(13, Math.round(layer.fontSize * 0.58))
          : isTablet
            ? Math.max(14, Math.round(layer.fontSize * 0.8))
            : layer.fontSize;

        const translateX =
          layer.align === 'center' ? '-50%' : layer.align === 'right' ? '-100%' : '0%';

        const fontClass =
          layer.fontStyle === 'freeman'
            ? 'font-freeman font-normal'
            : layer.fontStyle === 'display'
              ? `font-display ${isBold ? 'font-bold' : 'font-normal'}`
              : layer.fontStyle === 'italic'
                ? `font-display italic ${isBold ? 'font-bold' : 'font-normal'}`
                : `font-sans-ui ${isBold ? 'font-extrabold' : 'font-normal'}`;

        const lineHeight = layer.lineHeight ?? (layer.fontStyle === 'sans' ? 1.45 : 1.08);
        const letterSpacing = layer.letterSpacing ?? 0;

        const clampedLeft =
          isMobile && layer.align === 'left' && layer.x < 6
            ? 6
            : isMobile && layer.align === 'right' && layer.x > 94
              ? 94
              : layer.x;

        const effectiveWidth = isMobile
          ? Math.min(layer.maxWidth, Math.round(viewportWidth * 0.9))
          : layer.maxWidth;

        return (
          <div
            key={layer.id}
            onPointerDown={(e) => handlePointerDown(e, layer)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onDoubleClick={(e) => {
              if (!isEditMode) return;
              e.stopPropagation();
              onSelectLayer(layer.id);
              setInlineEditingId(layer.id);
            }}
            style={{
              left: `${clampedLeft}%`,
              top: `${layer.y}%`,
              transform: `translate3d(${translateX}, 0, 0)`,
              width: `${effectiveWidth}px`,
              maxWidth: '94vw',
              textAlign: layer.align,
              opacity: visibleOpacity,
              touchAction: isEditMode ? 'none' : 'auto',
            }}
            className={`absolute transition-opacity duration-300 ${
              isEditMode
                ? 'pointer-events-auto cursor-move select-none rounded px-3 py-2'
                : 'pointer-events-none select-none'
            } ${
              isSelected
                ? 'ring-1 ring-[#C89B62] bg-[#14100E]/65 backdrop-blur-sm shadow-[0_8px_24px_rgba(0,0,0,0.45)]'
                : isEditMode
                  ? 'ring-1 ring-dashed ring-[#F5EFE6]/30 hover:ring-[#C89B62]/70 bg-[#14100E]/30'
                  : ''
            }`}
          >
            {isEditMode && (
              <span className="pointer-events-none -top-5 left-0 absolute whitespace-nowrap text-[10px] tracking-[0.06em] uppercase text-[#E7C28D] bg-[#14100E]/95 px-1.5 py-0.5 rounded border border-[#C89B62]/30 tabular-nums">
                {layer.label} · {layer.maxWidth}px · {layer.depth === 'behind' ? 'Behind' : 'Front'}
              </span>
            )}

            {/* Drag Width Handles (Left & Right edges when selected) */}
            {isSelected && !isInline && (
              <>
                <button
                  type="button"
                  aria-label="Drag to resize text width from left"
                  onPointerDown={(e) => handleWidthHandleDown(e, layer, 'left')}
                  onPointerMove={handleWidthHandleMove}
                  onPointerUp={handleWidthHandleUp}
                  onPointerCancel={handleWidthHandleUp}
                  style={{touchAction: 'none'}}
                  className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 flex h-8 w-3.5 cursor-ew-resize items-center justify-center rounded-full bg-[#C89B62] text-[#120E0C] shadow-md hover:scale-110"
                >
                  <span className="h-3.5 w-[1.5px] bg-[#120E0C]/80 rounded-full" />
                </button>
                <button
                  type="button"
                  aria-label="Drag to resize text width from right"
                  onPointerDown={(e) => handleWidthHandleDown(e, layer, 'right')}
                  onPointerMove={handleWidthHandleMove}
                  onPointerUp={handleWidthHandleUp}
                  onPointerCancel={handleWidthHandleUp}
                  style={{touchAction: 'none'}}
                  className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 flex h-8 w-3.5 cursor-ew-resize items-center justify-center rounded-full bg-[#C89B62] text-[#120E0C] shadow-md hover:scale-110"
                >
                  <span className="h-3.5 w-[1.5px] bg-[#120E0C]/80 rounded-full" />
                </button>
              </>
            )}

            {isInline ? (
              <textarea
                autoFocus
                value={layer.text}
                onChange={(e) => {
                  const newText = e.target.value;
                  onUpdateLayer(layer.id, {
                    text: newText,
                    colorRanges: adjustColorRangesForTextEdit(
                      layer.text,
                      newText,
                      layer.colorRanges,
                      layer.color,
                    ),
                  });
                }}
                onSelect={(e) => {
                  const el = e.currentTarget;
                  if (document.activeElement !== el) return;
                  if (el.selectionStart !== el.selectionEnd) {
                    onTextSelectionChange?.({
                      layerId: layer.id,
                      start: el.selectionStart,
                      end: el.selectionEnd,
                    });
                  } else {
                    onTextSelectionChange?.(null);
                  }
                }}
                onKeyUp={(e) => {
                  const el = e.currentTarget;
                  if (document.activeElement !== el) return;
                  if (el.selectionStart !== el.selectionEnd) {
                    onTextSelectionChange?.({
                      layerId: layer.id,
                      start: el.selectionStart,
                      end: el.selectionEnd,
                    });
                  } else {
                    onTextSelectionChange?.(null);
                  }
                }}
                onMouseUp={(e) => {
                  const el = e.currentTarget;
                  if (document.activeElement !== el) return;
                  if (el.selectionStart !== el.selectionEnd) {
                    onTextSelectionChange?.({
                      layerId: layer.id,
                      start: el.selectionStart,
                      end: el.selectionEnd,
                    });
                  }
                }}
                onTouchEnd={(e) => {
                  const el = e.currentTarget;
                  if (document.activeElement !== el) return;
                  if (el.selectionStart !== el.selectionEnd) {
                    onTextSelectionChange?.({
                      layerId: layer.id,
                      start: el.selectionStart,
                      end: el.selectionEnd,
                    });
                  }
                }}
                onBlur={() => setInlineEditingId(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' || ((e.metaKey || e.ctrlKey) && e.key === 'Enter')) {
                    e.preventDefault();
                    setInlineEditingId(null);
                  }
                }}
                rows={Math.max(2, layer.text.split('\n').length)}
                style={{
                  fontSize: `${responsiveFontSize}px`,
                  lineHeight,
                  letterSpacing: `${letterSpacing}em`,
                  color: layer.color,
                  textAlign: layer.align,
                }}
                className={`select-text w-full resize-none bg-transparent outline-none ${fontClass}`}
              />
            ) : (
              <div
                style={{
                  fontSize: `${responsiveFontSize}px`,
                  lineHeight,
                  letterSpacing: `${letterSpacing}em`,
                  color: layer.color,
                }}
                className={`${fontClass} whitespace-pre-line break-words drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]`}
              >
                {layer.text ? (
                  splitTextIntoColorSegments(layer.text, layer.color, layer.colorRanges).map(
                    (seg, idx) => (
                      <span key={idx} style={{color: seg.color}}>
                        {seg.text}
                      </span>
                    ),
                  )
                ) : (
                  'Empty text layer'
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
