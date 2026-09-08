import assert from 'node:assert/strict';
import test from 'node:test';

import { readApiJson } from './api-response.ts';

test('readApiJson replaces a non-JSON server failure with an actionable error', async () => {
  const response = new Response('Internal Server Error', {
    status: 500,
    headers: { 'Content-Type': 'text/plain' },
  });

  await assert.rejects(
    readApiJson(response, 'Call triage'),
    /Call triage is temporarily unavailable \(500\)\. Please try again\./,
  );
});
