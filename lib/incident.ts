/**
 * @module incident
 * @description Shared, call-derived display helpers used across the console
 *              (queue, kanban, history, map, and the detail page).
 *
 *              A NORMAL project module: it uses ordinary imports and carries no
 *              `node --test` suite. It exists because these helpers were
 *              previously copy-pasted into four or five views, and the copies
 *              had already drifted — the map read a low incident as `P4` while
 *              every other view read `P3`, and an early `distressOf` returned a
 *              number for a never-measured call. One definition each, here, is
 *              what stops that recurring.
 */

import type { EmergencyCall } from '@/lib/types';
import type { ChipTone } from '@/components/ui/panel';

/** Severity → the design system's three-tone chip scale. */
export function severityTone(severity?: string): ChipTone {
  if (severity === 'critical') return 'critical';
  if (severity === 'high') return 'mild';
  if (severity === 'medium' || severity === 'low') return 'safe';
  return 'neutral';
}

/** The priority code a call carries, or one derived from its severity. */
export function priorityCode(call: EmergencyCall): string {
  return (
    call.priority_code ||
    (call.severity === 'critical' ? 'P1' : call.severity === 'high' ? 'P2' : 'P3')
  );
}

/**
 * The measured distress reading, or null when prosody was never captured. Zero
 * is a real measurement; absence is a coverage gap. Consumers render the gap as
 * an em-dash (or draw no distress ring) rather than inventing a value.
 */
export function distressOf(call: EmergencyCall): number | null {
  const level = call.ai_triage?.emotion_analysis?.distress_level;
  return typeof level === 'number' ? level : null;
}

/**
 * Where this call's grade came from. Only a call carrying a measured prosody
 * reading is attributed to the live 112 Pulse voice station; a seeded or
 * keyword-graded call is not dressed up as one.
 */
export function triageSource(call: EmergencyCall): string {
  if (call.ai_triage?.emotion_analysis?.distress_level != null) return '112 Pulse voice';
  if (call.ai_confidence != null || call.ai_triage?.confidence != null) return 'AI triage';
  return 'Manual intake';
}

/** The recommended responding units drawn from real fields, never invented. */
export function recommendedUnits(call: EmergencyCall): string[] {
  if (call.recommended_units?.length) return call.recommended_units;
  const rec = call.ai_recommendation;
  if (rec && typeof rec === 'object') {
    const units = [rec.primary_unit, ...(rec.support_units ?? [])].filter(Boolean) as string[];
    if (units.length) return units;
  }
  return [];
}

/** A 0–1 fraction as a whole-percent string, or null when absent. */
export function confidencePercent(value?: number): string | null {
  return typeof value === 'number' ? `${Math.round(value * 100)}%` : null;
}
