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

const setActiveNav = () => {
  const path = (window.location.pathname || '/').replace(/\/$/, '') || '/';
  document.querySelectorAll('.navbar .nav-link').forEach((link) => {
    link.classList.remove('active');
    const href = (link.getAttribute('href') || '').replace(/^\//, '').replace(/\/$/, '') || 'index.html';
    const isHome = !href || href === 'index.html' || href === '';
    const pathIsHome = !path || path === '/' || path === 'index.html' || path.endsWith('/index.html');
    if (isHome && pathIsHome) link.classList.add('active');
    else if (!isHome && path.includes(href.split('/')[0])) link.classList.add('active');
  });
};

document.addEventListener("DOMContentLoaded", () => {
  injectPartial("header", "/partials/header.html");
  injectPartial("footer", "/partials/footer.html");
  ensureChatbot();
  // Set active nav after header loads (with small delay for fetch)
  setTimeout(setActiveNav, 100);
});
