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
    console.error('CapSpace Pro tab not found!');
    process.exit(1);
  }

  const { sessionId } = await sendCommand('Target.attachToTarget', { targetId: capTarget.targetId, flatten: true });

  const evalResponse = await sendCommand('Runtime.evaluate', {
    expression: `(async () => {
      const ctx = window.modelContext || document.modelContext || navigator.modelContext;
      if (!ctx) return { error: 'No modelContext found' };

      const logs = [];
      const log = (msg) => logs.push(msg);

      // Get registered tools
      let tools = [];
      if (typeof ctx.getTools === 'function') {
        const t = await ctx.getTools();
        tools = Array.isArray(t) ? t : Array.from(t || []);
      } else if (Array.isArray(ctx.tools)) {
        tools = ctx.tools;
      }

      const toolMap = new Map();
      tools.forEach(t => toolMap.set(t.name, t));

      log('=== 1. Discovered ' + tools.length + ' Registered WebMCP Tools ===');
      tools.forEach(t => log('  • ' + t.name + ' - ' + t.description));

      async function runTool(name, params = {}) {
        const t = toolMap.get(name);
        if (!t) throw new Error('Tool not found: ' + name);
        if (typeof t.execute === 'function') {
          return await t.execute(params);
        }
        throw new Error('No execute function on tool ' + name);
      }

      // Step 2: Query NYK cap status
      log('\\n=== 2. Current Cap Status (New York Knicks) ===');
      const nykPre = await runTool('get_team_cap_status', { teamId: 'NYK' });
      log('  Team: ' + nykPre.teamName);
      log('  Total Payroll: $' + (nykPre.totalPayroll / 1e6).toFixed(2) + 'M');
      log('  Apron Status: ' + nykPre.apronTier);
      log('  Second Apron Limit: $' + (nykPre.secondApronLine / 1e6).toFixed(2) + 'M');
      log('  Distance to Second Apron: $' + (nykPre.distanceToSecondApron / 1e6).toFixed(2) + 'M');

      // Step 3: Validate initial trade
      log('\\n=== 3. Validating Active Trade on Machine ===');
      const valInitial = await runTool('validate_cba_trade', {});
      log('  Legal: ' + (valInitial.isLegal ? '✅ LEGAL' : '❌ ILLEGAL / VIOLATIONS FOUND'));
      if (valInitial.violations && valInitial.violations.length > 0) {
        valInitial.violations.forEach(v => {
          log('    - [' + v.teamId + '] ' + v.rule + ': ' + v.reason);
        });
      }

      // Step 4: Find facilitator teams
      log('\\n=== 4. Searching for 3rd-Party Facilitators (TPE >= $2.0M) ===');
      const facilitators = await runTool('find_facilitator_teams', { minTpeAmount: 2000000 });
      facilitators.forEach(f => {
        const tpes = f.availableTPEs.map(t => t.name + ' ($' + (t.amount / 1e6).toFixed(2) + 'M)').join(', ');
        log('    - ' + f.fullName + ' (' + f.id + ') | Open Roster Spots: ' + f.openRosterSpots + ' | TPEs: ' + tpes);
      });

      // Step 5: Execute auto_balance_trade
      log('\\n=== 5. Rebalancing Trade across 3 Teams via WebMCP ===');
      const balanceResult = await runTool('auto_balance_trade', { primaryTeamId: 'NYK' });
      log('  Rebalance Status: ' + balanceResult.tradeStatus);
      log('  CBA Legal: ' + (balanceResult.validation.isLegal ? '✅ 100% LEGAL' : '❌ FAILED'));
      log('  Validation Summary: ' + balanceResult.validation.summary);

      // Step 6: Post-rebalance Cap Status
      log('\\n=== 6. Verified Post-Rebalance Cap Sheet (NYK) ===');
      const nykPost = await runTool('get_team_cap_status', { teamId: 'NYK' });
      log('  Final Total Payroll: $' + (nykPost.totalPayroll / 1e6).toFixed(2) + 'M');
      log('  Final Apron Status: ' + nykPost.apronTier);
      log('  Final Distance Below Second Apron: $' + (nykPost.distanceToSecondApron / 1e6).toFixed(2) + 'M');
      log('  Roster Size: ' + nykPost.roster.length + ' players');

      return {
        logs,
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
