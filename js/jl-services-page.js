/**
 * Hydrates /services product grid from JL_SERVICE_PRODUCTS (jl-services-data.js).
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderCard(p) {
    var overview = p.overviewHref || '/services/index.html';
    var bullets = (p.bullets || [])
      .map(function (b) {
        return '<li>' + esc(b) + '</li>';
      })
      .join('');
    var note = p.note
      ? '<p class="jl-service-product-card__muted">' + esc(p.note) + '</p>'
      : '';
    var demo =
      p.demoHref &&
      '<p class="jl-service-product-card__demo"><a href="' +
        esc(p.demoHref) +
        '">Live demo</a>: interactive capture, qualify, and booking</p>';
    var priceNum = esc(p.price || '').replace(/^\s*/, '');
    return (
      '<article class="jl-service-product-card" data-jl-product-slug="' +
      esc(p.slug) +
      '">' +
      '<p class="jl-service-product-card__pain">' +
      esc(p.eyebrow) +
      '</p>' +
      '<h3 class="jl-service-product-card__title">' +
      esc(p.outcomeTitle) +
      ' <span class="jl-service-product-card__title-tag">(' +
      esc(p.serviceName) +
      ')</span></h3>' +
      '<p class="jl-service-product-card__transform">' +
      esc(p.transformLine) +
      '</p>' +
      '<ul class="jl-service-product-card__bullets" aria-label="What you get">' +
      bullets +
      '</ul>' +
      '<p class="jl-service-product-card__bestfor"><span class="jl-service-product-card__bestfor-label">Best for</span> ' +
      esc(p.bestFor) +
      '</p>' +
      note +
      '<p class="jl-service-product-card__price">' +
      priceNum +
      ' <span class="jl-service-product-card__price-fixed">fixed</span></p>' +
      '<p class="jl-service-product-card__ttv">' +
      esc(p.timeline) +
      '</p>' +
      '<p class="jl-service-product-card__roi">' +
      esc(p.roi) +
      '</p>' +
      '<p class="jl-service-product-card__overview"><a href="' +
      esc(overview) +
      '">Service overview</a></p>' +
      (demo || '') +
      '<div class="jl-service-product-card__actions">' +
      '<a href="' +
      esc(p.primaryHref) +
      '" class="btn btn-book-call jl-service-product-card__btn-primary">Get Started</a>' +
      '<a href="' +
      esc(p.secondaryHref) +
      '" class="jl-service-product-card__secondary">Talk it through first</a>' +
      '<a href="' +
      esc(p.tertiaryHref || '/contact.html') +
      '" class="jl-service-product-card__tertiary">Request a Quote</a>' +
      '</div>' +
      '</article>'
    );
  }

  function init() {
    var root = document.getElementById('jl-product-cards-root');
    var products = window.JL_SERVICE_PRODUCTS;
    if (!root || !products || !products.length) return;
    root.innerHTML = products.map(renderCard).join('');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
