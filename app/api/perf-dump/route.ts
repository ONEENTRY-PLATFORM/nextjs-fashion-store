import { NextResponse } from 'next/server';
import {
  OE_PROFILE_ENABLED,
  aggregateTimings,
  clearTimings,
  readTimings,
} from '../../../src/lib/oneentry/profiling';

/**
 * Ops endpoint to snapshot the in-memory OE loader-timing ring buffer
 * without needing shell access to the container. Off unless both:
 *
 *   OE_PROFILE=1        — profiling is capturing timings (see profiling.ts).
 *   PERF_DUMP_TOKEN=…   — a shared secret. Missing or mismatched → 401.
 *
 * Usage:
 *   # Aggregated snapshot (default) — one row per loader, sorted by p95 desc.
 *   curl -H "Authorization: Bearer $TOKEN" \
 *        https://…/api/perf-dump
 *
 *   # Raw record list — every captured call in insertion order (~5000 max).
 *   curl -H "Authorization: Bearer $TOKEN" \
 *        "https://…/api/perf-dump?raw=1"
 *
 *   # Reset the buffer before a fresh test run.
 *   curl -X DELETE -H "Authorization: Bearer $TOKEN" \
 *        https://…/api/perf-dump
 *
 * Never rendered / cached — must run on every hit.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REQUIRED_TOKEN = process.env.PERF_DUMP_TOKEN;

function authorised(req: Request): boolean {
  // Both an env token and a matching header are required — if the env var is
  // unset the endpoint is disabled outright (returns 401 rather than
  // accidentally serving anonymous requests).
  if (!REQUIRED_TOKEN) return false;
  const header = req.headers.get('authorization') ?? '';
  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return false;
  return value === REQUIRED_TOKEN;
}

export async function GET(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!OE_PROFILE_ENABLED) {
    return NextResponse.json(
      { error: 'OE_PROFILE is not enabled — set OE_PROFILE=1 in env and redeploy.' },
      { status: 409 },
    );
  }
  const url = new URL(req.url);
  const wantRaw = url.searchParams.get('raw') === '1';
  const now = Date.now();
  if (wantRaw) {
    const records = readTimings();
    return NextResponse.json({
      generatedAt: now,
      profile: 'raw',
      count: records.length,
      records,
    });
  }
  const aggregate = aggregateTimings();
  const records = readTimings();
  return NextResponse.json({
    generatedAt: now,
    profile: 'aggregate',
    totalRecords: records.length,
    // First and last timestamp of the window covered by this snapshot — helps
    // correlate with the k6 test window without needing to timestamp each row.
    windowStart: records.length > 0 ? records[0].ts : null,
    windowEnd: records.length > 0 ? records[records.length - 1].ts : null,
    aggregate,
  });
}

export async function DELETE(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  clearTimings();
  return NextResponse.json({ ok: true, cleared: true });
}
