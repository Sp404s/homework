import calendar from '../js/calendar.js';
import { json } from './_http.mjs';
import { publicTasks } from './_attachments.mjs';
import { loadState } from './_storage.mjs';
import { translateTasks } from './_translation.mjs';

export async function GET() {
  try {
    const state = await loadState();
    const tasks = await translateTasks(publicTasks(state.tasks));
    return json({
      version: 6,
      tasks,
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
