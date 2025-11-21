// Injects header and footer into each page

const injectPartial = (id, path) => {
  const slot = document.getElementById(id);
  if (!slot) return;

  fetch(path)
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load ${path}`);
      return res.text();
    })
    .then(html => {
      slot.innerHTML = html;
    })
    .catch(err => {
      console.warn(`[JL Site] ${err.message}`);
    });
};

const ensureChatbot = () => {
  if (document.querySelector('script[data-jl-chatbot]')) return;
  const script = document.createElement("script");
  script.src = "/js/chatbot.js";
  script.defer = true;
  script.dataset.jlChatbot = "true";
  document.head.appendChild(script);
};

document.addEventListener("DOMContentLoaded", () => {
  injectPartial("header", "/partials/header.html");
  injectPartial("footer", "/partials/footer.html");
  ensureChatbot();
});
