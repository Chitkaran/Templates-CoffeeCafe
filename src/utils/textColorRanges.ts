import {TextColorRange} from '../types';

export function normalizeColorRanges(
  ranges: TextColorRange[] | undefined,
  textLength: number,
  baseColor?: string,
): TextColorRange[] {
  if (!ranges || ranges.length === 0 || textLength <= 0) return [];
  const cleaned = ranges
    .map((r) => ({
      start: Math.max(0, Math.min(textLength, Math.round(r.start))),
      end: Math.max(0, Math.min(textLength, Math.round(r.end))),
      color: String(r.color || '#F5EFE6').slice(0, 32),
    }))
    .filter(
      (r) =>
        r.end > r.start &&
        (!baseColor || r.color.toLowerCase() !== baseColor.toLowerCase()),
    )
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: TextColorRange[] = [];
  for (const curr of cleaned) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.end >= curr.start &&
      prev.color.toLowerCase() === curr.color.toLowerCase()
    ) {
      prev.end = Math.max(prev.end, curr.end);
    } else if (prev && prev.end > curr.start) {
      if (curr.start > prev.start) {
        prev.end = curr.start;
        merged.push({...curr});
      } else {
        merged[merged.length - 1] = {...curr};
      }
    } else {
      merged.push({...curr});
    }
  }
  return merged.slice(0, 40);
}

export function applyColorRange(
  existing: TextColorRange[] | undefined,
  selStart: number,
  selEnd: number,
  newColor: string,
  baseColor: string,
  textLength: number,
): TextColorRange[] {
  const s = Math.max(0, Math.min(textLength, Math.min(selStart, selEnd)));
  const e = Math.max(0, Math.min(textLength, Math.max(selStart, selEnd)));
  if (s >= e) return normalizeColorRanges(existing, textLength, baseColor);

  const next: TextColorRange[] = [];
  for (const r of existing ?? []) {
    if (r.end <= s || r.start >= e) {
      next.push({...r});
    } else {
      if (r.start < s) {
        next.push({start: r.start, end: s, color: r.color});
      }
      if (r.end > e) {
        next.push({start: e, end: r.end, color: r.color});
      }
    }
  }

  if (newColor.toLowerCase() !== baseColor.toLowerCase()) {
    next.push({start: s, end: e, color: newColor});
  }

  return normalizeColorRanges(next, textLength, baseColor);
}

export function adjustColorRangesForTextEdit(
  oldText: string,
  newText: string,
  oldRanges: TextColorRange[] | undefined,
  baseColor?: string,
): TextColorRange[] {
  if (!oldRanges || oldRanges.length === 0) return [];
  if (oldText === newText) return normalizeColorRanges(oldRanges, newText.length, baseColor);

  let prefix = 0;
  const minLen = Math.min(oldText.length, newText.length);
  while (prefix < minLen && oldText[prefix] === newText[prefix]) {
    prefix++;
  }

  let suffix = 0;
  while (
    suffix < minLen - prefix &&
    oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
  ) {
    suffix++;
  }

  const oldEditEnd = oldText.length - suffix;
  const newEditEnd = newText.length - suffix;
  const delta = newText.length - oldText.length;

  const adjusted: TextColorRange[] = [];
  for (const r of oldRanges) {
    if (r.end <= prefix) {
      adjusted.push({...r});
    } else if (r.start >= oldEditEnd) {
      adjusted.push({
        start: r.start + delta,
        end: r.end + delta,
        color: r.color,
      });
    } else {
      const nextStart = r.start < prefix ? r.start : newEditEnd;
      const nextEnd = r.end > oldEditEnd ? r.end + delta : prefix;
      if (nextEnd > nextStart) {
        adjusted.push({start: nextStart, end: nextEnd, color: r.color});
      }
    }
  }

  return normalizeColorRanges(adjusted, newText.length, baseColor);
}

export function splitTextIntoColorSegments(
  text: string,
  baseColor: string,
  ranges: TextColorRange[] | undefined,
): {text: string; color: string}[] {
  const normalized = normalizeColorRanges(ranges, text.length, baseColor);
  if (normalized.length === 0) {
    return [{text, color: baseColor}];
  }

  const segments: {text: string; color: string}[] = [];
  let cursor = 0;
  for (const r of normalized) {
    if (r.start > cursor) {
      segments.push({text: text.slice(cursor, r.start), color: baseColor});
    }
    segments.push({text: text.slice(r.start, r.end), color: r.color});
    cursor = r.end;
  }
  if (cursor < text.length) {
    segments.push({text: text.slice(cursor), color: baseColor});
  }
  return segments;
}
