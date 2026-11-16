import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  ChevronUp,
  CloudUpload,
  GripHorizontal,
  Layers,
  Loader2,
  LogOut,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import {
  EditableTextLayer,
  LayerFontStyle,
  LayerVisibility,
  TextAlignment,
} from '../types';
import {
  adjustColorRangesForTextEdit,
  applyColorRange,
  normalizeColorRanges,
} from '../utils/textColorRanges';
import {type TextSelectionRange} from './EditableTextLayerCanvas';

export type CloudSyncStatus = 'idle' | 'saving' | 'saved' | 'error';

interface TextLayerEditorToolbarProps {
  layers: EditableTextLayer[];
  selectedLayerId: string | null;
  textSelection: TextSelectionRange | null;
  isAuthorizedEditor: boolean;
  signedInEmail: string | null;
  hasPendingCloudSave: boolean;
  cloudSyncStatus: CloudSyncStatus;
  cloudErrorMessage: string | null;
  onSelectLayer: (id: string) => void;
  onTextSelectionChange: (sel: TextSelectionRange | null) => void;
  onUpdateLayer: (id: string, patch: Partial<EditableTextLayer>) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onResetLayers: () => void;
  onSignInAndSave: () => void;
  onSaveNow: () => void;
  onSignOut: () => void;
  onClose: () => void;
}

const FONT_OPTIONS: {value: LayerFontStyle; label: string}[] = [
  {value: 'display', label: 'Serif'},
  {value: 'freeman', label: 'Freeman'},
  {value: 'sans', label: 'Sans'},
  {value: 'italic', label: 'Italic'},
];

const COLOR_SWATCHES = [
  {hex: '#F5EFE6', label: 'Warm Cream'},
  {hex: '#FFFFFF', label: 'Pure White'},
  {hex: '#E3A459', label: 'Burnished Brass'},
  {hex: '#E07A5F', label: 'Terracotta'},
  {hex: '#B5C878', label: 'Pistachio'},
  {hex: '#D5C9BA', label: 'Oat Taupe'},
  {hex: '#120E0C', label: 'Espresso'},
];

export function TextLayerEditorToolbar({
  layers,
  selectedLayerId,
  textSelection,
  isAuthorizedEditor,
  signedInEmail,
  hasPendingCloudSave,
  cloudSyncStatus,
  cloudErrorMessage,
  onSelectLayer,
  onTextSelectionChange,
  onUpdateLayer,
  onAddLayer,
  onDeleteLayer,
  onResetLayers,
  onSignInAndSave,
  onSaveNow,
  onSignOut,
  onClose,
}: TextLayerEditorToolbarProps) {
  const selected = layers.find((l) => l.id === selectedLayerId) ?? layers[0] ?? null;

  const currentLineHeight =
    selected?.lineHeight ?? (selected?.fontStyle === 'sans' ? 1.45 : 1.08);
  const currentLetterSpacing = selected?.letterSpacing ?? 0;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSelection =
    selected &&
    textSelection &&
    textSelection.layerId === selected.id &&
    textSelection.end > textSelection.start &&
    textSelection.start < selected.text.length
      ? {
          start: Math.max(0, textSelection.start),
          end: Math.min(selected.text.length, textSelection.end),
        }
      : null;

  const selectedSnippet = activeSelection
    ? selected!.text.slice(activeSelection.start, activeSelection.end).replace(/\n/g, ' ')
    : '';

  const wordTokens = useMemo(() => {
    if (!selected?.text) return [];
    const tokens: {word: string; start: number; end: number}[] = [];
    const regex = /\S+/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(selected.text)) !== null) {
      tokens.push({
        word: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
    return tokens;
  }, [selected?.text]);

  const normalizedRanges = useMemo(
    () =>
      selected
        ? normalizeColorRanges(
            selected.colorRanges,
            selected.text.length,
            selected.color,
          )
        : [],
    [selected],
  );

  const getColorAtOffset = useCallback(
    (offset: number) => {
      if (!selected) return '#F5EFE6';
      const match = normalizedRanges.find(
        (r) => offset >= r.start && offset < r.end,
      );
      return match ? match.color : selected.color;
    },
    [selected, normalizedRanges],
  );

  const activeTargetColor = activeSelection
    ? getColorAtOffset(activeSelection.start)
    : (selected?.color ?? '#F5EFE6');

  const safeColorInputValue = /^#[0-9a-fA-F]{6}$/.test(activeTargetColor)
    ? activeTargetColor
    : '#F5EFE6';

  const applyColorChoice = (hex: string) => {
    if (!selected) return;
    if (activeSelection) {
      if (
        activeSelection.start === 0 &&
        activeSelection.end >= selected.text.length
      ) {
        onUpdateLayer(selected.id, {color: hex, colorRanges: []});
        return;
      }
      const nextRanges = applyColorRange(
        selected.colorRanges,
        activeSelection.start,
        activeSelection.end,
        hex,
        selected.color,
        selected.text.length,
      );
      onUpdateLayer(selected.id, {colorRanges: nextRanges});
    } else {
      onUpdateLayer(selected.id, {
        color: hex,
        colorRanges: normalizeColorRanges(
          selected.colorRanges,
          selected.text.length,
          hex,
        ),
      });
    }
  };

  const syncTextareaSelection = useCallback(
    (el: HTMLTextAreaElement) => {
      if (!selected || document.activeElement !== el) return;
      if (el.selectionStart !== el.selectionEnd) {
        onTextSelectionChange({
          layerId: selected.id,
          start: el.selectionStart,
          end: el.selectionEnd,
        });
      } else {
        onTextSelectionChange(null);
      }
    },
    [selected, onTextSelectionChange],
  );

  useEffect(() => {
    const handleSelectionChange = () => {
      const el = textareaRef.current;
      if (el && document.activeElement === el) {
        syncTextareaSelection(el);
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () =>
      document.removeEventListener('selectionchange', handleSelectionChange);
  }, [syncTextareaSelection]);

  const preserveTextareaFocus = (e: React.SyntheticEvent) => {
    if (document.activeElement === textareaRef.current) {
      e.preventDefault();
    }
  };

  const asideRef = useRef<HTMLElement>(null);
  const [panelPos, setPanelPos] = useState<{x: number; y: number} | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);

  const dragMeta = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const clampPosition = useCallback((x: number, y: number) => {
    const el = asideRef.current;
    const width = el?.offsetWidth ?? Math.min(window.innerWidth - 16, 880);
    const height = el?.offsetHeight ?? 260;
    const maxX = Math.max(8, window.innerWidth - width - 8);
    const maxY = Math.max(8, window.innerHeight - height - 8);
    return {
      x: Math.max(8, Math.min(maxX, Math.round(x))),
      y: Math.max(8, Math.min(maxY, Math.round(y))),
    };
  }, []);

  useLayoutEffect(() => {
    const el = asideRef.current;
    if (!el) return;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    setPanelPos((prev) => {
      if (!prev) {
        return clampPosition(
          (window.innerWidth - width) / 2,
          window.innerHeight - height - 12,
        );
      }
      return clampPosition(prev.x, prev.y);
    });
  }, [clampPosition, isCollapsed, cloudErrorMessage]);

  useEffect(() => {
    const handleResize = () => {
      setPanelPos((prev) => (prev ? clampPosition(prev.x, prev.y) : prev));
    };
    window.addEventListener('resize', handleResize, {passive: true});
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPosition]);

  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const rect = asideRef.current?.getBoundingClientRect();
    const currentX = panelPos?.x ?? rect?.left ?? 10;
    const currentY = panelPos?.y ?? rect?.top ?? 10;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingPanel(true);
    dragMeta.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: currentX,
      origY: currentY,
    };
  };

  const handleDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const meta = dragMeta.current;
    if (!meta) return;
    e.stopPropagation();
    const nextX = meta.origX + (e.clientX - meta.startX);
    const nextY = meta.origY + (e.clientY - meta.startY);
    setPanelPos(clampPosition(nextX, nextY));
  };

  const handleDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragMeta.current) return;
    e.stopPropagation();
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
    dragMeta.current = null;
    setIsDraggingPanel(false);
  };

  return (
    <aside
      ref={asideRef}
      aria-label="Text layer editor"
      style={
        panelPos
          ? {left: `${panelPos.x}px`, top: `${panelPos.y}px`}
          : {left: '50%', bottom: '12px', transform: 'translateX(-50%)'}
      }
      className="fixed z-50 flex w-[calc(100vw-16px)] max-w-[880px] flex-col rounded-xl border border-[#F5EFE6]/18 bg-[#171210]/96 text-[#F5EFE6] shadow-[0_24px_60px_rgba(0,0,0,0.85)] backdrop-blur-xl max-h-[54dvh]"
    >
      {/* Movable Drag Handle Bar */}
      <div
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        style={{touchAction: 'none'}}
        className={`flex items-center justify-between gap-2 rounded-t-xl border-b border-[#F5EFE6]/10 bg-[#1E1714]/90 px-3 py-1.5 select-none ${
          isDraggingPanel ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div className="flex items-center gap-2 text-[11px] font-medium tracking-[0.04em] text-[#D5C9BA]">
          <GripHorizontal className="h-4 w-4 text-[#C89B62]" strokeWidth={1.8} />
          <span>Drag to move editor</span>
        </div>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setIsCollapsed((c) => !c)}
          aria-label={isCollapsed ? 'Expand editor' : 'Collapse editor'}
          className="inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] text-[#B8ADA0] hover:bg-[#2A211D] hover:text-[#F5EFE6] transition-colors"
        >
          <span>{isCollapsed ? 'Expand' : 'Hide tools'}</span>
          {isCollapsed ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Main Editor Body */}
      <div className="overflow-y-auto no-scrollbar p-3 sm:p-4">
        {/* Top Row: Layer selector chips + Cloud Save / Reset / Done */}
        <div
          className={`flex items-center justify-between gap-2 ${
            isCollapsed ? '' : 'pb-2.5 border-b border-[#F5EFE6]/10'
          }`}
        >
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {layers.map((layer) => {
              const active = selected?.id === layer.id;
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => onSelectLayer(layer.id)}
                  className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[#C89B62] text-[#120E0C]'
                      : 'bg-[#241C18] text-[#D5C9BA] hover:text-[#F5EFE6]'
                  }`}
                >
                  {layer.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={onAddLayer}
              className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-md border border-[#F5EFE6]/15 px-2.5 py-1.5 text-xs font-medium text-[#E7C28D] hover:bg-[#241C18] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add text</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
          {isAuthorizedEditor ? (
            <>
              {cloudSyncStatus === 'saving' ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#C89B62]/35 bg-[#241C18] px-2.5 py-1.5 text-[11px] font-medium text-[#E7C28D] whitespace-nowrap">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Saving</span>
                </span>
              ) : hasPendingCloudSave ? (
                <button
                  type="button"
                  onClick={onSaveNow}
                  className="inline-flex items-center gap-1 rounded-md bg-[#C89B62] px-2.5 py-1.5 text-[11px] font-semibold text-[#120E0C] hover:bg-[#E7C28D] transition-colors whitespace-nowrap"
                >
                  <CloudUpload className="h-3.5 w-3.5" />
                  <span>Save</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/25 bg-emerald-950/40 px-2.5 py-1.5 text-[11px] font-medium text-emerald-300 whitespace-nowrap">
                  <Check className="h-3 w-3" strokeWidth={2.4} />
                  <span>Saved</span>
                </span>
              )}
              <button
                type="button"
                onClick={onSignOut}
                title={`Signed in as ${signedInEmail ?? 'owner'} — Sign out`}
                aria-label="Sign out editor"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#B8ADA0] hover:bg-[#241C18] hover:text-[#F5EFE6] transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onSignInAndSave}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#C89B62] px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-[#120E0C] hover:bg-[#E7C28D] transition-colors whitespace-nowrap shrink-0"
            >
              <CloudUpload className="h-3.5 w-3.5" />
              <span>{signedInEmail ? 'Switch Owner' : 'Save Permanently'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onResetLayers}
            title="Reset text layers"
            aria-label="Reset text layers"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#B8ADA0] hover:bg-[#241C18] hover:text-[#F5EFE6] transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-md bg-[#F5EFE6] px-3 py-1.5 text-xs font-medium text-[#120E0C] hover:bg-[#E7C28D] transition-colors whitespace-nowrap shrink-0"
          >
            <span>Done</span>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {cloudErrorMessage && (
        <div
          role="status"
          className="mt-2 rounded-lg border border-amber-400/30 bg-amber-950/40 px-3 py-1.5 text-[11px] text-amber-200"
        >
          {cloudErrorMessage}
        </div>
      )}

      {/* Controls for Selected Layer */}
      {!isCollapsed && selected ? (
        <div className="mt-3 flex flex-col gap-2.5">
          {/* Row 1: Multiline Text + Font Family (Serif / Freeman / Sans / Italic) + Bold + Visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
            <div className="sm:col-span-5">
              <label className="sr-only" htmlFor="layer-text-input">
                Layer text (press Enter for new line)
              </label>
              <textarea
                ref={textareaRef}
                id="layer-text-input"
                rows={2}
                value={selected.text}
                onChange={(e) => {
                  const newText = e.target.value;
                  onUpdateLayer(selected.id, {
                    text: newText,
                    colorRanges: adjustColorRangesForTextEdit(
                      selected.text,
                      newText,
                      selected.colorRanges,
                      selected.color,
                    ),
                  });
                  onTextSelectionChange(null);
                }}
                onSelect={(e) => syncTextareaSelection(e.currentTarget)}
                onKeyUp={(e) => syncTextareaSelection(e.currentTarget)}
                onMouseUp={(e) => syncTextareaSelection(e.currentTarget)}
                onTouchEnd={(e) => syncTextareaSelection(e.currentTarget)}
                placeholder="Type text... Highlight or tap a word below to color only it"
                className="select-text w-full resize-none rounded-lg border border-[#F5EFE6]/15 bg-[#120E0C] px-3 py-1.5 text-xs sm:text-sm text-[#F5EFE6] placeholder:text-[#B8ADA0]/50 focus:border-[#C89B62] focus:outline-none"
              />
              {wordTokens.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                  <span className="shrink-0 text-[10px] text-[#B8ADA0]/80 mr-0.5">
                    Tap word:
                  </span>
                  {wordTokens.map((token, idx) => {
                    const isExact =
                      activeSelection?.start === token.start &&
                      activeSelection?.end === token.end;
                    const isInside =
                      Boolean(activeSelection) &&
                      activeSelection!.start < token.end &&
                      activeSelection!.end > token.start;
                    const tokenColor = getColorAtOffset(token.start);
                    return (
                      <button
                        key={`${token.start}-${idx}`}
                        type="button"
                        onPointerDown={preserveTextareaFocus}
                        onMouseDown={preserveTextareaFocus}
                        onClick={(e) => {
                          if (e.shiftKey && activeSelection) {
                            onTextSelectionChange({
                              layerId: selected.id,
                              start: Math.min(activeSelection.start, token.start),
                              end: Math.max(activeSelection.end, token.end),
                            });
                          } else if (isExact) {
                            onTextSelectionChange(null);
                          } else {
                            onTextSelectionChange({
                              layerId: selected.id,
                              start: token.start,
                              end: token.end,
                            });
                          }
                        }}
                        className={`inline-flex items-center gap-1 shrink-0 rounded px-1.5 py-0.5 text-[11px] transition-colors border ${
                          isInside
                            ? 'border-[#C89B62] bg-[#C89B62]/20 text-[#F5EFE6] font-medium'
                            : 'border-[#F5EFE6]/12 bg-[#120E0C]/80 text-[#D5C9BA] hover:border-[#C89B62]/50 hover:text-[#F5EFE6]'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          style={{backgroundColor: tokenColor}}
                          className="h-2 w-2 rounded-full border border-[#F5EFE6]/25 shrink-0"
                        />
                        <span>{token.word}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="sm:col-span-4 flex items-center gap-1.5">
              <div className="flex flex-1 items-center gap-0.5 rounded-lg bg-[#120E0C] p-1 border border-[#F5EFE6]/10">
                {FONT_OPTIONS.map(({value, label}) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onUpdateLayer(selected.id, {fontStyle: value})}
                    className={`flex-1 rounded px-1.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                      selected.fontStyle === value
                        ? 'bg-[#2A211D] text-[#E7C28D]'
                        : 'text-[#B8ADA0] hover:text-[#F5EFE6]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-label="Toggle bold font"
                aria-pressed={Boolean(selected.isBold)}
                onClick={() => onUpdateLayer(selected.id, {isBold: !selected.isBold})}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                  selected.isBold
                    ? 'border-[#C89B62] bg-[#C89B62] text-[#120E0C]'
                    : 'border-[#F5EFE6]/10 bg-[#120E0C] text-[#B8ADA0] hover:text-[#F5EFE6]'
                }`}
              >
                <Bold className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>

            <div className="sm:col-span-3 flex items-center gap-1 rounded-lg bg-[#120E0C] p-1 border border-[#F5EFE6]/10">
              {(['hero', 'showcase', 'always'] as LayerVisibility[]).map((vis) => (
                <button
                  key={vis}
                  type="button"
                  onClick={() => onUpdateLayer(selected.id, {visibility: vis})}
                  className={`flex-1 rounded px-2 py-1 text-[11px] font-medium capitalize transition-colors whitespace-nowrap ${
                    selected.visibility === vis
                      ? 'bg-[#2A211D] text-[#E7C28D]'
                      : 'text-[#B8ADA0] hover:text-[#F5EFE6]'
                  }`}
                >
                  {vis === 'showcase' ? 'Menu' : vis}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Size + Width + Line Height + Letter Spacing */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-center">
            {/* Font Size */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="layer-size-range"
                className="text-[11px] text-[#B8ADA0] whitespace-nowrap"
              >
                Size
              </label>
              <input
                id="layer-size-range"
                type="range"
                min={14}
                max={160}
                value={selected.fontSize}
                onChange={(e) =>
                  onUpdateLayer(selected.id, {fontSize: Number(e.target.value)})
                }
                className="h-1.5 w-full cursor-pointer accent-[#C89B62]"
              />
              <span className="w-10 text-right text-[11px] font-medium text-[#E7C28D] tabular-nums">
                {selected.fontSize}px
              </span>
            </div>

            {/* Text Box Width */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="layer-width-range"
                className="text-[11px] text-[#B8ADA0] whitespace-nowrap"
              >
                Width
              </label>
              <input
                id="layer-width-range"
                type="range"
                min={120}
                max={960}
                value={selected.maxWidth}
                onChange={(e) =>
                  onUpdateLayer(selected.id, {maxWidth: Number(e.target.value)})
                }
                className="h-1.5 w-full cursor-pointer accent-[#C89B62]"
              />
              <span className="w-10 text-right text-[11px] font-medium text-[#D5C9BA] tabular-nums">
                {selected.maxWidth}
              </span>
            </div>

            {/* Line Height */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="layer-lh-range"
                className="text-[11px] text-[#B8ADA0] whitespace-nowrap"
              >
                Line
              </label>
              <input
                id="layer-lh-range"
                type="range"
                min={0.8}
                max={2.2}
                step={0.05}
                value={currentLineHeight}
                onChange={(e) =>
                  onUpdateLayer(selected.id, {lineHeight: Number(e.target.value)})
                }
                className="h-1.5 w-full cursor-pointer accent-[#C89B62]"
              />
              <span className="w-9 text-right text-[11px] font-medium text-[#D5C9BA] tabular-nums">
                {currentLineHeight.toFixed(2)}
              </span>
            </div>

            {/* Letter Spacing */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="layer-ls-range"
                className="text-[11px] text-[#B8ADA0] whitespace-nowrap"
              >
                Track
              </label>
              <input
                id="layer-ls-range"
                type="range"
                min={-0.08}
                max={0.35}
                step={0.01}
                value={currentLetterSpacing}
                onChange={(e) =>
                  onUpdateLayer(selected.id, {letterSpacing: Number(e.target.value)})
                }
                className="h-1.5 w-full cursor-pointer accent-[#C89B62]"
              />
              <span className="w-10 text-right text-[11px] font-medium text-[#D5C9BA] tabular-nums">
                {currentLetterSpacing.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Row 3: Color Picker + Align + Behind/Front Image Layering + Delete */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-[#F5EFE6]/10">
            {/* Color Swatches + Custom Color Picker (applies to highlighted selection or whole layer) */}
            <div className="flex flex-wrap items-center gap-1.5">
              {activeSelection ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#C89B62]/50 bg-[#C89B62]/15 px-2 py-0.5 text-[11px] font-medium text-[#E7C28D] max-w-[185px]">
                  <span className="truncate">
                    Color &ldquo;{selectedSnippet}&rdquo;
                  </span>
                  <button
                    type="button"
                    onPointerDown={preserveTextareaFocus}
                    onMouseDown={preserveTextareaFocus}
                    onClick={() => onTextSelectionChange(null)}
                    aria-label="Clear text selection"
                    className="ml-0.5 text-[#E7C28D]/80 hover:text-[#F5EFE6]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : (
                <span className="text-[11px] text-[#B8ADA0] mr-1">
                  Color <span className="hidden sm:inline text-[#B8ADA0]/65">(tap a word or highlight to tint)</span>
                </span>
              )}
              {COLOR_SWATCHES.map((swatch) => {
                const isColorActive =
                  activeTargetColor.toLowerCase() === swatch.hex.toLowerCase();
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    aria-label={
                      activeSelection
                        ? `Color selected text ${swatch.label}`
                        : `Set text color to ${swatch.label}`
                    }
                    title={swatch.label}
                    onPointerDown={preserveTextareaFocus}
                    onMouseDown={preserveTextareaFocus}
                    onClick={() => applyColorChoice(swatch.hex)}
                    style={{backgroundColor: swatch.hex}}
                    className={`h-6 w-6 rounded-full border transition-transform ${
                      isColorActive
                        ? 'scale-115 border-[#F5EFE6] ring-2 ring-[#C89B62]'
                        : 'border-[#F5EFE6]/25 hover:scale-105'
                    }`}
                  />
                );
              })}
              <label
                title={activeSelection ? 'Custom color for selected text' : 'Custom text color'}
                className="relative flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[#F5EFE6]/35 bg-gradient-to-tr from-[#E07A5F] via-[#E3A459] to-[#B5C878] hover:scale-105 transition-transform"
              >
                <span className="sr-only">Pick custom color</span>
                <input
                  type="color"
                  value={safeColorInputValue}
                  onChange={(e) => applyColorChoice(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
              {normalizedRanges.length > 0 && (
                <button
                  type="button"
                  onPointerDown={preserveTextareaFocus}
                  onMouseDown={preserveTextareaFocus}
                  onClick={() => onUpdateLayer(selected.id, {colorRanges: []})}
                  className="ml-1 rounded border border-[#F5EFE6]/15 px-1.5 py-0.5 text-[10px] text-[#D5C9BA] hover:border-[#C89B62]/50 hover:text-[#F5EFE6] transition-colors"
                >
                  Reset spans
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Text Alignment */}
              <div
                role="group"
                aria-label="Text alignment"
                className="flex items-center gap-1 rounded-lg bg-[#120E0C] p-1 border border-[#F5EFE6]/10"
              >
                {(
                  [
                    {val: 'left', icon: AlignLeft, label: 'Align left'},
                    {val: 'center', icon: AlignCenter, label: 'Align center'},
                    {val: 'right', icon: AlignRight, label: 'Align right'},
                  ] as {val: TextAlignment; icon: typeof AlignLeft; label: string}[]
                ).map(({val, icon: Icon, label}) => (
                  <button
                    key={val}
                    type="button"
                    aria-label={label}
                    aria-pressed={selected.align === val}
                    onClick={() => onUpdateLayer(selected.id, {align: val})}
                    className={`flex h-7 w-8 items-center justify-center rounded transition-colors ${
                      selected.align === val
                        ? 'bg-[#2A211D] text-[#E7C28D]'
                        : 'text-[#B8ADA0] hover:text-[#F5EFE6]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>

              {/* Z-Order: Behind or In Front of Images */}
              <div
                role="group"
                aria-label="Layer order relative to images"
                className="flex items-center gap-1 rounded-lg bg-[#120E0C] p-1 border border-[#F5EFE6]/10"
              >
                <span className="px-1 text-[#B8ADA0]">
                  <Layers className="h-3.5 w-3.5" />
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateLayer(selected.id, {depth: 'behind'})}
                  className={`rounded px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                    selected.depth === 'behind'
                      ? 'bg-[#C89B62] text-[#120E0C]'
                      : 'text-[#B8ADA0] hover:text-[#F5EFE6]'
                  }`}
                >
                  Behind
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateLayer(selected.id, {depth: 'front'})}
                  className={`rounded px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                    selected.depth === 'front'
                      ? 'bg-[#C89B62] text-[#120E0C]'
                      : 'text-[#B8ADA0] hover:text-[#F5EFE6]'
                  }`}
                >
                  Front
                </button>
              </div>

              {/* Delete Layer */}
              {layers.length > 1 && (
                <button
                  type="button"
                  onClick={() => onDeleteLayer(selected.id)}
                  aria-label="Delete text layer"
                  title="Delete layer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#B8ADA0] hover:bg-red-950/50 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </aside>
  );
}
