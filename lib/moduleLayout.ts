/**
 * @module moduleLayout
 * @description State model for the floating draggable module board (Task 11b).
 *
 *              A `ModuleLayout` is a flat list of placements; `order` is the sole
 *              sort key. The board renders open placements sorted by `order`; the
 *              Modules Panel renders the closed ones. Closing a module never
 *              touches any `order`, so restoring it drops it back into its former
 *              slot. Only `moveModule` renumbers, and only across open modules —
 *              closed modules keep their canonical slot so a restore is stable.
 *
 *              Every reducer is pure and non-mutating: it returns a fresh array
 *              of fresh placements and never edits the input. Persistence lives
 *              in `localStorage` under `dispatch_module_layout`, browser-only,
 *              returning `DEFAULT_LAYOUT` on the server or on any parse failure.
 */

export interface ModulePlacement {
  id: string;
  order: number;
  collapsed: boolean;
  closed: boolean;
  pinned: boolean;
}

export type ModuleLayout = ModulePlacement[];

/**
 * The unit roster is the first floating module (Task 11); a compact board
 * summary sits beside it so reordering is observable from the first render.
 */
export const DEFAULT_LAYOUT: ModuleLayout = [
  { id: 'roster', order: 0, collapsed: false, closed: false, pinned: false },
  { id: 'summary', order: 1, collapsed: false, closed: false, pinned: false },
];

const STORAGE_KEY = 'dispatch_module_layout';

const byOrder = (a: ModulePlacement, b: ModulePlacement) => a.order - b.order;

/** Renumber a placement array to dense 0..n-1 orders in its current sequence. */
function renumber(seq: ModulePlacement[]): ModuleLayout {
  return seq.map((p, i) => ({ ...p, order: i }));
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

/**
 * @description Move an open module to a new open-slot index. Pinned or closed
 *              modules do not move. Closed modules keep their canonical slots;
 *              only the open modules are re-sequenced, so a later restore is
 *              predictable.
 */
export function moveModule(
  layout: ModuleLayout,
  id: string,
  toOrder: number,
): ModuleLayout {
  const target = layout.find((p) => p.id === id);
  if (!target || target.pinned || target.closed) return layout;

  const canonical = [...layout].sort(byOrder);
  const openIds = canonical.filter((p) => !p.closed).map((p) => p.id);
  const from = openIds.indexOf(id);
  const to = clamp(toOrder, 0, openIds.length - 1);
  if (from === -1 || from === to) return layout;

  openIds.splice(from, 1);
  openIds.splice(to, 0, id);

  // Rebuild the canonical id order: closed modules stay in place, open slots
  // are filled from the re-sequenced open order.
  let oi = 0;
  const newOrderIds = canonical.map((p) => (p.closed ? p.id : openIds[oi++]));
  const byId = new Map(layout.map((p) => [p.id, p]));
  return renumber(newOrderIds.map((mid) => byId.get(mid)!));
}

/** @description Set a module's collapsed flag. */
export function collapseModule(
  layout: ModuleLayout,
  id: string,
  next: boolean,
): ModuleLayout {
  return layout.map((p) => (p.id === id ? { ...p, collapsed: next } : p));
}

/** @description Close a module (moves it to the Modules Panel). Pinned modules stay. */
export function closeModule(layout: ModuleLayout, id: string): ModuleLayout {
  return layout.map((p) =>
    p.id === id && !p.pinned ? { ...p, closed: true } : p,
  );
}

/** @description Restore a closed module to its former slot. */
export function restoreModule(layout: ModuleLayout, id: string): ModuleLayout {
  return layout.map((p) => (p.id === id ? { ...p, closed: false } : p));
}

/** @description Set a module's pinned flag. */
export function pinModule(
  layout: ModuleLayout,
  id: string,
  next: boolean,
): ModuleLayout {
  return layout.map((p) => (p.id === id ? { ...p, pinned: next } : p));
}

function isPlacement(value: unknown): value is ModulePlacement {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.order === 'number' &&
    typeof p.collapsed === 'boolean' &&
    typeof p.closed === 'boolean' &&
    typeof p.pinned === 'boolean'
  );
}

/**
 * @description Read the persisted layout. Returns a defensive copy of
 *              `DEFAULT_LAYOUT` on the server, when nothing is stored, or when
 *              the stored value is corrupt or not a well-formed placement list.
 */
export function readLayout(): ModuleLayout {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT.map((p) => ({ ...p }));
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT.map((p) => ({ ...p }));
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(isPlacement)) {
      return parsed as ModuleLayout;
    }
    return DEFAULT_LAYOUT.map((p) => ({ ...p }));
  } catch {
    return DEFAULT_LAYOUT.map((p) => ({ ...p }));
  }
}

/** @description Persist the layout. No-op on the server or when storage is unavailable. */
export function writeLayout(layout: ModuleLayout): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* storage unavailable; the in-memory layout still drives this session */
  }
}
