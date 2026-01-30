(() => {
  const CONFIG = {
    endpoint:
      document.currentScript?.dataset?.endpoint ||
      "/.netlify/functions/chatbot",
    brand: "JL Copilot",
    subtitle: "Ask how we can help.",
    placeholder: "Ask about services, timelines, pricing…",
    quickPrompts: [
      "What solutions do you build?",
      "How do I start a project?",
      "Can you help with AI integrations?"
    ],
    maxTurnsSaved: 12
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
      "aria-label": "Open AI chat"
    });
    toggle.innerHTML = `<span>💬</span>`;

    const windowEl = createElement("section", "chatbot-window", {
      id: "jl-chatbot-window",
      "aria-live": "polite"
    });

    windowEl.innerHTML = `
      <header class="chatbot-header">
        <div>
          <strong>${CONFIG.brand}</strong>
          <p>${CONFIG.subtitle}</p>
        </div>
        <button class="chatbot-close" aria-label="Close chat">✕</button>
      </header>
      <div class="chatbot-messages" id="jl-chatbot-messages"></div>
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
          <small>AI may be imperfect — verify sensitive info.</small>
          <button type="submit" class="btn-chatbot-send">Send</button>
        </div>
      </form>
    `;

    document.body.appendChild(windowEl);
    document.body.appendChild(toggle);

    const messagesEl = windowEl.querySelector("#jl-chatbot-messages");
    const quickEl = windowEl.querySelector("#jl-chatbot-quick");
    const form = windowEl.querySelector("#jl-chatbot-form");
    const input = windowEl.querySelector("#jl-chatbot-input");
    const closeBtn = windowEl.querySelector(".chatbot-close");

    const renderHistory = () => {
      messagesEl.innerHTML = "";
      state.history.forEach(({ role, content, error }) => {
        const bubble = createElement(
          "div",
          `chatbot-message ${role === "user" ? "user" : "assistant"}`
        );
        bubble.textContent = content;
        if (error) bubble.classList.add("error");
        messagesEl.appendChild(bubble);
      });
      messagesEl.scrollTop = messagesEl.scrollHeight;
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

    const sendPrompt = async text => {
      if (!text || state.isSending) return;
      addMessage("user", text);
      setLoading(true);
      try {
        const res = await fetch(CONFIG.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: state.history })
        });

        if (!res.ok) {
          throw new Error(`Status ${res.status}`);
        }

        const payload = await res.json();
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

    toggle.addEventListener("click", () => {
      state.isOpen = !state.isOpen;
      windowEl.classList.toggle("open", state.isOpen);
      toggle.classList.toggle("open", state.isOpen);
      if (state.isOpen) {
        input.focus();
      }
    });

    closeBtn.addEventListener("click", () => {
      state.isOpen = false;
      windowEl.classList.remove("open");
      toggle.classList.remove("open");
    });

    CONFIG.quickPrompts.forEach(prompt => {
      const chip = createElement("button", "chatbot-chip", {
        type: "button"
      });
      chip.textContent = prompt;
      chip.addEventListener("click", () => sendPrompt(prompt));
      quickEl.appendChild(chip);
    });

    renderHistory();
  };

  document.addEventListener("DOMContentLoaded", createUI, { once: true });
})();





