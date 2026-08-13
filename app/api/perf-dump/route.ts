import { NextResponse } from 'next/server';

import { aggregateTimings, clearTimings, OE_PROFILE_ENABLED, readTimings } from '@/lib/oneentry/profiling';
import { se } from '@/lib/oneentry/server-errors';

/** Ops endpoint to snapshot the in-memory OE loader-timing ring buffer without needing shell access to the container. */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REQUIRED_TOKEN = process.env.PERF_DUMP_TOKEN;

function authorised(req: Request): boolean {
  // Both an env token and a matching header are required — if the env var is unset the endpoint is disabled outright.
  if (!REQUIRED_TOKEN) return false;
  const header = req.headers.get('authorization') ?? '';
  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return false;
  return value === REQUIRED_TOKEN;
}

export async function GET(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: await se('unauthorized') }, { status: 401 });
  }
  if (!OE_PROFILE_ENABLED) {
    return NextResponse.json({ error: await se('profileDisabled') }, { status: 409 });
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
    // First and last timestamp of the window covered by this snapshot — helps correlate with the k6 test window without needing to timestamp each row.
    windowStart: records.length > 0 ? records[0].ts : null,
    windowEnd: records.length > 0 ? records[records.length - 1].ts : null,
    aggregate,
  });
}

export async function DELETE(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: await se('unauthorized') }, { status: 401 });
  }
  clearTimings();
  return NextResponse.json({ ok: true, cleared: true });
}
