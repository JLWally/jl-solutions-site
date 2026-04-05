/**
 * Sets JL_INDUSTRY_LANDER_CONFIG from JL_INDUSTRY_LANDER_REGISTRY using JL_INDUSTRY_LANDER_SLUG.
 * Include after jl-industry-lander-registry.js and before jl-industry-lander-page.js.
 */
(function () {
  'use strict';
  var slug = window.JL_INDUSTRY_LANDER_SLUG;
  var reg = window.JL_INDUSTRY_LANDER_REGISTRY;
  if (slug && reg && reg[slug]) {
    window.JL_INDUSTRY_LANDER_CONFIG = reg[slug];
  }
})();
