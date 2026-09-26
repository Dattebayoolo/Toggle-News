// Temporary diagnostic: why is the account overlay laid out 16,000px down the page?
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP = 'http://localhost:5173';
const CDP_PORT = 9225;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tn-diag-'));
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
    } catch { /* not up */ }
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

await evaluate("document.querySelector('.gn-login-text-btn').click()");
await wait(600);

const report = await evaluate(`(() => {
  const overlay = document.getElementById('account-modal-overlay');
  if (!overlay) return { error: 'no overlay' };

  // Does the rule even exist in the loaded stylesheets?
  const ruleFound = [...document.styleSheets].some((sheet) => {
    try { return [...sheet.cssRules].some((rule) => rule.selectorText === '.acct-overlay'); }
    catch { return false; }
  });

  // Which ancestors create a containing block for fixed positioning?
  const offenders = [];
  for (let node = overlay.parentElement; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    const problems = [];
    if (style.transform !== 'none') problems.push('transform');
    if (style.filter !== 'none') problems.push('filter');
    if (style.backdropFilter && style.backdropFilter !== 'none') problems.push('backdrop-filter');
    if (style.perspective !== 'none') problems.push('perspective');
    if (style.contain && style.contain !== 'none') problems.push('contain:' + style.contain);
    if (style.willChange && style.willChange !== 'auto') problems.push('will-change:' + style.willChange);
    if (problems.length) offenders.push(node.tagName + (node.id ? '#' + node.id : '') + (node.className ? '.' + String(node.className).split(' ').join('.') : '') + ' → ' + problems.join(','));
  }

  const style = getComputedStyle(overlay);
  const rect = overlay.getBoundingClientRect();
  return {
    ruleFound,
    overlayPosition: style.position,
    overlayDisplay: style.display,
    overlayZIndex: style.zIndex,
    overlayTop: style.top,
    overlayRect: { top: Math.round(rect.top), left: Math.round(rect.left), height: Math.round(rect.height) },
    offsetTop: overlay.offsetTop,
    offsetParent: overlay.offsetParent ? overlay.offsetParent.tagName : null,
    parent: overlay.parentElement.tagName,
    bodyPosition: getComputedStyle(document.body).position,
    offenders
  };
})()`);

console.log(JSON.stringify(report, null, 2));
socket.close();
chrome.kill();
