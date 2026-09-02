import fs from 'fs';
import WebSocket from 'ws';

async function run() {
  const devToolsFile = fs.readFileSync('/home/sachinm/.config/google-chrome/DevToolsActivePort', 'utf8');
  const [port, browserPath] = devToolsFile.trim().split('\n');
  const browserWsUrl = `ws://127.0.0.1:${port}${browserPath}`;

  const ws = new WebSocket(browserWsUrl);
  let id = 1;
  const pending = new Map();

  function send(method, params = {}, sessionId = undefined) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      const timeout = setTimeout(() => {
        pending.delete(msgId);
        reject(new Error(`Timeout waiting for ${method}`));
      }, 5000);
      pending.set(msgId, { resolve: (res) => { clearTimeout(timeout); resolve(res); }, reject: (err) => { clearTimeout(timeout); reject(err); } });
      const payload = { id: msgId, method, params };
      if (sessionId) payload.sessionId = sessionId;
      ws.send(JSON.stringify(payload));
    });
  }

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) {
        reject(msg.error);
      } else {
        resolve(msg.result);
      }
    }
  });

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  const { targetInfos } = await send('Target.getTargets');
  const capTarget = targetInfos.find(t => t.url.includes('3000') || t.title.includes('CapSpace'));
  if (!capTarget) {
    console.error('CapSpace target not found!');
    process.exit(1);
  }

  console.log(`Found CapSpace target: ${capTarget.title} (${capTarget.targetId})`);

  const { sessionId } = await send('Target.attachToTarget', { targetId: capTarget.targetId, flatten: true });

  const evalResult = await send('Runtime.evaluate', {
    expression: `(async () => {
      const ctx = window.modelContext || document.modelContext || navigator.modelContext;
      if (!ctx) return { error: 'No modelContext found on window, document, or navigator' };

      const logs = [];
      const log = (msg) => logs.push(msg);

      log('=== 1. Inspecting modelContext ===');
      log('Context methods: ' + Object.keys(ctx).join(', '));
      
      let rawTools = null;
      if (typeof ctx.getTools === 'function') {
        try {
          rawTools = await ctx.getTools();
          log('ctx.getTools() returned type: ' + typeof rawTools + ', isArray: ' + Array.isArray(rawTools));
        } catch(e) {
          log('ctx.getTools() error: ' + e.message);
        }
      }
      
      let toolNames = [];
      if (Array.isArray(rawTools)) {
        toolNames = rawTools.map(t => t.name || t);
      } else if (rawTools && typeof rawTools === 'object') {
        toolNames = Object.keys(rawTools);
      } else if (Array.isArray(ctx.tools)) {
        toolNames = ctx.tools.map(t => t.name);
      }
      log('Registered Tools: ' + toolNames.join(', '));

      log('\\n=== 2. Inspecting Cap Status for NYK ===');
      const nykStatus = await ctx.executeTool('get_team_cap_status', { teamId: 'NYK' });
      log('NYK Current Payroll: $' + (nykStatus.totalPayroll / 1e6).toFixed(2) + 'M');
      log('NYK Apron Tier: ' + nykStatus.apronTier);
      log('NYK Distance to Second Apron ($188.93M): $' + (nykStatus.distanceToSecondApron / 1e6).toFixed(2) + 'M');

      log('\\n=== 3. Validating Active Trade ===');
      const activeValidation = await ctx.executeTool('validate_cba_trade', {});
      log('Active Trade Legal: ' + activeValidation.isLegal);
      if (!activeValidation.isLegal && activeValidation.violations) {
        activeValidation.violations.forEach(v => {
          log('  ❌ [' + v.teamId + '] ' + v.rule + ': ' + v.reason);
        });
      }

      log('\\n=== 4. Finding 3rd-Party Facilitator Teams ===');
      const facilitators = await ctx.executeTool('find_facilitator_teams', { minTpeAmount: 2000000 });
      log('Viable Facilitators with TPE >= $2.0M: ' + facilitators.length);
      facilitators.forEach(f => {
        const tpes = f.availableTPEs.map(t => t.name + ' ($' + (t.amount/1e6).toFixed(2) + 'M)').join(', ');
        log('  - ' + f.fullName + ' (' + f.id + '): ' + tpes + ' | Open Roster Spots: ' + f.openRosterSpots);
      });

      log('\\n=== 5. Rebalancing Trade across 3 teams (NYK, BKN, CHA) ===');
      const balanceResult = await ctx.executeTool('auto_balance_trade', { primaryTeamId: 'NYK' });
      log('Trade Status: ' + balanceResult.tradeStatus);
      log('Post-Rebalance Legal: ' + balanceResult.validation.isLegal);
      log('Validation Summary: ' + balanceResult.validation.summary);

      log('\\n=== 6. Verified NYK Post-Rebalance Cap Sheet ===');
      const nykStatusAfter = await ctx.executeTool('get_team_cap_status', { teamId: 'NYK' });
      log('NYK New Payroll: $' + (nykStatusAfter.totalPayroll / 1e6).toFixed(2) + 'M');
      log('NYK New Apron Tier: ' + nykStatusAfter.apronTier);
      log('NYK Distance to Second Apron: $' + (nykStatusAfter.distanceToSecondApron / 1e6).toFixed(2) + 'M');

      return {
        success: true,
        logs,
        activeValidation,
        facilitators,
        balanceResult,
        nykStatus,
        nykStatusAfter
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  }, sessionId);

  if (evalResult.exceptionDetails) {
    console.error('Exception during evaluation:', evalResult.exceptionDetails);
  } else {
    console.log('\n======================================================');
    console.log(' WebMCP EXECUTION REPORT');
    console.log('======================================================\n');
    evalResult.result.value.logs.forEach(l => console.log(l));
    console.log('\n======================================================\n');
  }

  await send('Target.detachFromTarget', { sessionId });
  ws.close();
}

run().catch(console.error);
