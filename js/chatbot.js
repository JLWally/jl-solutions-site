(() => {
  const CONFIG = {
    endpoint:
      document.currentScript?.dataset?.endpoint ||
      "/.netlify/functions/chatbot",
    brand: "Wattson",
    subtitle: "Demos and self-serve tools work without a call. Ask anything or use the shortcuts below.",
    /** Shown when there is no chat history yet (not saved to storage). */
    welcomeMarkdown:
      "Hi, I am Wattson. You can [explore the interactive demo](/demo.html) or [try document extraction](/services/document-extraction-demo.html). For a personalized walkthrough or open-ended questions, use [Book a Free Call](/book-consultation.html) or [send a message](/contact.html). What would you like to do?",
    placeholder: "Ask about demos, services, or next steps...",
    quickPrompts: [
      "Show me the product demo",
      "I want to pay an invoice or deposit",
      "What does JL Solutions help with?"
    ],
    ctaLinks: [
      { label: "Interactive demo", href: "/demo.html" },
      { label: "Book a Free Call", href: "/book-consultation.html" },
      { label: "Contact", href: "/contact.html" }
    ],
    maxTurnsSaved: 12
  };

  const escapeHtml = s =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const SAFE_PATH = /^\/[a-zA-Z0-9/_\-.]+$/;

  const renderAssistantHtml = text => {
    if (!text) return "";
    const parts = [];
    let last = 0;
    const re = /\[([^\]]+)\]\((\/[^)\s]+)\)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      parts.push(escapeHtml(text.slice(last, m.index)));
      const href = m[2];
      if (SAFE_PATH.test(href)) {
        parts.push(
          `<a href="${escapeHtml(href)}" class="chatbot-inline-link">${escapeHtml(
            m[1]
          )}</a>`
        );
      } else {
        parts.push(escapeHtml(m[0]));
      }
      last = m.index + m[0].length;
    }
    parts.push(escapeHtml(text.slice(last)));
    return parts.join("").replace(/\n/g, "<br>");
  };

  /**
   * Chat transcript persistence: browser localStorage only (this device / this origin).
   * Not uploaded as a batch; each user/assistant turn is sent to the API when you send a message.
   * Clear: site data for jlsolutions.io or DevTools → Application → Local Storage → remove jlSolutionsChatHistory.
   */
  const STORAGE_KEY = "jlSolutionsChatHistory";
  const state = {
    isOpen: false,
    isSending: false,
    history: []
  };

  const loadHistory = () => {
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(cached)) {
        state.history = cached;
      }
    } catch {
      state.history = [];
    }
  };

  const persistHistory = () => {
    try {
      const trimmed = state.history.slice(-CONFIG.maxTurnsSaved);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      /* ignore write errors */
    }
  };

  const createElement = (tag, className, attrs = {}) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        el.setAttribute(key, value);
      }
    });
    return el;
  };

  const createUI = () => {
    if (document.getElementById("jl-chatbot-toggle")) return;

    loadHistory();

    const toggle = createElement("button", "chatbot-toggle", {
      id: "jl-chatbot-toggle",
      type: "button",
      "aria-label": "Open Wattson chat assistant",
      "aria-expanded": "false",
      "aria-controls": "jl-chatbot-window",
      "aria-haspopup": "dialog"
    });
    toggle.innerHTML = `<span aria-hidden="true">💬</span>`;

    const windowEl = createElement("section", "chatbot-window", {
      id: "jl-chatbot-window",
      role: "dialog",
      "aria-labelledby": "jl-chatbot-dialog-title",
      "aria-hidden": "true",
      "aria-live": "polite"
    });

    windowEl.innerHTML = `
      <header class="chatbot-header">
        <div>
          <strong id="jl-chatbot-dialog-title">${CONFIG.brand}</strong>
          <p>${CONFIG.subtitle}</p>
        </div>
        <button type="button" class="chatbot-close" aria-label="Close chat">✕</button>
      </header>
      <div class="chatbot-messages-scroll" id="jl-chatbot-messages-scroll">
        <div class="chatbot-messages-list" id="jl-chatbot-messages"></div>
        <div class="chatbot-below-messages" id="jl-chatbot-below-messages">
          <p class="chatbot-panel-label" id="jl-chatbot-cta-label">Next steps</p>
          <div class="chatbot-cta-row" id="jl-chatbot-cta" role="navigation" aria-labelledby="jl-chatbot-cta-label"></div>
          <p class="chatbot-panel-label" id="jl-chatbot-quick-label">Common questions</p>
          <div class="chatbot-quick" id="jl-chatbot-quick" aria-labelledby="jl-chatbot-quick-label"></div>
        </div>
      </div>
      <form class="chatbot-form" id="jl-chatbot-form">
        <textarea
          class="chatbot-input"
          name="message"
          id="jl-chatbot-input"
          rows="2"
          placeholder="${CONFIG.placeholder}"
          required
        ></textarea>
        <div class="chatbot-actions">
          <small>AI-generated answers. Demos and get started checkout work without a call. For binding quotes or contracts, use Contact or Book a Free Call.</small>
          <button type="submit" class="btn-chatbot-send">Send</button>
        </div>
      </form>
    `;

    document.body.appendChild(windowEl);
    document.body.appendChild(toggle);

    const messagesScrollEl = windowEl.querySelector("#jl-chatbot-messages-scroll");
    const messagesEl = windowEl.querySelector("#jl-chatbot-messages");
    const ctaEl = windowEl.querySelector("#jl-chatbot-cta");
    const quickEl = windowEl.querySelector("#jl-chatbot-quick");
    const form = windowEl.querySelector("#jl-chatbot-form");
    const input = windowEl.querySelector("#jl-chatbot-input");
    const closeBtn = windowEl.querySelector(".chatbot-close");

    /**
     * Scroll the transcript so the newest bubble (user or assistant) is visible.
     * Uses the panel's scroll container only (does not scroll the page).
     * Double rAF so layout exists after innerHTML updates.
     */
    const scrollLastBubbleIntoView = () => {
      if (!messagesScrollEl || !messagesEl) return;
      const container = messagesScrollEl;
      const list = messagesEl;
      const run = () => {
        const bubbles = list.querySelectorAll(".chatbot-message");
        const last = bubbles[bubbles.length - 1];
        if (!last) {
          container.scrollTop = 0;
          return;
        }
        const topWithinContainer = list.offsetTop + last.offsetTop;
        const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
        const pad = 10;
        let nextTop;
        if (last.offsetHeight + 2 * pad <= container.clientHeight) {
          nextTop =
            topWithinContainer + last.offsetHeight / 2 - container.clientHeight / 2;
        } else {
          nextTop = topWithinContainer - pad;
        }
        container.scrollTo({
          top: Math.max(0, Math.min(nextTop, maxScroll)),
          behavior: "smooth"
        });
      };
      requestAnimationFrame(() => requestAnimationFrame(run));
    };

    const renderHistory = () => {
      messagesEl.innerHTML = "";
      if (state.history.length === 0 && CONFIG.welcomeMarkdown) {
        const welcomeEl = createElement(
          "div",
          "chatbot-message assistant chatbot-message--rich chatbot-welcome"
        );
        welcomeEl.innerHTML = renderAssistantHtml(CONFIG.welcomeMarkdown);
        welcomeEl.setAttribute("aria-label", "Welcome message");
        messagesEl.appendChild(welcomeEl);
      }
      state.history.forEach(({ role, content, error }) => {
        const bubble = createElement(
          "div",
          `chatbot-message ${role === "user" ? "user" : "assistant"}${
            role === "assistant" && !error ? " chatbot-message--rich" : ""
          }`
        );
        if (role === "assistant" && !error) {
          bubble.innerHTML = renderAssistantHtml(content);
        } else {
          bubble.textContent = content;
        }
        if (error) bubble.classList.add("error");
        messagesEl.appendChild(bubble);
      });
      scrollLastBubbleIntoView();
    };

    const addMessage = (role, content, options = {}) => {
      const entry = { role, content, ...options };
      state.history.push(entry);
      persistHistory();
      renderHistory();
    };

    const setLoading = loading => {
      state.isSending = loading;
      form.classList.toggle("sending", loading);
    };

    const messagesForApi = () =>
      state.history
        .filter(
          entry =>
            entry &&
            (entry.role === "user" || entry.role === "assistant") &&
            typeof entry.content === "string" &&
            entry.content.trim()
        )
        .map(entry => ({
          role: entry.role === "assistant" ? "assistant" : "user",
          content: entry.content.trim()
        }));

    const sendPrompt = async text => {
      if (!text || state.isSending) return;
      addMessage("user", text);
      setLoading(true);
      try {
        const res = await fetch(CONFIG.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: messagesForApi() })
        });

        const raw = await res.text();
        let payload = {};
        try {
          payload = raw ? JSON.parse(raw) : {};
        } catch {
          payload = {};
        }
        if (!res.ok) {
          const detail =
            payload.details ||
            payload.error ||
            (raw ? raw.slice(0, 220) : "") ||
            `Status ${res.status}`;
          throw new Error(detail);
        }
        const reply =
          payload.reply ||
          payload.message ||
          "I am not sure I understood that. Try one of the buttons below, or ask in your own words.";
        addMessage("assistant", reply);
      } catch (error) {
        console.error("[JL Chatbot]", error);
        addMessage(
          "assistant",
          "Something went wrong on our side. Please try again, email info@jlsolutions.io, or use Book a Free Call / Send a message below.",
          { error: true }
        );
      } finally {
        setLoading(false);
      }
    };

    form.addEventListener("submit", event => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      sendPrompt(text);
    });

    const setChatOpen = open => {
      state.isOpen = open;
      windowEl.classList.toggle("open", open);
      toggle.classList.toggle("open", open);
      windowEl.setAttribute("aria-hidden", open ? "false" : "true");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute(
        "aria-label",
        open ? "Close Wattson chat" : "Open Wattson chat assistant"
      );
      if (open) {
        input.focus();
      } else {
        toggle.focus();
      }
    };

    toggle.addEventListener("click", () => {
      setChatOpen(!state.isOpen);
    });

    closeBtn.addEventListener("click", () => {
      setChatOpen(false);
    });

    CONFIG.ctaLinks.forEach(({ label, href }) => {
      const a = createElement("a", "chatbot-cta-link", {
        href,
        "aria-label": label + " (opens in same window)"
      });
      a.textContent = label;
      ctaEl.appendChild(a);
    });

    CONFIG.quickPrompts.forEach(prompt => {
      const chip = createElement("button", "chatbot-chip", {
        type: "button"
      });
      chip.textContent = prompt;
      const runChip = e => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        sendPrompt(prompt);
      };
      chip.addEventListener("click", runChip);
      chip.addEventListener(
        "pointerdown",
        e => {
          e.stopPropagation();
        },
        true
      );
      quickEl.appendChild(chip);
    });

    renderHistory();
  };

  // main.js injects this script after DOMContentLoaded; listeners would never run otherwise.
  const bootChatbot = () => {
    if (document.getElementById("jl-chatbot-toggle")) return;
    createUI();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootChatbot, { once: true });
  } else {
    bootChatbot();
  }
})();





