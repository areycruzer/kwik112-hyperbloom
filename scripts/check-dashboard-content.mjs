import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const checks = [
  {
    file: 'app/dashboard/page.tsx',
    snippets: [
      'India 112 Control',
      'Language',
      'Help',
      'Contact',
      'Operator-first dispatch workflow',
      'Live Calls',
      'Map',
      'Units',
      'Dispatch Queue',
      'Analytics',
      'Audit Logs',
      'Accessibility',
      'High contrast',
      'Incident Command Panel',
      'Verified location',
      'Missing critical questions',
      'Recommended units',
      'Nearest unit ETA',
      'Override reason',
    ],
  },
  {
    file: 'components/IncidentWorkflowOverlay.tsx',
    snippets: [
      'Authorize selected actions',
      'Override note',
      'AI rationale',
      'Human approval required',
    ],
  },
];

const failures = [];
const userFacingFiles = [
  'app/dashboard/page.tsx',
  'app/dashboard/calls/[id]/page.tsx',
  'components/CallHistoryOverlay.tsx',
  'components/DataManagementDashboard.tsx',
  'components/EmergencyMap.tsx',
  'components/IncidentKanbanBoard.tsx',
  'components/IncidentWorkflowOverlay.tsx',
  'components/MiniLocationMap.tsx',
  'components/StartEmergencyCall.tsx',
];
const textSymbols = ['📍', '✅', '⏱', '✓', '→', '—', '›'];

for (const check of checks) {
  const contents = readFileSync(join(root, check.file), 'utf8');
  for (const snippet of check.snippets) {
    if (!contents.includes(snippet)) {
      failures.push(`${check.file} is missing "${snippet}"`);
    }
  }
}

for (const file of userFacingFiles) {
  const contents = readFileSync(join(root, file), 'utf8');
  for (const symbol of textSymbols) {
    if (contents.includes(symbol)) {
      failures.push(`${file} still contains text symbol "${symbol}"`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Dashboard content checks passed');
