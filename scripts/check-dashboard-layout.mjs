import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const debugPort = 9333;
const profilePath = await mkdtemp(join(tmpdir(), 'pulse112-layout-'));

const edge = spawn(
  edgePath,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-allow-origins=*',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profilePath}`,
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);

let edgeErrorOutput = '';
edge.stderr.on('data', (chunk) => {
  edgeErrorOutput += chunk.toString();
});

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function getDebugTarget() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === 'page');
      if (page) return page;
    } catch {
      // Edge has not opened its debugging port yet.
    }
    await delay(100);
  }
  throw new Error(`Could not connect to headless Edge: ${edgeErrorOutput.trim()}`);
}

const target = await getDebugTarget();
const socket = new WebSocket(target.webSocketDebuggerUrl);
let nextCommandId = 1;
const pendingCommands = new Map();

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const command = pendingCommands.get(message.id);
  if (!command) return;
  pendingCommands.delete(message.id);
  if (message.error) command.reject(new Error(message.error.message));
  else command.resolve(message.result);
});

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

function send(method, params = {}) {
  const id = nextCommandId;
  nextCommandId += 1;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pendingCommands.set(id, { resolve, reject }));
}

async function inspectViewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', { url: 'http://127.0.0.1:3000/dashboard' });
  await delay(2500);

  const evaluation = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const header = document.querySelector('body > div > header');
      const primary = header?.children[0];
      const actions = header?.children[1];
      const secondary = header?.nextElementSibling;
      if (!header || !primary || !actions || !secondary) {
        return { error: 'Dashboard chrome landmarks are missing' };
      }

      const headerRect = header.getBoundingClientRect();
      const primaryRect = primary.getBoundingClientRect();
      const actionsRect = actions.getBoundingClientRect();
      const secondaryRect = secondary.getBoundingClientRect();
      const visible = (rect) => rect.width > 0 && rect.height > 0;

      return {
        headerOverflow: header.scrollWidth > header.clientWidth + 1,
        secondaryOverflow: secondary.scrollWidth > secondary.clientWidth + 1,
        horizontalCollision:
          visible(primaryRect) && visible(actionsRect) && primaryRect.right > actionsRect.left + 1,
        verticalClipping:
          primaryRect.top < headerRect.top - 1 ||
          primaryRect.bottom > headerRect.bottom + 1 ||
          actionsRect.top < headerRect.top - 1 ||
          actionsRect.bottom > headerRect.bottom + 1,
        headerHeight: Math.round(headerRect.height),
        secondaryHeight: Math.round(secondaryRect.height),
      };
    })()`,
  });

  return evaluation.result.value;
}

try {
  for (const viewport of [
    { width: 1918, height: 916 },
    { width: 1536, height: 900 },
    { width: 1280, height: 800 },
    { width: 768, height: 900 },
  ]) {
    const result = await inspectViewport(viewport.width, viewport.height);
    if (result.error) throw new Error(result.error);
    if (result.headerOverflow || result.secondaryOverflow || result.horizontalCollision || result.verticalClipping) {
      throw new Error(`${viewport.width}px layout failed: ${JSON.stringify(result)}`);
    }
    console.log(`${viewport.width}px layout passed: ${JSON.stringify(result)}`);
  }
} finally {
  await send('Browser.close').catch(() => undefined);
  await new Promise((resolve) => {
    if (edge.exitCode !== null) resolve();
    else edge.once('exit', resolve);
  });
  socket.close();
  await rm(profilePath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
