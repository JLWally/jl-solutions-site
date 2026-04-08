/**
 * Downstream tick: branch enrichment → ICP qualifier → automation pipeline (no Scout).
 * Pair with lead-engine-automation-tick-scout.js on a different schedule.
 */
const { automationTickHandler } = require('./lib/lead-engine-automation-tick-shared');

exports.handler = async (event) =>
  automationTickHandler(event, {
    phases: ['enrichment', 'qualifier', 'pipeline'],
    automation_tick_profile: 'downstream',
  });
