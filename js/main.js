// Injects header and footer into each page

const setActiveNav = () => {
  const raw = window.location.pathname || '/';
  const path = raw.replace(/\/$/, '') || '/';
  document.querySelectorAll('.navbar .nav-link').forEach((link) => {
    link.classList.remove('active');
    const hrefRaw = link.getAttribute('href') || '';
    const href = hrefRaw.replace(/^\//, '').replace(/\/$/, '') || 'index.html';
    const isHome = !href || href === 'index.html' || href === '';
    const isResourcesNav = Boolean(link.closest('.dropdown'));
    const pathIsResources =
      path.includes('/resources') ||
      path.includes('/insights') ||
      path.endsWith('/resources') ||
      path.endsWith('/insights');
    const isAbout = href === 'about' || href.startsWith('about/') || href === 'about.html';
    const pathIsAbout =
      path.includes('/about') || path.endsWith('/about') || path.endsWith('about.html');
    const isServices = href.startsWith('services');
    const pathIsServices = path.includes('/services');
    const isCaseStudies = href.startsWith('case-studies');
    const pathIsCaseStudies = path.includes('/case-studies');
    const isDemo = href === 'demo' || href.startsWith('demo');
    const pathIsDemo = path === '/demo' || path.endsWith('/demo') || path.includes('demo.html');
    const isContact = href === 'contact.html' || href === 'contact';
    const pathIsContact = path.endsWith('/contact.html') || path.endsWith('/contact');

    if (isHome && (path === '/' || path === '/index.html' || path === '')) link.classList.add('active');
    else if (isResourcesNav && pathIsResources) link.classList.add('active');
    else if (isAbout && pathIsAbout) link.classList.add('active');
    else if (isServices && pathIsServices) link.classList.add('active');
    else if (isCaseStudies && pathIsCaseStudies) link.classList.add('active');
    else if (isDemo && pathIsDemo) link.classList.add('active');
    else if (isContact && pathIsContact) link.classList.add('active');
  });
};

const injectPartial = (id, path) => {
  const slot = document.getElementById(id);
  if (!slot) return Promise.resolve(false);

  return fetch(path)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${path}`);
      return res.text();
    })
    .then((html) => {
      slot.innerHTML = html;
      return true;
    })
    .catch((err) => {
      console.warn(`[JL Site] ${err.message}`);
      return false;
    });
};

const ensureChatbot = () => {
  if (document.querySelector('script[data-jl-chatbot], script[src*="chatbot.js"]')) return;
  const script = document.createElement('script');
  script.src = '/js/chatbot.js';
  script.defer = true;
  script.dataset.jlChatbot = 'true';
  document.head.appendChild(script);
};

document.addEventListener('DOMContentLoaded', () => {
  Promise.all([
    injectPartial('header', '/partials/header.html'),
    injectPartial('footer', '/partials/footer.html'),
  ]).then(() => {
    setActiveNav();
  });
  ensureChatbot();
  // Also set active for pages with inline nav
  setActiveNav();
});
