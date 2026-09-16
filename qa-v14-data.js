'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { window: {} };
vm.runInNewContext(fs.readFileSync('data.js', 'utf8'), context, { filename: 'data.js' });

const { scenario } = context.window.V14_DATA;
assert.equal(scenario.scenario_id, 'SCN-01');
assert.equal(new Set(scenario.events.map((event) => event.event_id)).size, scenario.events.length);
assert.deepEqual([...new Set(scenario.events.map((event) => event.type))].sort(), [
  'ACTION', 'EVIDENCE', 'INTERVENTION', 'OBSERVATION', 'PLAN', 'QUESTION', 'REPLAN', 'RESULT'
]);

const planIds = new Set(scenario.plan.map((node) => node.id));
const twinIds = new Set(scenario.twin_nodes.map((node) => node.twin_node_id));
const eventIds = new Set(scenario.events.map((event) => event.event_id));
for (const event of scenario.events) {
  assert(planIds.has(event.node_id), `${event.event_id} references a missing plan node`);
  assert(twinIds.has(event.twin_node_id), `${event.event_id} references a missing twin node`);
}
for (const asset of scenario.assets) {
  for (const eventId of asset.source_events) assert(eventIds.has(eventId), `${asset.asset_id} references a missing event`);
}

console.log(`V1.4 scenario contract OK: ${scenario.events.length} events, ${scenario.assets.length} assets`);
