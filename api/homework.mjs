import calendar from '../js/calendar.js';
import { json } from './_http.mjs';
import { loadState } from './_storage.mjs';

export async function GET() {
  try {
    const state = await loadState();
    return json({
      version: 4,
      tasks: state.tasks,
      scheduleChanges: state.scheduleChanges,
      weekAnchor: state.weekAnchor,
      botConnected: Boolean(state.webhookActive && state.owner),
      botStatus: !state.webhookActive ? 'webhook-not-configured' : state.owner ? 'connected' : 'awaiting-owner',
      today: calendar.today(),
    });
  } catch {
    return json({ error: 'service_unavailable' }, 503);
  }
}
