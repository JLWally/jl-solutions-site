/**
 * Full automation tick (HTTP / optional schedule): Scout → enrichment → ICP → pipeline.
 * Prefer split schedules: lead-engine-automation-tick-scout.js + lead-engine-automation-tick-downstream.js
 */
const { automationTickHandler } = require('./lib/lead-engine-automation-tick-shared');

exports.handler = async (event) =>
  automationTickHandler(event, {
    phases: ['scout', 'enrichment', 'qualifier', 'pipeline'],
    automation_tick_profile: 'full',
  });
