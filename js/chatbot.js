(() => {
  const CONFIG = {
    endpoint:
      document.currentScript?.dataset?.endpoint ||
      "/.netlify/functions/chatbot",
    brand: "Concierge Daemon",
    subtitle: "Ask anything. We route you to the right next step.",
    placeholder: "Services, pricing, booking, payment...",
    quickPrompts: [
      "What do you actually build for businesses?",
      "I want to book a free call",
      "I need to pay a deposit or invoice"
    ],
    ctaLinks: [
      { label: "Book a free call", href: "/book-consultation.html" },
      { label: "Pay / checkout", href: "/pay/" },
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
      "aria-label": "Open Concierge Daemon chat",
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
      </div>
      <div class="chatbot-cta-row" id="jl-chatbot-cta" role="navigation" aria-label="Quick actions"></div>
      <div class="chatbot-quick" id="jl-chatbot-quick"></div>
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
          <small>AI may be imperfect. Verify sensitive details before you act.</small>
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

    const renderHistory = () => {
      messagesEl.innerHTML = "";
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
      if (messagesScrollEl) {
        messagesScrollEl.scrollTop = messagesScrollEl.scrollHeight;
      }
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
          "I’m here, but I wasn’t able to find an answer.";
        addMessage("assistant", reply);
      } catch (error) {
        console.error("[JL Chatbot]", error);
        addMessage(
          "assistant",
          "Sorry, I hit a snag reaching the AI service. Please try again or email info@jlsolutions.io.",
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
        open ? "Close Concierge Daemon chat" : "Open Concierge Daemon chat"
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
        href
      });
      a.textContent = label;
      ctaEl.appendChild(a);
    });

    CONFIG.quickPrompts.forEach(prompt => {
      const chip = createElement("button", "chatbot-chip", {
        type: "button"
      });
      chip.textContent = prompt;
      chip.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        sendPrompt(prompt);
      });
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





