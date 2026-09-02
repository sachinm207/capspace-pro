import fs from 'fs';
import WebSocket from 'ws';

async function run() {
  const devToolsFile = fs.readFileSync('/home/sachinm/.config/google-chrome/DevToolsActivePort', 'utf8');
  const [port, browserPath] = devToolsFile.trim().split('\n');
  const browserWsUrl = `ws://127.0.0.1:${port}${browserPath}`;

  // 1. Connect to browser target to get target list
  const browserWs = new WebSocket(browserWsUrl);
  let id = 1;
  const sendBrowser = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = id++;
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === msgId) {
        browserWs.off('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    browserWs.on('message', handler);
    browserWs.send(JSON.stringify({ id: msgId, method, params }));
  });

  await new Promise((resolve, reject) => {
    browserWs.on('open', resolve);
    browserWs.on('error', reject);
  });

  const { targetInfos } = await sendBrowser('Target.getTargets');
  const capTarget = targetInfos.find(t => t.url.includes('3000') || t.title.includes('CapSpace'));
  if (!capTarget) {
    console.error('CapSpace target not found!');
    process.exit(1);
  }
  console.log(`Found CapSpace target: "${capTarget.title}" (ID: ${capTarget.targetId})`);
  browserWs.close();

  // 2. Connect DIRECTLY to the page websocket
  const pageWsUrl = `ws://127.0.0.1:${port}/devtools/page/${capTarget.targetId}`;
  console.log(`Connecting directly to page WS: ${pageWsUrl}...`);
  const pageWs = new WebSocket(pageWsUrl);

  const sendPage = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = id++;
    const timeout = setTimeout(() => reject(new Error(`Timeout on ${method}`)), 5000);
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === msgId) {
        clearTimeout(timeout);
        pageWs.off('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    pageWs.on('message', handler);
    pageWs.send(JSON.stringify({ id: msgId, method, params }));
  });

  await new Promise((resolve, reject) => {
    pageWs.on('open', resolve);
    pageWs.on('error', reject);
  });

  console.log('Connected to CapSpace page! Executing WebMCP flow in page...');

  const evalResult = await sendPage('Runtime.evaluate', {
    expression: `(async () => {
      const ctx = window.modelContext || document.modelContext || navigator.modelContext;
      if (!ctx) return { error: 'No modelContext found on window, document, or navigator' };

      const logs = [];
      const log = (msg) => logs.push(msg);

      log('=== 1. Inspecting WebMCP Context & Tools ===');
      let tools = [];
      if (typeof ctx.getTools === 'function') {
        const t = ctx.getTools();
        tools = Array.isArray(t) ? t : Array.from(t || []);
      } else if (Array.isArray(ctx.tools)) {
        tools = ctx.tools;
      }
      log('Discovered ' + tools.length + ' Registered WebMCP Tools:');
      tools.forEach(t => log('  • ' + t.name + ': ' + t.description));

      log('\\n=== 2. Cap Status Inspection (NYK) ===');
      const nykStatus = await ctx.executeTool('get_team_cap_status', { teamId: 'NYK' });
      log('Team: ' + nykStatus.teamName);
      log('Current Payroll: $' + (nykStatus.totalPayroll / 1e6).toFixed(2) + 'M');
      log('Apron Status: ' + nykStatus.apronTier);
      log('2nd Apron Limit: $' + (nykStatus.secondApronLine / 1e6).toFixed(2) + 'M');
      log('Distance to 2nd Apron: $' + (nykStatus.distanceToSecondApron / 1e6).toFixed(2) + 'M');

      log('\\n=== 3. Auditing Active On-Screen Trade ===');
      const activeValidation = await ctx.executeTool('validate_cba_trade', {});
      log('Trade Legality: ' + (activeValidation.isLegal ? 'LEGAL' : 'ILLEGAL / VIOLATION'));
      if (!activeValidation.isLegal && activeValidation.violations) {
        activeValidation.violations.forEach(v => {
          log('  ❌ [' + v.teamId + '] ' + v.rule + ' (Severity: ' + v.severity + '): ' + v.reason);
        });
      }

      log('\\n=== 4. Scanning for Facilitator Teams (min TPE $2.0M) ===');
      const facilitators = await ctx.executeTool('find_facilitator_teams', { minTpeAmount: 2000000 });
      log('Found ' + facilitators.length + ' viable facilitator team(s):');
      facilitators.forEach(f => {
        const tpeList = f.availableTPEs.map(t => t.name + ' ($' + (t.amount/1e6).toFixed(2) + 'M, expires ' + t.expires + ')').join('; ');
        log('  🏀 ' + f.fullName + ' (' + f.id + ') | Open Spots: ' + f.openRosterSpots + ' | TPEs: ' + tpeList);
      });

      log('\\n=== 5. Executing WebMCP Trade Rebalance (auto_balance_trade) ===');
      const balanceResult = await ctx.executeTool('auto_balance_trade', { primaryTeamId: 'NYK' });
      log('Rebalance Result Status: ' + balanceResult.tradeStatus);
      log('Rebalance Validation: ' + (balanceResult.validation.isLegal ? '✅ 100% LEGAL' : '❌ INVALID'));
      log('Validation Summary: ' + balanceResult.validation.summary);

      log('\\n=== 6. Verified Final Cap Sheet for NYK ===');
      const nykStatusAfter = await ctx.executeTool('get_team_cap_status', { teamId: 'NYK' });
      log('Final Payroll: $' + (nykStatusAfter.totalPayroll / 1e6).toFixed(2) + 'M');
      log('Final Apron Tier: ' + nykStatusAfter.apronTier);
      log('Final Distance to 2nd Apron: $' + (nykStatusAfter.distanceToSecondApron / 1e6).toFixed(2) + 'M');
      log('Roster Count: ' + nykStatusAfter.roster.length);

      return {
        success: true,
        logs,
        tools,
        nykStatus,
        activeValidation,
        facilitators,
        balanceResult,
        nykStatusAfter
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  if (evalResult.exceptionDetails) {
    console.error('Exception during evaluation:', evalResult.exceptionDetails);
  } else {
    console.log('\n======================================================');
    console.log('🤖 CapSpace Pro WebMCP Agent Session Output:');
    console.log('======================================================');
    evalResult.result.value.logs.forEach(l => console.log(l));
    console.log('======================================================\n');
  }

  pageWs.close();
}

run().catch(console.error);
