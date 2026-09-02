import fs from 'fs';
import WebSocket from 'ws';

async function main() {
  console.log('[1] Reading DevToolsActivePort...');
  const devToolsFile = fs.readFileSync('/home/sachinm/.config/google-chrome/DevToolsActivePort', 'utf8');
  const [port, browserPath] = devToolsFile.trim().split('\n');
  const browserWsUrl = `ws://127.0.0.1:${port}${browserPath}`;
  console.log('[2] Connecting to', browserWsUrl);

  const ws = new WebSocket(browserWsUrl);
  let idCounter = 1;
  const pendingRequests = new Map();

  function sendCommand(method, params = {}, sessionId = undefined) {
    return new Promise((resolve, reject) => {
      const msgId = idCounter++;
      const timeout = setTimeout(() => {
        pendingRequests.delete(msgId);
        reject(new Error(`Timeout waiting for ${method} (id=${msgId})`));
      }, 5000);

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
      console.log(`[CDP SEND] id=${msgId} method=${method} sessionId=${sessionId}`);
      ws.send(JSON.stringify(messageObj));
    });
  }

  ws.on('message', (raw) => {
    const text = raw.toString();
    const msg = JSON.parse(text);
    console.log(`[CDP RECV] id=${msg.id} sessionId=${msg.sessionId} method=${msg.method}`);
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });

  await new Promise((resolve, reject) => {
    ws.on('open', () => { console.log('[3] WS Open'); resolve(); });
    ws.on('error', reject);
  });

  const { targetInfos } = await sendCommand('Target.getTargets');
  const capTarget = targetInfos.find(t => t.url.includes('3000') || t.title.includes('CapSpace'));
  if (!capTarget) {
    console.error('CapSpace target not found!');
    process.exit(1);
  }
  console.log(`[4] Found CapSpace target: ${capTarget.targetId}`);

  const { sessionId } = await sendCommand('Target.attachToTarget', { targetId: capTarget.targetId, flatten: true });
  console.log(`[5] Attached sessionId: ${sessionId}`);

  console.log('[6] Evaluating in tab...');
  const evalResponse = await sendCommand('Runtime.evaluate', {
    expression: `(async () => {
      // Look for the custom fallback or standard modelContext
      const ctx = window.modelContext || document.modelContext || navigator.modelContext;
      if (!ctx) return { error: 'No modelContext found' };

      // Discover registered tools
      let tools = [];
      if (typeof ctx.getTools === 'function') {
        const t = await ctx.getTools();
        tools = Array.isArray(t) ? t : Array.from(t || []);
      } else if (Array.isArray(ctx.tools)) {
        tools = ctx.tools;
      }

      const toolList = tools.map(t => ({
        name: t.name,
        description: t.description,
        readOnly: t.readOnlyHint
      }));

      // Execute tool helper
      async function execute(name, params) {
        const found = tools.find(t => t.name === name);
        if (!found) throw new Error('Tool not found: ' + name);
        if (typeof found.execute === 'function') {
          return await found.execute(params);
        }
        if (typeof ctx.executeTool === 'function') {
          return await ctx.executeTool(found, params);
        }
        throw new Error('No execute method for ' + name);
      }

      const nykPre = await execute('get_team_cap_status', { teamId: 'NYK' });
      const valInitial = await execute('validate_cba_trade', {});
      const facilitators = await execute('find_facilitator_teams', { minTpeAmount: 2000000 });
      const balanceResult = await execute('auto_balance_trade', { primaryTeamId: 'NYK' });
      const nykPost = await execute('get_team_cap_status', { teamId: 'NYK' });
      const valFinal = await execute('validate_cba_trade', {});

      return {
        toolList,
        nykPre,
        valInitial,
        facilitators,
        balanceResult,
        nykPost,
        valFinal
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  }, sessionId);

  console.log('[7] Eval response received!');
  if (evalResponse.exceptionDetails) {
    console.error('Eval Exception:', evalResponse.exceptionDetails);
  } else {
    console.log('RESULT DATA:');
    console.log(JSON.stringify(evalResponse.result.value, null, 2));
  }

  await sendCommand('Target.detachFromTarget', { sessionId });
  ws.close();
  console.log('[8] Finished cleanly.');
}

main().catch(console.error);
