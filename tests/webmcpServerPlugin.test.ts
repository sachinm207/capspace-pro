import { describe, it, expect } from 'vitest';
import { webmcpServerPlugin } from '../src/server/webmcpServerPlugin';
import { EventEmitter } from 'events';

// Helper to simulate mock HTTP request and response
function createMockHttp() {
  const req: any = new EventEmitter();
  req.url = '';
  req.method = 'GET';
  req.headers = {};

  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: '',
    writeHead(status: number, headers?: Record<string, string>) {
      this.statusCode = status;
      if (headers) Object.assign(this.headers, headers);
      return this;
    },
    write(chunk: string) {
      this.body += chunk;
      return true;
    },
    end(chunk?: string) {
      if (chunk) this.body += chunk;
      this.reqEndCallback?.();
      return this;
    }
  };

  return { req, res };
}

describe('Vite WebMCP Bridge Server Plugin Integration', () => {
  const plugin = webmcpServerPlugin();
  let middleware: any;

  // Setup middleware extractor
  const mockServer: any = {
    middlewares: {
      use(fn: any) {
        middleware = fn;
      }
    }
  };

  if (typeof plugin.configureServer === 'function') {
    (plugin.configureServer as any)(mockServer);
  }

  it('handles CORS OPTIONS pre-flight request', async () => {
    const { req, res } = createMockHttp();
    req.url = '/api/webmcp/execute';
    req.method = 'OPTIONS';

    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });

    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(nextCalled).toBe(false);
  });

  it('exposes /api/webmcp/tools with WebMCP/1.0 tool manifest', async () => {
    const { req, res } = createMockHttp();
    req.url = '/api/webmcp/tools';
    req.method = 'GET';

    await middleware(req, res, () => {});

    expect(res.statusCode).toBe(200);
    const manifest = JSON.parse(res.body);
    expect(manifest.protocol).toBe('WebMCP/1.0');
    expect(manifest.tools.length).toBeGreaterThanOrEqual(7);
    expect(manifest.tools.some((t: any) => t.name === 'auto_balance_trade')).toBe(true);
  });

  it('executes list_all_teams via POST /api/webmcp/execute', async () => {
    const { req, res } = createMockHttp();
    req.url = '/api/webmcp/execute';
    req.method = 'POST';

    const promise = new Promise<void>((resolve) => {
      res.reqEndCallback = resolve;
    });

    await middleware(req, res, () => {});

    // Send payload
    req.emit('data', Buffer.from(JSON.stringify({ tool: 'list_all_teams' })));
    req.emit('end');

    await promise;

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.success).toBe(true);
    expect(data.result.length).toBe(30);
  });

  it('executes get_team_cap_status via POST /api/webmcp/execute', async () => {
    const { req, res } = createMockHttp();
    req.url = '/api/webmcp/execute';
    req.method = 'POST';

    const promise = new Promise<void>((resolve) => {
      res.reqEndCallback = resolve;
    });

    await middleware(req, res, () => {});

    req.emit('data', Buffer.from(JSON.stringify({ tool: 'get_team_cap_status', params: { teamId: 'BOS' } })));
    req.emit('end');

    await promise;

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.success).toBe(true);
    expect(data.result.teamId).toBe('BOS');
    expect(data.result.apronTier).toBe('second_apron');
  });

  it('executes auto_balance_trade via POST /api/webmcp/execute', async () => {
    const { req, res } = createMockHttp();
    req.url = '/api/webmcp/execute';
    req.method = 'POST';

    const promise = new Promise<void>((resolve) => {
      res.reqEndCallback = resolve;
    });

    await middleware(req, res, () => {});

    req.emit('data', Buffer.from(JSON.stringify({ tool: 'auto_balance_trade', params: { primaryTeamId: 'NYK' } })));
    req.emit('end');

    await promise;

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.success).toBe(true);
    expect(data.validation.isLegal).toBe(true);
  });

  it('returns error for unknown tool via POST /api/webmcp/execute', async () => {
    const { req, res } = createMockHttp();
    req.url = '/api/webmcp/execute';
    req.method = 'POST';

    const promise = new Promise<void>((resolve) => {
      res.reqEndCallback = resolve;
    });

    await middleware(req, res, () => {});

    req.emit('data', Buffer.from(JSON.stringify({ tool: 'unknown_fake_tool' })));
    req.emit('end');

    await promise;

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.error).toContain('Unknown tool');
  });
});
