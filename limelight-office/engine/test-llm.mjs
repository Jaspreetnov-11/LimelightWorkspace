// Checks the Office agent against the Limelight AI engine (read-only: no mail sent, nothing saved, data not printed).
//   node engine/test-llm.mjs
import { llmStatus, chatbot, chat } from './agent.mjs';

const s = await llmStatus(true);
console.log('engine:', s.online ? `online, model ${s.model} @ ${s.url}` : 'OFFLINE');
if (!s.online) process.exit(1);

let t = Date.now();
const a = await chatbot([{ role: 'user', content: 'In one line: what does a government-communication agency do?' }]);
console.log(`chatbot: ${a.reply.length ? 'replied' : 'EMPTY'} (${a.reply.length} chars, ${((Date.now() - t) / 1000).toFixed(1)}s)`);

t = Date.now();
const b = await chat([{ role: 'user', content: 'Who is on my team? Just count them.' }], { id: 'test-only', name: 'Test User' });
console.log(`agent:   tools used [${b.steps.map((x) => `${x.tool} ${x.ok ? 'ok' : 'failed'}`).join(', ')}], ` +
  `reply ${b.reply.length ? 'given' : 'EMPTY'}, approvals waiting ${b.actions.length} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
