import fs from 'fs';
import WebSocket from 'ws';

async function main() {
  const devToolsFile = fs.readFileSync('/home/sachinm/.config/google-chrome/DevToolsActivePort', 'utf8');
  const [port, browserPath] = devToolsFile.trim().split('\n');
  const browserWsUrl = `ws://127.0.0.1:${port}${browserPath}`;

  const ws = new WebSocket(browserWsUrl);
  let idCounter = 1;
  const pendingRequests = new Map();

  function sendCommand(method, params = {}, sessionId = undefined) {
    return new Promise((resolve, reject) => {
      const msgId = idCounter++;
      const timeout = setTimeout(() => {
        pendingRequests.delete(msgId);
        reject(new Error(`Timeout waiting for ${method} (id=${msgId})`));
      }, 8000);

      pendingRequests.set(msgId, {
        resolve: (result) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        }
      });

      const messageObj = { id: msgId, method, params };
      if (sessionId) messageObj.sessionId = sessionId;
      ws.send(JSON.stringify(messageObj));
    });
  }

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.id && pendingRequests.has(msg.id)) {
        const { resolve, reject } = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        } else {
          resolve(msg.result);
        }
      }
    } catch (e) {
      console.error('Error handling WS message:', e);
    }
  });

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  const { targetInfos } = await sendCommand('Target.getTargets');
  const capTarget = targetInfos.find(t => t.url.includes('3000') || t.title.includes('CapSpace'));
  const { sessionId } = await sendCommand('Target.attachToTarget', { targetId: capTarget.targetId, flatten: true });

  const evalResponse = await sendCommand('Runtime.evaluate', {
    expression: `(async () => {
      const ctx = window.modelContext || document.modelContext || navigator.modelContext;
      const proto = Object.getPrototypeOf(ctx);
      const protoMethods = Object.getOwnPropertyNames(proto);

      let tools = [];
      if (ctx.getTools) {
        tools = await ctx.getTools();
      }

      // Check tool object structure
      const toolsInfo = [];
      for (const t of tools) {
        const tProto = Object.getPrototypeOf(t);
        toolsInfo.push({
          tool: t,
          name: t.name,
          description: t.description,
          keys: Object.keys(t),
          protoMethods: Object.getOwnPropertyNames(tProto),
          hasExecute: typeof t.execute === 'function'
        });
      }

      return {
        ctxType: ctx.constructor.name,
        protoMethods,
        toolsCount: tools.length,
        toolsInfo
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  }, sessionId);

  console.log('Inspection output:', JSON.stringify(evalResponse.result.value, null, 2));

  await sendCommand('Target.detachFromTarget', { sessionId });
  ws.close();
}

main().catch(console.error);
