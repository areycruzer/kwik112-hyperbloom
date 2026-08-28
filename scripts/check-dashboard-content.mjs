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

for (const check of checks) {
  const contents = readFileSync(join(root, check.file), 'utf8');
  for (const snippet of check.snippets) {
    if (!contents.includes(snippet)) {
      failures.push(`${check.file} is missing "${snippet}"`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Dashboard content checks passed');
