// Temporary probe: narrow widths + short viewports, and is the modal CARD visible?
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP = 'http://localhost:5173';
const CDP_PORT = 9224;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tn-probe-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profileDir}`, 'about:blank'
], { stdio: 'ignore' });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function debuggerUrl() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const info = await (await fetch(`http://localhost:${CDP_PORT}/json/version`)).json();
      if (info.webSocketDebuggerUrl) return info.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await wait(250);
  }
  throw new Error('no debugging endpoint');
}

const socket = new WebSocket(await debuggerUrl());
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });

let nextId = 1;
const pending = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
};

function send(method, params = {}, sessionId) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Runtime.enable', {}, sessionId);
await send('Page.enable', {}, sessionId);
await send('Page.navigate', { url: APP }, sessionId);
await wait(3500);

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

async function probe(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }, sessionId);
  await wait(350);

  const button = await evaluate(`(() => {
    const el = document.querySelector('.gn-login-text-btn');
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);
    const top = document.elementFromPoint(x, y);
    return {
      left: Math.round(r.left), right: Math.round(r.right),
      visible: r.left >= 0 && r.right <= window.innerWidth && r.top >= 0 && r.bottom <= window.innerHeight,
      topmost: top ? top.className || top.tagName : null,
      hits: top === el || (top ? el.contains(top) : false),
      x, y
    };
  })()`);

  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: button.x, y: button.y, button: 'left', clickCount: 1, pointerType: 'mouse' }, sessionId);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: button.x, y: button.y, button: 'left', clickCount: 1, pointerType: 'mouse' }, sessionId);
  await wait(350);

  const modal = await evaluate(`(() => {
    const overlay = document.getElementById('account-modal-overlay');
    if (!overlay) return { opened: false };
    const card = overlay.querySelector('.acct-modal');
    const r = card.getBoundingClientRect();
    const button = overlay.querySelector('[data-acct-sso="signin"]');
    const br = button ? button.getBoundingClientRect() : null;
    return {
      opened: true,
      cardTop: Math.round(r.top), cardBottom: Math.round(r.bottom), cardHeight: Math.round(r.height),
      // A card is reachable when its top is inside the viewport (the overlay scrolls).
      cardReachable: r.top >= -2 && r.bottom <= window.innerHeight + 2,
      cardPartiallyAbove: r.top < -2,
      handoffButtonVisible: br ? br.top >= 0 && br.bottom <= window.innerHeight : false,
      overlayScroll: overlay.scrollHeight > overlay.clientHeight,
      viewportHeight: window.innerHeight
    };
  })()`);
  await evaluate("(() => { const o = document.getElementById('account-modal-overlay'); if (o) o.remove(); })()");

  return { button, modal };
}

console.log('width x height → button visible/hit  |  modal opened  |  card reachable (top..bottom of viewport h)');
for (const [width, height] of [[1440, 900], [762, 800], [762, 484], [480, 800], [414, 736], [380, 640], [1280, 600]]) {
  const { button, modal } = await probe(width, height);
  console.log(
    `${width}x${height} → visible:${button.visible} hit:${button.hits} (topmost ${button.topmost}) | ` +
    `opened:${modal.opened} cardReachable:${modal.cardReachable} card:${modal.cardTop}..${modal.cardBottom} ` +
    `(vp ${modal.viewportHeight}) handoff:${modal.handoffButtonVisible} scroll:${modal.overlayScroll}`
  );
}

socket.close();
chrome.kill();
