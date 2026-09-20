// Vantage Audio Player — Persistent floating podcast player bar
// Simulates podcast audio playback with chapters, speed control, and scrubber

let playerState = {
  isOpen: false,
  isPlaying: false,
  currentTime: 0,        // seconds
  duration: 1365,        // 22:45 total
  playbackRate: 1,
  episodeTitle: 'Global National: Oct. 17, 2025 • Liberals to propose major labour code changes',
  episodeSource: 'Global National',
  episodeSourceBg: '#bb1919',
  episodeTag: 'Broadcast TV Show',
  isMinimized: false,
  timerId: null,
};

// Chapter timestamps (seconds → label)
const CHAPTERS = [
  { time: 0,   label: 'Intro — AI Force Announcement' },
  { time: 134, label: 'David Sacks Adviser Role' },
  { time: 318, label: 'Google & China Data Center Race' },
  { time: 512, label: 'Congressional Guardrail Debate' },
  { time: 748, label: 'Treasury Secretary Bessent Briefing' },
  { time: 1050, label: 'Global Semiconductor Supply Chain' },
];

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function getCurrentChapter() {
  let chapter = CHAPTERS[0];
  for (const c of CHAPTERS) {
    if (playerState.currentTime >= c.time) chapter = c;
    else break;
  }
  return chapter;
}

function tick() {
  if (!playerState.isPlaying) return;
  playerState.currentTime += playerState.playbackRate;
  if (playerState.currentTime >= playerState.duration) {
    playerState.currentTime = playerState.duration;
    playerState.isPlaying = false;
  }
  updatePlayerDOM();
}

function updatePlayerDOM() {
  const bar = document.getElementById('vantage-audio-player');
  if (!bar) return;

  const progress = playerState.currentTime / playerState.duration;
  const progressPct = (progress * 100).toFixed(2);
  const chapter = getCurrentChapter();

  const scrubber = bar.querySelector('.ap-scrubber-fill');
  if (scrubber) scrubber.style.width = `${progressPct}%`;

  const timeEl = bar.querySelector('.ap-time-current');
  if (timeEl) timeEl.textContent = formatTime(playerState.currentTime);

  const playBtn = bar.querySelector('.ap-play-btn');
  if (playBtn) {
    playBtn.innerHTML = playerState.isPlaying
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
           <rect x="6" y="4" width="4" height="16" rx="1"/>
           <rect x="14" y="4" width="4" height="16" rx="1"/>
         </svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
           <polygon points="5,3 19,12 5,21"/>
         </svg>`;
  }

  const waveEls = bar.querySelectorAll('.ap-wave-bar');
  waveEls.forEach(el => {
    el.classList.toggle('playing', playerState.isPlaying);
  });

  const chapterEl = bar.querySelector('.ap-chapter-label');
  if (chapterEl) chapterEl.textContent = chapter.label;
}

export function openAudioPlayer(opts = {}) {
  if (opts.title) playerState.episodeTitle = opts.title;
  if (opts.source) playerState.episodeSource = opts.source;
  if (opts.sourceBg) playerState.episodeSourceBg = opts.sourceBg;
  if (opts.seekTo !== undefined) {
    playerState.currentTime = Math.min(opts.seekTo, playerState.duration);
  }
  playerState.isOpen = true;
  playerState.isMinimized = false;
  playerState.isPlaying = true;
  renderPlayer();
  startTicker();
}

export function closeAudioPlayer() {
  stopTicker();
  playerState.isOpen = false;
  playerState.isPlaying = false;
  const bar = document.getElementById('vantage-audio-player');
  if (bar) bar.remove();
}

function startTicker() {
  stopTicker();
  playerState.timerId = setInterval(tick, 1000);
}

function stopTicker() {
  if (playerState.timerId) {
    clearInterval(playerState.timerId);
    playerState.timerId = null;
  }
}

export function handleAudioPlayerClick(e) {
  const action = e.target.closest('[data-ap-action]')?.dataset?.apAction;
  if (!action) return false;

  switch (action) {
    case 'play-pause':
      playerState.isPlaying = !playerState.isPlaying;
      if (playerState.isPlaying) startTicker();
      else stopTicker();
      updatePlayerDOM();
      return true;

    case 'rewind':
      playerState.currentTime = Math.max(0, playerState.currentTime - 15);
      updatePlayerDOM();
      return true;

    case 'forward':
      playerState.currentTime = Math.min(playerState.duration, playerState.currentTime + 30);
      updatePlayerDOM();
      return true;

    case 'speed':
      const rates = [1, 1.25, 1.5, 2];
      const idx = rates.indexOf(playerState.playbackRate);
      playerState.playbackRate = rates[(idx + 1) % rates.length];
      const speedEl = document.querySelector('.ap-speed-btn');
      if (speedEl) speedEl.textContent = `${playerState.playbackRate}×`;
      return true;

    case 'minimize':
      playerState.isMinimized = !playerState.isMinimized;
      const bar = document.getElementById('vantage-audio-player');
      if (bar) bar.classList.toggle('minimized', playerState.isMinimized);
      return true;

    case 'close':
      closeAudioPlayer();
      return true;

    case 'scrub': {
      const track = e.target.closest('.ap-scrubber-track');
      if (!track) return false;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      playerState.currentTime = Math.round(ratio * playerState.duration);
      updatePlayerDOM();
      return true;
    }
  }
  return false;
}

export function renderPlayer() {
  // Remove existing player if any
  const existing = document.getElementById('vantage-audio-player');
  if (existing) existing.remove();

  if (!playerState.isOpen) return;

  const chapter = getCurrentChapter();
  const progress = (playerState.currentTime / playerState.duration * 100).toFixed(2);
  const waveCount = 7;

  const bar = document.createElement('div');
  bar.id = 'vantage-audio-player';
  bar.className = 'vantage-audio-player-bar';
  bar.innerHTML = `
    <div class="ap-chapter-strip">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      <span class="ap-chapter-label">${chapter.label}</span>
    </div>

    <div class="ap-main-row">
      <!-- Left: Outlet badge + meta -->
      <div class="ap-outlet-block">
        <div class="ap-outlet-avatar" style="background-color:${playerState.episodeSourceBg}">
          ${playerState.episodeSource.slice(0, 2).toUpperCase()}
        </div>
        <div class="ap-outlet-meta">
          <span class="ap-outlet-name">${playerState.episodeSource}</span>
          <span class="ap-episode-title">${playerState.episodeTitle}</span>
        </div>
      </div>

      <!-- Center: Controls + scrubber -->
      <div class="ap-controls-block">
        <div class="ap-button-row">
          <button class="ap-ctrl-btn" data-ap-action="rewind" title="Back 15s">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 .49-3.74"></path>
              <text x="7" y="14" font-size="6" fill="currentColor" stroke="none" font-weight="700">15</text>
            </svg>
          </button>

          <button class="ap-play-btn" data-ap-action="play-pause" title="Play / Pause">
            ${playerState.isPlaying
              ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`
              : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`
            }
          </button>

          <button class="ap-ctrl-btn" data-ap-action="forward" title="Forward 30s">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-.49-3.74"></path>
              <text x="7" y="14" font-size="5.5" fill="currentColor" stroke="none" font-weight="700">30</text>
            </svg>
          </button>

          <button class="ap-speed-btn" data-ap-action="speed" title="Playback speed">
            ${playerState.playbackRate}×
          </button>
        </div>

        <div class="ap-scrubber-row">
          <span class="ap-time-current">${formatTime(playerState.currentTime)}</span>
          <div class="ap-scrubber-track" data-ap-action="scrub">
            <div class="ap-scrubber-fill" style="width:${progress}%"></div>
            <div class="ap-scrubber-thumb" style="left:${progress}%"></div>
          </div>
          <span class="ap-time-total">${formatTime(playerState.duration)}</span>
        </div>
      </div>

      <!-- Right: Waveform + Window controls -->
      <div class="ap-right-block">
        <div class="ap-waveform">
          ${Array.from({ length: waveCount }, (_, i) => `
            <div class="ap-wave-bar ${playerState.isPlaying ? 'playing' : ''}" style="animation-delay:${i * 0.09}s"></div>
          `).join('')}
        </div>
        <div class="ap-window-btns">
          <button class="ap-icon-btn" data-ap-action="minimize" title="Minimize">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button class="ap-icon-btn" data-ap-action="close" title="Close player">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(bar);

  // Scrubber click
  bar.querySelector('.ap-scrubber-track').addEventListener('click', (e) => {
    handleAudioPlayerClick(e);
  });

  // Animate in
  requestAnimationFrame(() => bar.classList.add('visible'));
}
