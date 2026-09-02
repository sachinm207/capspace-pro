import fs from 'fs';
import WebSocket from 'ws';

async function run() {
  const devToolsFile = fs.readFileSync('/home/sachinm/.config/google-chrome/DevToolsActivePort', 'utf8');
  const [port, browserPath] = devToolsFile.trim().split('\n');
  const ws = new WebSocket(`ws://127.0.0.1:${port}${browserPath}`);
  let id = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  });

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  const { targetInfos } = await send('Target.getTargets');
  const capTarget = targetInfos.find(t => t.url.includes('3000') || t.title.includes('CapSpace'));
  const { sessionId } = await send('Target.attachToTarget', { targetId: capTarget.targetId, flatten: true });

  function sendSession(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, sessionId, method, params }));
    });
  }

  const evalResult = await sendSession('Runtime.evaluate', {
    expression: `(async () => {
      const winCtx = window.modelContext;
      const docCtx = document.modelContext;
      const navCtx = navigator.modelContext;
      const ctx = navCtx || docCtx || winCtx;
      
      let toolsResult = null;
      if (ctx && ctx.getTools) {
        try {
          toolsResult = await ctx.getTools();
        } catch(e) {
          toolsResult = 'Error calling getTools: ' + e.message;
        }
      }

      return {
        hasWin: !!winCtx,
        hasDoc: !!docCtx,
        hasNav: !!navCtx,
        ctxKeys: ctx ? Object.keys(ctx) : [],
        toolsResultType: typeof toolsResult,
        toolsResultIsArray: Array.isArray(toolsResult),
        toolsResult
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Result:', JSON.stringify(evalResult.result.value, null, 2));
  ws.close();
}

run().catch(console.error);
