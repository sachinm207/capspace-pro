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
  if (!capTarget) {
    console.error('CapSpace Pro tab not found among targets:', targetInfos);
    process.exit(1);
  }

  console.log(`[CDP] Attached to target: "${capTarget.title}" (${capTarget.targetId})`);
  const { sessionId } = await sendCommand('Target.attachToTarget', { targetId: capTarget.targetId, flatten: true });

  const evalResponse = await sendCommand('Runtime.evaluate', {
    expression: `(async () => {
      const ctx = window.modelContext || document.modelContext || navigator.modelContext;
      if (!ctx) return { error: 'No modelContext found on window, document, or navigator' };

      const logs = [];
      const log = (msg) => logs.push(msg);

      // 1. Discover Registered Tools
      let tools = [];
      if (typeof ctx.getTools === 'function') {
        const res = await ctx.getTools();
        tools = Array.isArray(res) ? res : Array.from(res || []);
      } else if (Array.isArray(ctx.tools)) {
        tools = ctx.tools;
      }

      log('=== 1. Discovered WebMCP Tools ===');
      tools.forEach(t => log('  • ' + t.name + ' (readOnly: ' + !!t.readOnlyHint + '): ' + t.description));

      // 2. Query Cap Status for NYK
      log('\\n=== 2. Current Cap Status: New York Knicks (NYK) ===');
      const nykPre = await ctx.executeTool('get_team_cap_status', { teamId: 'NYK' });
      log('  Team: ' + nykPre.teamName);
      log('  Current Total Payroll: $' + (nykPre.totalPayroll / 1e6).toFixed(2) + 'M');
      log('  Apron Status: ' + nykPre.apronTier);
      log('  Second Apron Threshold: $' + (nykPre.secondApronLine / 1e6).toFixed(2) + 'M');
      log('  Distance to Second Apron: $' + (nykPre.distanceToSecondApron / 1e6).toFixed(2) + 'M');

      // 3. Validate Initial Active Trade
      log('\\n=== 3. Validating Active Trade on Machine ===');
      const valInitial = await ctx.executeTool('validate_cba_trade', {});
      log('  Trade Legality: ' + (valInitial.isLegal ? '✅ LEGAL' : '❌ ILLEGAL / VIOLATIONS FOUND'));
      if (valInitial.violations && valInitial.violations.length > 0) {
        valInitial.violations.forEach(v => {
          log('    - [' + v.teamId + '] ' + v.rule + ': ' + v.reason);
        });
      }

      // 4. Scan Facilitator Teams with matching TPE (>= $2.0M)
      log('\\n=== 4. Searching for 3rd-Party Facilitators (TPE >= $2.0M) ===');
      const facilitators = await ctx.executeTool('find_facilitator_teams', { minTpeAmount: 2000000 });
      facilitators.forEach(f => {
        const tpes = f.availableTPEs.map(t => t.name + ' ($' + (t.amount / 1e6).toFixed(2) + 'M)').join(', ');
        log('    - ' + f.fullName + ' (' + f.id + ') | Open Roster Spots: ' + f.openRosterSpots + ' | TPEs: ' + tpes);
      });

      // 5. Auto-Balance Trade Across 3 Teams
      log('\\n=== 5. Executing WebMCP auto_balance_trade for NYK ===');
      const balanceResult = await ctx.executeTool('auto_balance_trade', { primaryTeamId: 'NYK' });
      log('  Trade Rebalance Status: ' + balanceResult.tradeStatus);
      log('  CBA Legal: ' + (balanceResult.validation.isLegal ? '✅ YES (100% CBA Compliant)' : '❌ NO'));
      log('  Validation Summary: ' + balanceResult.validation.summary);

      // 6. Post-Trade Verification for NYK
      log('\\n=== 6. Verified Post-Trade Cap Sheet: New York Knicks (NYK) ===');
      const nykPost = await ctx.executeTool('get_team_cap_status', { teamId: 'NYK' });
      log('  New Total Payroll: $' + (nykPost.totalPayroll / 1e6).toFixed(2) + 'M');
      log('  New Apron Status: ' + nykPost.apronTier);
      log('  New Distance Below Second Apron: $' + (nykPost.distanceToSecondApron / 1e6).toFixed(2) + 'M');
      log('  Roster Count: ' + nykPost.roster.length + ' players');

      // Return complete data payload
      return {
        logs,
        tools,
        nykPre,
        valInitial,
        facilitators,
        balanceResult,
        nykPost
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  }, sessionId);

  if (evalResponse.exceptionDetails) {
    console.error('CDP Evaluation Exception:', evalResponse.exceptionDetails);
  } else {
    console.log('\n======================================================');
    console.log(' WebMCP EXECUTION REPORT');
    console.log('======================================================\n');
    evalResponse.result.value.logs.forEach(l => console.log(l));
    console.log('\n======================================================\n');
  }

  await sendCommand('Target.detachFromTarget', { sessionId });
  ws.close();
}

main().catch(console.error);
