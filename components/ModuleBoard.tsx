'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  GripVertical,
  Pin,
  PinOff,
  RotateCcw,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  DEFAULT_LAYOUT,
  closeModule,
  collapseModule,
  moveModule,
  pinModule,
  readLayout,
  restoreModule,
  writeLayout,
  type ModuleLayout,
  type ModulePlacement,
} from '@/lib/moduleLayout';

/**
 * ModuleBoard — the floating, draggable module board (Task 11b).
 *
 * Renders each open module as a 6px-radius panel card with a title bar (drag
 * grip, move up/down, collapse, pin, close), a body, and a `See more` footer in
 * --accent. Closed modules drop into the Modules Panel, from which they restore
 * to their former slot. Layout persists to `localStorage`.
 *
 * KEYBOARD PARITY IS FIRST-CLASS. Every drag action has a real `<button>`:
 * move up / move down reposition without any drag; the grip additionally
 * supports Enter/Space to pick up, arrow keys to move, and Enter/Escape to drop,
 * mirroring the pointer drag. Collapse, pin, close and restore are ordinary
 * buttons. Nothing here requires a mouse.
 */

interface ModuleBoardProps {
  modules: Record<string, { title: string; node: ReactNode }>;
  className?: string;
}

const HEADER_BTN =
  'inline-flex h-6 w-6 items-center justify-center rounded-[4px] border border-transparent text-ink-3 transition-colors hover:bg-panel-raised hover:text-ink focus-visible:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-3';

export function ModuleBoard({ modules, className }: ModuleBoardProps) {
  const [layout, setLayout] = useState<ModuleLayout>(DEFAULT_LAYOUT);
  const [hydrated, setHydrated] = useState(false);

  // Which module the keyboard has "picked up" (grip pressed). Arrow keys then
  // reposition it; Enter/Escape drops it. Independent of pointer drag.
  const [grabbedId, setGrabbedId] = useState<string | null>(null);
  // Which module a pointer drag is carrying; drives the dashed drop targets.
  const [dragId, setDragId] = useState<string | null>(null);
  // Modules whose body is expanded past the `See more` clamp.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [announce, setAnnounce] = useState('');

  // A native drag may only begin from the grip: the grip arms this on pointer
  // down, and onDragStart refuses any drag that was not armed by a grip.
  const gripArmed = useRef(false);

  // Read persisted layout on mount (localStorage is browser-only, so the first
  // render uses the default and this reconciles without a hydration mismatch).
  useEffect(() => {
    setLayout(readLayout());
    setHydrated(true);
  }, []);

  // Persist every change once hydrated, so we never clobber storage with the
  // pre-hydration default.
  useEffect(() => {
    if (hydrated) writeLayout(layout);
  }, [layout, hydrated]);

  // Render only ids we were handed a module for; append any module missing from
  // the stored layout so a newly-added module still shows.
  const effective = useMemo<ModulePlacement[]>(() => {
    const known = layout.filter((p) => modules[p.id]);
    const missing = Object.keys(modules)
      .filter((id) => !layout.some((p) => p.id === id))
      .map((id, i) => ({
        id,
        order: layout.length + i,
        collapsed: false,
        closed: false,
        pinned: false,
      }));
    return [...known, ...missing];
  }, [layout, modules]);

  const openList = useMemo(
    () => effective.filter((p) => !p.closed).sort((a, b) => a.order - b.order),
    [effective],
  );
  const closedList = useMemo(
    () => effective.filter((p) => p.closed).sort((a, b) => a.order - b.order),
    [effective],
  );

  const openIndexOf = useCallback(
    (id: string) => openList.findIndex((p) => p.id === id),
    [openList],
  );

  const moveBy = useCallback(
    (id: string, delta: number) => {
      const cur = openList.findIndex((p) => p.id === id);
      if (cur === -1) return;
      const target = cur + delta;
      if (target < 0 || target > openList.length - 1) return;
      setLayout((l) => moveModule(l, id, target));
      const title = modules[id]?.title ?? id;
      setAnnounce(`${title} moved to position ${target + 1} of ${openList.length}.`);
    },
    [openList, modules],
  );

  // Pointer drop at insertion slot `slot` (0..openList.length). Translate the
  // insertion point to a post-removal target index for moveModule.
  const dropAt = useCallback(
    (id: string, slot: number) => {
      const from = openList.findIndex((p) => p.id === id);
      if (from === -1) return;
      const to = slot > from ? slot - 1 : slot;
      setLayout((l) => moveModule(l, id, to));
    },
    [openList],
  );

  const onGripKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, placement: ModulePlacement) => {
      if (placement.pinned) return;
      const { key } = e;
      if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
        e.preventDefault();
        setGrabbedId((g) => {
          const next = g === placement.id ? null : placement.id;
          const title = modules[placement.id]?.title ?? placement.id;
          setAnnounce(
            next
              ? `${title} picked up. Use arrow keys to move, Enter to drop.`
              : `${title} dropped.`,
          );
          return next;
        });
        return;
      }
      if (key === 'Escape') {
        if (grabbedId === placement.id) {
          e.preventDefault();
          setGrabbedId(null);
        }
        return;
      }
      if (grabbedId === placement.id) {
        if (key === 'ArrowUp' || key === 'ArrowLeft') {
          e.preventDefault();
          moveBy(placement.id, -1);
        } else if (key === 'ArrowDown' || key === 'ArrowRight') {
          e.preventDefault();
          moveBy(placement.id, 1);
        }
      }
    },
    [grabbedId, moveBy, modules],
  );

  return (
    <section
      aria-label="Floating modules"
      className={cn('flex w-full flex-col gap-3', className)}
    >
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>

      {openList.map((placement, index) => {
        const module = modules[placement.id];
        const title = module.title;
        const grabbed = grabbedId === placement.id;
        const isExpanded = !!expanded[placement.id];
        const openCount = openList.length;

        return (
          <div key={placement.id} className="flex flex-col gap-3">
            {/* Drop target BEFORE this card (only while a pointer drag is live). */}
            {dragId && dragId !== placement.id && (
              <DropTarget onDrop={() => dropAt(dragId, index)} />
            )}

            <article
              draggable={!placement.pinned}
              onDragStart={(e) => {
                if (!gripArmed.current || placement.pinned) {
                  e.preventDefault();
                  return;
                }
                setDragId(placement.id);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', placement.id);
              }}
              onDragEnd={() => {
                gripArmed.current = false;
                setDragId(null);
              }}
              aria-label={title}
              className={cn(
                'rounded-md border bg-panel text-ink transition-colors',
                grabbed || dragId === placement.id
                  ? 'border-accent'
                  : 'border-rule-strong',
              )}
            >
              {/* Title bar */}
              <div className="flex items-center gap-1 border-b border-rule px-2 py-1.5">
                <button
                  type="button"
                  aria-label={
                    grabbed
                      ? `Drop ${title}`
                      : `Move ${title}. Press Enter to pick up, then use arrow keys`
                  }
                  aria-pressed={grabbed}
                  disabled={placement.pinned}
                  onMouseDown={() => {
                    if (!placement.pinned) gripArmed.current = true;
                  }}
                  // A click that never became a drag must disarm, or the whole
                  // card would stay body-draggable. A real drag fires dragEnd
                  // (which also disarms) instead of mouseUp, so this is safe.
                  onMouseUp={() => {
                    gripArmed.current = false;
                  }}
                  onKeyDown={(e) => onGripKeyDown(e, placement)}
                  className={cn(
                    HEADER_BTN,
                    !placement.pinned && 'cursor-grab active:cursor-grabbing',
                    grabbed && 'bg-accent/15 text-accent',
                  )}
                >
                  <GripVertical className="h-3.5 w-3.5" aria-hidden />
                </button>

                <span className="label flex-1 truncate">{title}</span>

                <button
                  type="button"
                  aria-label={`Move ${title} up`}
                  disabled={placement.pinned || index === 0}
                  onClick={() => moveBy(placement.id, -1)}
                  className={HEADER_BTN}
                >
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${title} down`}
                  disabled={placement.pinned || index === openCount - 1}
                  onClick={() => moveBy(placement.id, 1)}
                  className={HEADER_BTN}
                >
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                </button>

                <button
                  type="button"
                  aria-label={placement.collapsed ? `Expand ${title}` : `Collapse ${title}`}
                  aria-expanded={!placement.collapsed}
                  onClick={() =>
                    setLayout((l) => collapseModule(l, placement.id, !placement.collapsed))
                  }
                  className={HEADER_BTN}
                >
                  {placement.collapsed ? (
                    <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <ChevronsDownUp className="h-3.5 w-3.5" aria-hidden />
                  )}
                </button>

                <button
                  type="button"
                  aria-label={placement.pinned ? `Unpin ${title}` : `Pin ${title}`}
                  aria-pressed={placement.pinned}
                  onClick={() => {
                    setLayout((l) => pinModule(l, placement.id, !placement.pinned));
                    if (!placement.pinned) setGrabbedId((g) => (g === placement.id ? null : g));
                  }}
                  className={cn(HEADER_BTN, placement.pinned && 'text-accent')}
                >
                  {placement.pinned ? (
                    <PinOff className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Pin className="h-3.5 w-3.5" aria-hidden />
                  )}
                </button>

                <button
                  type="button"
                  aria-label={`Close ${title}`}
                  disabled={placement.pinned}
                  onClick={() => {
                    setLayout((l) => closeModule(l, placement.id));
                    setGrabbedId((g) => (g === placement.id ? null : g));
                  }}
                  className={HEADER_BTN}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>

              {/* Body + See more footer (hidden while collapsed) */}
              {!placement.collapsed && (
                <>
                  <div
                    className={cn(
                      'p-2',
                      !isExpanded && 'max-h-[240px] overflow-hidden',
                    )}
                  >
                    {module.node}
                  </div>
                  <div className="border-t border-rule px-2 py-1.5">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpanded((prev) => ({
                          ...prev,
                          [placement.id]: !prev[placement.id],
                        }))
                      }
                      className="inline-flex items-center gap-1 text-2xs font-medium text-accent transition-colors hover:text-accent-bright"
                    >
                      {isExpanded ? 'See less' : 'See more'}
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" aria-hidden />
                      ) : (
                        <ChevronDown className="h-3 w-3" aria-hidden />
                      )}
                    </button>
                  </div>
                </>
              )}
            </article>

            {/* Trailing drop target after the last card. */}
            {dragId && dragId !== placement.id && index === openList.length - 1 && (
              <DropTarget onDrop={() => dropAt(dragId, openList.length)} />
            )}
          </div>
        );
      })}

      {/* Modules Panel — every closed module, restorable to its former slot. */}
      <div className="rounded-md border border-rule-strong bg-panel">
        <div className="border-b border-rule px-2 py-1.5">
          <span className="label">Modules Panel</span>
        </div>
        <div className="p-2">
          {closedList.length === 0 ? (
            <p className="text-2xs text-ink-4">All modules open.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {closedList.map((placement) => (
                <li key={placement.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-ink-2">
                    {modules[placement.id]?.title ?? placement.id}
                  </span>
                  <button
                    type="button"
                    aria-label={`Restore ${modules[placement.id]?.title ?? placement.id}`}
                    onClick={() => setLayout((l) => restoreModule(l, placement.id))}
                    className="inline-flex items-center gap-1 rounded-[4px] border border-rule px-2 py-1 text-2xs font-medium uppercase tracking-wide text-ink-2 transition-colors hover:border-rule-strong hover:text-ink"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden />
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/** A dashed 2px accent drop slot with `Drop here` centred in the accent colour. */
function DropTarget({ onDrop }: { onDrop: () => void }) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!over) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onDrop();
      }}
      className={cn(
        'flex items-center justify-center rounded-[6px] border-2 border-dashed border-accent py-3 text-2xs font-medium uppercase tracking-wide text-accent transition-colors',
        over && 'bg-accent/15',
      )}
    >
      Drop here
    </div>
  );
}
