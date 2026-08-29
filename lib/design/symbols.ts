/**
 * @module design/symbols
 * @description Incident and unit symbols, emitted as SVG strings so the same
 *              function can feed both React components and Leaflet `divIcon`,
 *              which only accepts markup. Incidents are filled triangles in the
 *              severity colour; units are filled circles in the service colour.
 *
 *              Self-contained on purpose: it imports nothing from the rest of
 *              the project so `node --test` can run it without a resolver.
 */

export type SymbolKind = 'incident' | 'unit';
export type IncidentGlyph = 'fire' | 'medical' | 'crime' | 'traffic' | 'utility' | 'unknown';
export type UnitService = 'police' | 'fire' | 'ems';

export interface SymbolSpec {
  kind: SymbolKind;
  glyph: IncidentGlyph | UnitService;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  service?: UnitService;
  /** 0-100 from 112 Pulse prosody. `null`/`undefined` means never measured. */
  distress?: number | null;
  label?: string;
  size?: number;
  selected?: boolean;
}

// Severity collapses onto the product's three named levels: P1 → CRITICAL,
// P2 → MILD, P3/P4 → SAFE.
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#F40000',
  high: '#FABC1F',
  medium: '#47FF85',
  low: '#47FF85',
};

const SERVICE_COLORS: Record<UnitService, string> = {
  police: '#69D2FF',
  fire: '#F40000',
  ems: '#47FF85',
};

/** Ungraded / unknown — neutral --ink-3, never a fabricated severity. */
const UNKNOWN = '#9F9F9F';

export function severityColor(severity?: string): string {
  if (!severity) return UNKNOWN;
  return SEVERITY_COLORS[severity] ?? UNKNOWN;
}

/** @description Escape text bound for an SVG/HTML string context. */
function esc(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** @description Calm to peak distress: safe green -> mild amber -> signal red. */
export function distressColor(level: number): string {
  const l = Math.min(100, Math.max(0, level));
  if (l <= 50) return mix('#47FF85', '#FABC1F', l / 50);
  return mix('#FABC1F', '#F40000', (l - 50) / 50);
}

export function glyphForIncidentType(incidentType?: string): IncidentGlyph {
  if (!incidentType) return 'unknown';
  const t = incidentType.toLowerCase();
  if (t.includes('fire')) return 'fire';
  if (t.includes('medical') || t.includes('cardiac') || t.includes('health')) return 'medical';
  if (t.includes('accident') || t.includes('traffic') || t.includes('collision')) return 'traffic';
  if (t.includes('crime') || t.includes('violen') || t.includes('robbery')) return 'crime';
  if (t.includes('public_safety') || t.includes('utility') || t.includes('civic')) return 'utility';
  return 'unknown';
}

/** Inner glyph paths, drawn in a 24x24 user space centred on (12,12). */
const GLYPH_PATHS: Record<string, string> = {
  fire: 'M12 6c1.5 2.2 3.4 3.3 3.4 5.6a3.4 3.4 0 0 1-6.8 0C8.6 9.3 10.5 8.2 12 6z',
  medical: 'M11 7h2v3h3v2h-3v3h-2v-3H8v-2h3V7z',
  crime: 'M8 8l8 8M16 8l-8 8',
  traffic: 'M8 14h8M9 14v-3l1.5-2h3L15 11v3M9.5 16v-1M14.5 16v-1',
  utility: 'M12 7v5M12 15h.01M8 16h8',
  unknown: 'M10 10a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9v.4M12 16h.01',
  police: 'M12 7l3 1.5v3c0 2-1.3 3.4-3 4-1.7-.6-3-2-3-4v-3L12 7z',
  ems: 'M11 8h2v2h2v2h-2v2h-2v-2H9v-2h2V8z',
};

/**
 * @description Build an incident or unit symbol as an SVG string.
 *              Frame shape encodes entity kind (filled triangle = incident,
 *              filled circle = unit), fill encodes severity or service, and the
 *              inner glyph encodes type. When a `label` is given it is set beside
 *              the marker in --ink on a dark plate. A distress ring is drawn only
 *              when prosody exists; selection adds a 1px accent ring.
 */
export function buildSymbol(spec: SymbolSpec): string {
  const size = spec.size ?? 28;
  const color =
    spec.kind === 'unit'
      ? SERVICE_COLORS[spec.service ?? (spec.glyph as UnitService)] ?? UNKNOWN
      : severityColor(spec.severity);

  const hasDistress = typeof spec.distress === 'number';
  const glyph = GLYPH_PATHS[spec.glyph] ?? GLYPH_PATHS.unknown;

  // Incidents are filled triangles (point up); units are filled circles.
  const frame =
    spec.kind === 'incident'
      ? `<polygon points="12,3 21,20 3,20" fill="${color}" stroke="${color}" stroke-width="1" />`
      : `<circle cx="12" cy="12" r="9" fill="${color}" stroke="${color}" stroke-width="1" />`;

  // Distress ring: an arc swept proportional to the measurement.
  let ring = '';
  if (hasDistress) {
    const level = Math.min(100, Math.max(0, spec.distress as number));
    const r = 11;
    const circumference = 2 * Math.PI * r;
    const dash = (level / 100) * circumference;
    ring =
      `<circle cx="12" cy="12" r="${r}" fill="none" stroke="${distressColor(level)}" ` +
      `stroke-width="1.5" stroke-linecap="butt" ` +
      `stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}" ` +
      `transform="rotate(-90 12 12)" opacity="0.9" />`;
  }

  // Selection is a 1px --accent ring, never a scale transform.
  const selection = spec.selected
    ? `<circle cx="12" cy="12" r="11.25" fill="none" stroke="#69D2FF" stroke-width="1" />`
    : '';

  // Name label beside the marker, in --ink on a dark plate.
  let plate = '';
  let viewW = 24;
  if (spec.label) {
    const plateW = Math.max(24, spec.label.length * 6 + 12);
    viewW = 28 + plateW;
    plate =
      `<rect x="28" y="6" width="${plateW}" height="12" rx="2" fill="#171717" stroke="#3B3B3B" stroke-width="1" />` +
      `<text x="${28 + plateW / 2}" y="15" text-anchor="middle" font-size="9" font-weight="500" fill="#F2F2F2">${esc(spec.label)}</text>`;
  }

  const title = spec.label ? `<title>${esc(spec.label)}</title>` : '';
  const width = Math.round(size * (viewW / 24));

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewW} 24" width="${width}" height="${size}" ` +
    `data-kind="${esc(spec.kind)}"${hasDistress ? ` data-distress="${Math.round(spec.distress as number)}"` : ''} ` +
    `role="img" aria-label="${esc(spec.label ?? spec.glyph)}">` +
    title +
    selection +
    ring +
    frame +
    `<path d="${glyph}" fill="none" stroke="#1E1E1E" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />` +
    plate +
    `</svg>`
  );
}
