// My News Chat — AI-Powered Narrative Intelligence Drawer
// Ground News-style conversational media literacy assistant

let chatOpen = false;
let messages = [];
let currentStoryContext = null;

const QUICK_PROMPTS = [
  { id: 'blindspot',  text: 'What are conservative outlets saying that liberal outlets aren\'t?' },
  { id: 'disagree',  text: 'Summarize the key disagreements between outlets on this story' },
  { id: 'factcheck', text: 'Are there disputed factual claims across sources?' },
  { id: 'foreign',   text: 'How are foreign outlets covering this story differently?' },
  { id: 'context',   text: 'Give me the historical context behind this story' },
  { id: 'framing',   text: 'How does headline framing differ between Left and Right sources?' },
];

// There is no language model behind this drawer, so it writes no analysis.
// It reports only the verifiable facts Toggle News actually holds for the open
// article and states plainly that narrative analysis is unavailable.
function buildAssistantNotice() {
  const rating = currentStoryContext?.rating;
  const disclaimer =
    'This assistant is **not connected to a language model**, so it cannot compare framing, ' +
    'score factuality, or summarise disagreements. Nothing is generated here rather than a simulated answer.';

  if (!currentStoryContext) {
    return disclaimer + '\n\nOpen an article to see the verified facts Toggle News holds: publisher, bias rating, and the original source.';
  }

  const biasLine = rating?.hasLean
    ? rating.bias + (rating.rated ? '' : ' (from its feeding wire)')
    : 'Not rated — this publisher is not in our database';

  return [
    disclaimer,
    '',
    'Verified details for the open article:',
    '• **Publisher:** ' + (currentStoryContext.publisher || 'Unknown'),
    '• **Bias rating:** ' + biasLine,
    '• **Factuality:** ' + (rating?.factuality || 'Not rated'),
    '• **Original article:** ' + (currentStoryContext.articleUrl || '—')
  ].join('\n');
}



function formatAIResponse(text) {
  // Convert markdown-style bold and bullets to HTML
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, '<ul class="chat-response-list">$&</ul>')
    .replace(/^\| (.+) \|$/gm, (m, content) => {
      const cells = content.split(' | ');
      return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
    })
    .replace(/<tr>[\s\S]*?<\/tr>/g, (m) => m.startsWith('<tr><td>---') ? '' : m)
    .replace(/(<tr>[\s\S]*?<\/tr>\n?)+/g, '<table class="chat-response-table">$&</table>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.)/m, '<p>$1')
    .replace(/$/, '</p>');
}

function buildMessageHTML(messages) {
  return messages.map(msg => {
    if (msg.role === 'user') {
      return `
        <div class="chat-msg user">
          <div class="chat-bubble user">${msg.content}</div>
        </div>`;
    } else if (msg.role === 'thinking') {
      return `
        <div class="chat-msg assistant thinking">
          <div class="chat-avatar-dot"></div>
          <div class="chat-bubble assistant">
            <div class="chat-typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>`;
    } else {
      return `
        <div class="chat-msg assistant">
          <div class="chat-avatar-dot"></div>
          <div class="chat-bubble assistant">
            ${formatAIResponse(msg.content)}
          </div>
        </div>`;
    }
  }).join('');
}

function scrollToBottom() {
  const body = document.querySelector('.chat-messages-body');
  if (body) body.scrollTop = body.scrollHeight;
}

function updateChatDOM() {
  const msgContainer = document.querySelector('.chat-messages-body');
  if (!msgContainer) return;
  msgContainer.innerHTML = buildMessageHTML(messages);
  scrollToBottom();
}

function simulateResponse() {
  // No model call and no fake "typing" theatre — answer immediately and honestly.
  messages.push({ role: 'assistant', content: buildAssistantNotice() });
  updateChatDOM();
}

export function openNewsChatDrawer(storyContext = null) {
  currentStoryContext = storyContext;
  chatOpen = true;
  if (messages.length === 0) {
    messages.push({ role: 'assistant', content: buildAssistantNotice() });
  }
  renderDrawer();
}

export function closeNewsChatDrawer() {
  chatOpen = false;
  const drawer = document.getElementById('news-chat-drawer');
  if (drawer) {
    drawer.classList.remove('open');
    setTimeout(() => drawer.remove(), 300);
  }
}

export function handleChatClick(e) {
  const action = e.target.closest('[data-chat-action]')?.dataset?.chatAction;
  if (!action) return false;

  switch (action) {
    case 'close-chat':
      closeNewsChatDrawer();
      return true;

    case 'quick-prompt': {
      const promptId = e.target.closest('[data-prompt-id]')?.dataset?.promptId;
      const promptText = e.target.closest('[data-prompt-id]')?.dataset?.promptText;
      if (!promptId || !promptText) return false;
      messages.push({ role: 'user', content: promptText });
      updateChatDOM();
      simulateResponse(promptId);
      return true;
    }

    case 'send-message': {
      const input = document.querySelector('.chat-input-field');
      if (!input || !input.value.trim()) return false;
      const text = input.value.trim();
      input.value = '';
      messages.push({ role: 'user', content: text });
      updateChatDOM();
      simulateResponse('default');
      return true;
    }

    case 'clear-chat': {
      messages = [];
      if (currentStoryContext) {
        messages.push({
          role: 'assistant',
          content: `Chat cleared. I'm still analyzing **${currentStoryContext.sourceCount}+ sources** on this story. What would you like to explore?`,
        });
      }
      updateChatDOM();
      return true;
    }
  }
  return false;
}

function renderDrawer() {
  closeNewsChatDrawer();

  const drawer = document.createElement('div');
  drawer.id = 'news-chat-drawer';
  drawer.className = 'news-chat-drawer';
  drawer.innerHTML = `
    <div class="chat-drawer-overlay" data-chat-action="close-chat"></div>
    <div class="chat-drawer-panel">

      <!-- Header -->
      <div class="chat-header">
        <div class="chat-header-left">
          <div class="chat-ai-avatar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <div>
            <h3 class="chat-title">My News Chat</h3>
            <span class="chat-subtitle">Assistant not connected${currentStoryContext?.publisher ? ' · ' + currentStoryContext.publisher : ''}</span>
          </div>
        </div>
        <div class="chat-header-actions">
          <button class="chat-icon-btn" data-chat-action="clear-chat" title="Clear chat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 .49-3.74"></path>
            </svg>
          </button>
          <button class="chat-icon-btn" data-chat-action="close-chat" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div class="chat-messages-body">
        ${buildMessageHTML(messages)}
      </div>

      <!-- Quick Prompts -->
      <div class="chat-quick-prompts">
        <span class="chat-prompts-label">Quick prompts</span>
        <div class="chat-prompt-chips">
          ${QUICK_PROMPTS.map(p => `
            <button class="chat-prompt-chip" 
                    data-chat-action="quick-prompt" 
                    data-prompt-id="${p.id}"
                    data-prompt-text="${p.text.replace(/"/g, '&quot;')}">
              ${p.text}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Input Row -->
      <div class="chat-input-row">
        <input type="text" 
               class="chat-input-field" 
               placeholder="Ask about coverage, bias, or facts…"
               autocomplete="off" />
        <button class="chat-send-btn" data-chat-action="send-message" title="Send">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>

    </div>
  `;

  // Overlay click closes
  drawer.querySelector('.chat-drawer-overlay').addEventListener('click', () => closeNewsChatDrawer());

  // Enter key sends message
  drawer.querySelector('.chat-input-field').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = e.target.value.trim();
      if (!text) return;
      e.target.value = '';
      messages.push({ role: 'user', content: text });
      updateChatDOM();
      simulateResponse('default');
    }
  });

  document.body.appendChild(drawer);
  requestAnimationFrame(() => drawer.classList.add('open'));
  scrollToBottom();
}
