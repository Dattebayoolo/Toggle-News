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

// Simulated AI responses keyed by prompt
const AI_RESPONSES = {
  blindspot: `**Right-leaning outlets** (Fox News, NY Post, Washington Times) are emphasizing:
• The national security angle — framing the AI Force as a necessary deterrent against China's "military AI supremacy."
• Economic benefits — citing projected defense contractor job creation and semiconductor supply chain investment.
• Criticism of the regulatory approach by Democrats as "bureaucratic overreach that will slow American innovation."

**Left-leaning outlets** (CNN, MSNBC, The Guardian) are largely *not* discussing:
• The specific $48B proposed AI Force budget allocation.
• The role of private contractors like Palantir and Anduril in shaping the policy.
• China's counter-reaction and what their official state media (Xinhua) reported.`,

  disagree: `**Key points of factual dispute across outlets:**

1. **Who is the "AI Czar"?** — Right-leaning sources say David Sacks *will* be appointed; left-leaning sources report he stepped back and another name is in consideration.

2. **Scope of the AI Force** — Conservative outlets describe it as a new "branch-equivalent agency." Progressive outlets frame it as a rebranded advisory board with no enforcement authority.

3. **China threat assessment** — Sources differ sharply on whether China is ahead of the US in military AI. Center outlets cite RAND Corporation data. Right-leaning outlets cite government assessments. Left-leaning outlets emphasize the report's political motivations.`,

  factcheck: `**Disputed or unverified claims identified across ${Math.floor(Math.random() * 6) + 4} sources:**

• **Claim:** "China has surpassed the US in AI military capability."
  → *Status: DISPUTED.* Partially supported by DIA assessment but contradicted by CSIS and MIT Lincoln Lab research.

• **Claim:** "Trump's AI Force will operate independently of Congress."
  → *Status: UNVERIFIED.* No official executive order has been published yet. Legislative authority details are pending.

• **Claim:** "This is modelled on Space Force."
  → *Status: MOSTLY TRUE.* Administration officials confirmed the structural inspiration, but statutory framework differs significantly.`,

  foreign: `**International coverage breakdown:**

🇬🇧 **UK outlets** (BBC, The Guardian, The Telegraph) — Focus on NATO implications and whether the AI Force signals unilateral US action outside alliance frameworks.

🇩🇪 **German outlets** (Der Spiegel, DW) — Emphasize fears of an AI arms race and call for an EU-equivalent coordinated response.

🇨🇳 **Chinese state media** (Xinhua, Global Times) — Characterize the announcement as "aggressive provocation" and "technological hegemony dressed as security."

🇷🇺 **Russian state media** (RT, TASS) — Frame the AI Force as evidence of "US imperial overreach" while simultaneously touting Russia's own military AI programs.

🇯🇵 **Japanese outlets** (Nikkei Asia) — Cover semiconductor supply chain implications and what AI Force procurement means for TSMC and allied chip manufacturers.`,

  context: `**Historical context:**

The AI Force proposal follows a decade of escalating **tech cold war dynamics** between the US and China:

• **2017** — China announced its *New Generation AI Development Plan*, targeting AI supremacy by 2030.
• **2018** — US Congress created the National Security Commission on AI (NSCAI) to assess competitive risks.
• **2021** — NSCAI Final Report warned: *"The US is not prepared for the coming era of AI-powered competition."*
• **2022** — Congress passed the CHIPS Act ($52B) to rebuild domestic semiconductor manufacturing.
• **2023–24** — Biden administration export controls on advanced chips to China.
• **2025** — Trump administration announces AI Force as the operational military arm of this national AI strategy.

The AI Force concept has historical precedent: **Space Force** (2019) similarly carved out a specialized domain from the Air Force. Critics warn the same growing pains — budget battles, talent recruitment, and civil-military integration — will repeat.`,

  framing: `**Headline framing analysis — Left vs. Right:**

| Outlet (Bias) | Headline Framing |
|---|---|
| *The Guardian* (Left) | "Trump's AI Force: Militarizing technology without guardrails" |
| *MSNBC* (Left) | "Experts warn AI Force could entrench surveillance state" |
| *Reuters* (Center) | "Trump announces AI Force, appoints czar to lead military AI coordination" |
| *The Hill* (Center) | "Trump proposes AI Force amid rogue-agent fears but rejects new regulations" |
| *Fox News* (Right) | "Trump launches AI Force — bold move to keep America ahead of China" |
| *NY Post* (Right) | "Trump creates AI Force to dominate China in tech cold war" |

**Pattern observed:** Left-leaning framing emphasizes *risk and accountability*. Right-leaning framing emphasizes *strength and national competition*. Center framing describes *the action* with minimal normative weight.`,

  default: `I'm analyzing ${Math.floor(Math.random() * 200) + 50} sources across the political spectrum on this story. Based on the available coverage, there are significant divergences in framing, emphasis, and factual claims. Please select one of the quick-prompt options above or ask a specific question about this story's media coverage.`,
};

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

function simulateResponse(promptKey) {
  // Show typing indicator
  messages.push({ role: 'thinking', content: '' });
  updateChatDOM();

  const delay = 900 + Math.random() * 600;
  setTimeout(() => {
    messages.pop(); // remove thinking bubble
    const responseText = AI_RESPONSES[promptKey] || AI_RESPONSES.default;
    messages.push({ role: 'assistant', content: responseText });
    updateChatDOM();
  }, delay);
}

export function openNewsChatDrawer(storyContext = null) {
  currentStoryContext = storyContext;
  chatOpen = true;
  if (messages.length === 0) {
    messages.push({
      role: 'assistant',
      content: storyContext
        ? `I'm analyzing **${storyContext.sourceCount}+ sources** across the Left, Center, and Right for this story. I can help you understand how different outlets are framing the narrative, identify blindspots, and fact-check key claims.\n\nWhat would you like to know?`
        : `I'm your AI media literacy assistant. I can help you analyze news stories, identify coverage blindspots, compare how Left and Right outlets frame the same events, and fact-check key claims.\n\nOpen a story and ask me anything.`,
    });
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
            <span class="chat-subtitle">AI-powered media analysis${currentStoryContext ? ' · ' + currentStoryContext.sourceCount + ' sources' : ''}</span>
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
