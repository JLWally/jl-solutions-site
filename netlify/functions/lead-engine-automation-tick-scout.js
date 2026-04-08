/**
 * Scout phase only (query rotation, Places ingest). Use with a separate downstream tick for qualify/pipeline.
 */
const { automationTickHandler } = require('./lib/lead-engine-automation-tick-shared');

exports.handler = async (event) =>
  automationTickHandler(event, { phases: ['scout'], automation_tick_profile: 'scout_only' });
