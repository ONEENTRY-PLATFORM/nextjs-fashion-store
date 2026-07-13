/**
 * Tests for app/api/perf-dump/route.ts
 *
 * Strategy:
 *  - Mock the profiling module so tests don't depend on real ring-buffer state.
 *  - Use vi.stubEnv + vi.resetModules for the 409 / OE_PROFILE branch because
 *    `OE_PROFILE_ENABLED` is captured at module-load time in the route.
 *  - Call the exported GET / DELETE handlers with a plain `Request` object.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Profiling module mock (shared across most tests)
// ---------------------------------------------------------------------------
const mockReadTimings = vi.fn(() => []);
const mockAggregateTimings = vi.fn(() => []);
const mockClearTimings = vi.fn();
// OE_PROFILE_ENABLED is a const export — we control it per describe via
// vi.stubEnv + vi.resetModules where needed; for the "enabled" path we mock
// directly here.
let mockOeProfileEnabled = true;

vi.mock('./profiling', () => ({
  get OE_PROFILE_ENABLED() {
    return mockOeProfileEnabled;
  },
  readTimings: (...args: unknown[]) => mockReadTimings(...args),
  aggregateTimings: (...args: unknown[]) => mockAggregateTimings(...args),
  clearTimings: (...args: unknown[]) => mockClearTimings(...args),
}));

// ---------------------------------------------------------------------------
// next/server mock — provide a minimal NextResponse shim so we don't need the
// full Next.js runtime. The route only uses NextResponse.json().
// ---------------------------------------------------------------------------
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => {
      return new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TOKEN = 'secret-token';

function makeRequest(method = 'GET', url = 'http://localhost/api/perf-dump', token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['authorization'] = `Bearer ${token}`;
  return new Request(url, { method, headers });
}

async function parseJson(res: Response) {
  return JSON.parse(await res.text());
}

// The route is imported fresh per test so PERF_DUMP_TOKEN is picked up at
// module-evaluation time (it reads process.env.PERF_DUMP_TOKEN synchronously).
const importRoute = async () => {
  vi.resetModules();
  return import('../../../app/api/perf-dump/route');
};

afterEach(() => {
  vi.unstubAllEnvs();
  mockReadTimings.mockReset();
  mockAggregateTimings.mockReset();
  mockClearTimings.mockReset();
  mockOeProfileEnabled = true;
});

// ---------------------------------------------------------------------------
// Auth guard — 401 cases
// ---------------------------------------------------------------------------

describe('perf-dump route — 401 Unauthorized', () => {
  beforeEach(() => {
    vi.stubEnv('PERF_DUMP_TOKEN', TOKEN);
  });

  it('returns 401 when Authorization header is absent', async () => {
    const { GET } = await importRoute();
    const res = await GET(makeRequest('GET', 'http://localhost/api/perf-dump'));
    expect(res.status).toBe(401);
    const body = await parseJson(res);
    expect(body.error).toMatch(/[Uu]nauthorized/);
  });

  it('returns 401 when Bearer token does not match', async () => {
    const { GET } = await importRoute();
    const res = await GET(makeRequest('GET', 'http://localhost/api/perf-dump', 'wrong-token'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when PERF_DUMP_TOKEN env is unset (no anonymous access)', async () => {
    vi.unstubAllEnvs();
    // PERF_DUMP_TOKEN is unset — endpoint must be disabled entirely.
    const { GET } = await importRoute();
    const res = await GET(makeRequest('GET', 'http://localhost/api/perf-dump', TOKEN));
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// OE_PROFILE guard — 409
// ---------------------------------------------------------------------------

describe('perf-dump route — 409 when OE_PROFILE disabled', () => {
  it('returns 409 when OE_PROFILE_ENABLED is false', async () => {
    vi.stubEnv('PERF_DUMP_TOKEN', TOKEN);
    mockOeProfileEnabled = false;
    const { GET } = await importRoute();
    const res = await GET(makeRequest('GET', 'http://localhost/api/perf-dump', TOKEN));
    expect(res.status).toBe(409);
    const body = await parseJson(res);
    expect(body.error).toMatch(/OE_PROFILE/);
  });
});

// ---------------------------------------------------------------------------
// GET — 200 aggregate response
// ---------------------------------------------------------------------------

describe('perf-dump route — GET 200 aggregate', () => {
  beforeEach(() => {
    vi.stubEnv('PERF_DUMP_TOKEN', TOKEN);
    mockOeProfileEnabled = true;
  });

  it('returns aggregate shape with profile:"aggregate"', async () => {
    const fakeAggregate = [
      {
        name: 'loadProducts',
        count: 10,
        failCount: 0,
        minMs: 1,
        maxMs: 50,
        avgMs: 20,
        p50Ms: 18,
        p95Ms: 45,
        p99Ms: 50,
      },
    ];
    const fakeRecords = [
      { name: 'loadProducts', durationMs: 20, ok: true, ts: 1000 },
      { name: 'loadProducts', durationMs: 30, ok: true, ts: 2000 },
    ];
    mockAggregateTimings.mockReturnValue(fakeAggregate);
    mockReadTimings.mockReturnValue(fakeRecords);

    const { GET } = await importRoute();
    const res = await GET(makeRequest('GET', 'http://localhost/api/perf-dump', TOKEN));
    expect(res.status).toBe(200);

    const body = await parseJson(res);
    expect(body.profile).toBe('aggregate');
    expect(body.aggregate).toEqual(fakeAggregate);
    expect(body.totalRecords).toBe(2);
    expect(body.windowStart).toBe(1000);
    expect(body.windowEnd).toBe(2000);
    expect(typeof body.generatedAt).toBe('number');
  });

  it('returns windowStart/windowEnd as null when buffer is empty', async () => {
    mockAggregateTimings.mockReturnValue([]);
    mockReadTimings.mockReturnValue([]);

    const { GET } = await importRoute();
    const res = await GET(makeRequest('GET', 'http://localhost/api/perf-dump', TOKEN));
    const body = await parseJson(res);
    expect(body.windowStart).toBeNull();
    expect(body.windowEnd).toBeNull();
    expect(body.totalRecords).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// GET ?raw=1 — 200 raw response
// ---------------------------------------------------------------------------

describe('perf-dump route — GET ?raw=1', () => {
  beforeEach(() => {
    vi.stubEnv('PERF_DUMP_TOKEN', TOKEN);
    mockOeProfileEnabled = true;
  });

  it('returns raw records with profile:"raw" and count', async () => {
    const fakeRecords = [
      { name: 'loadStores', durationMs: 5, ok: true, ts: 100 },
      { name: 'loadStores', durationMs: 8, ok: false, ts: 200 },
    ];
    mockReadTimings.mockReturnValue(fakeRecords);

    const { GET } = await importRoute();
    const res = await GET(
      makeRequest('GET', 'http://localhost/api/perf-dump?raw=1', TOKEN),
    );
    expect(res.status).toBe(200);

    const body = await parseJson(res);
    expect(body.profile).toBe('raw');
    expect(body.count).toBe(2);
    expect(body.records).toEqual(fakeRecords);
    // aggregate should NOT be called for raw requests
    expect(mockAggregateTimings).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// DELETE — clears buffer
// ---------------------------------------------------------------------------

describe('perf-dump route — DELETE', () => {
  beforeEach(() => {
    vi.stubEnv('PERF_DUMP_TOKEN', TOKEN);
    mockOeProfileEnabled = true;
  });

  it('returns 401 when token missing', async () => {
    const { DELETE } = await importRoute();
    const res = await DELETE(makeRequest('DELETE', 'http://localhost/api/perf-dump'));
    expect(res.status).toBe(401);
    expect(mockClearTimings).not.toHaveBeenCalled();
  });

  it('calls clearTimings and returns ok:true with valid token', async () => {
    const { DELETE } = await importRoute();
    const res = await DELETE(makeRequest('DELETE', 'http://localhost/api/perf-dump', TOKEN));
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.ok).toBe(true);
    expect(body.cleared).toBe(true);
    expect(mockClearTimings).toHaveBeenCalledOnce();
  });
});
