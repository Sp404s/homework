import calendar from '../js/calendar.js';
import { json } from './_http.mjs';
import { publicTasks } from './_attachments.mjs';
import { loadState } from './_storage.mjs';

export async function GET() {
  try {
    const state = await loadState();
    return json({
      version: 5,
      tasks: publicTasks(state.tasks),
      scheduleChanges: state.scheduleChanges,
      weekAnchor: state.weekAnchor,
      botConnected: Boolean(state.webhookActive),
      botStatus: state.webhookActive ? 'connected' : 'webhook-not-configured',
      today: calendar.today(),
    });
  } catch {
    return json({ error: 'service_unavailable' }, 503);
  }
}
