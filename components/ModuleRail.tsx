'use client';

import { Activity, Bell, History, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ModuleRail — the 72px icon rail that switches the console's primary module.
 *
 * Modelled on the Dispatch AI product's left rail: icon-only actions with a
 * 10px label, the active module marked by a 2px left border in --accent. The
 * Alerts item surfaces the count of unacknowledged operational alerts.
 *
 * The rail is chrome, so it (and only it, plus the command bar) carries
 * `select-none`; the incident panel and map stay selectable so an operator can
 * copy an address or a caller number.
 */
export type ModuleId = 'monitoring' | 'alerts' | 'history' | 'forecast';

interface RailItem {
  id: ModuleId;
  label: string;
  Icon: typeof Activity;
}

const RAIL_ITEMS: RailItem[] = [
  { id: 'monitoring', label: 'Monitor', Icon: Activity },
  { id: 'alerts', label: 'Alerts', Icon: Bell },
  { id: 'history', label: 'History', Icon: History },
  { id: 'forecast', label: 'Forecast', Icon: TrendingUp },
];

export function ModuleRail({
  active,
  onSelect,
  alertCount,
}: {
  active: ModuleId;
  onSelect: (id: ModuleId) => void;
  alertCount: number;
}) {
  return (
    <nav
      aria-label="Console modules"
      className="flex h-full w-[72px] shrink-0 flex-col items-stretch gap-1 border-r border-rule-strong bg-deep py-2 select-none"
    >
      {RAIL_ITEMS.map(({ id, label, Icon }) => {
        const isActive = active === id;
        const showBadge = id === 'alerts' && alertCount > 0;
        return (
          <button
            key={id}
            type="button"
            aria-label={label}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => onSelect(id)}
            className={cn(
              'relative flex flex-col items-center gap-1 border-l-2 px-1 py-2.5 transition-colors',
              isActive
                ? 'border-accent bg-panel text-ink'
                : 'border-transparent text-ink-3 hover:bg-panel hover:text-ink-2',
            )}
          >
            <span className="relative">
              <Icon className="h-5 w-5" aria-hidden />
              {showBadge && (
                <span
                  className="tnum absolute -right-2 -top-1.5 inline-flex min-w-[15px] items-center justify-center rounded-full bg-critical px-1 text-2xs font-semibold text-ink"
                  aria-hidden
                >
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </span>
            <span className="text-2xs font-medium tracking-wide">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default ModuleRail;
