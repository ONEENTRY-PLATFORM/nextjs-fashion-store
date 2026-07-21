import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { externalOrigin } from '../../../../app/auth/callback/google/route';

/**
 * Helpers — build a NextRequest with an arbitrary set of headers.
 */
function makeRequest(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new Request(url, { headers }));
}

describe('externalOrigin', () => {
  // --- non-loopback host: always https, x-forwarded-proto is ignored ---

  it('non-loopback host, no forwarded headers → https', () => {
    const req = makeRequest('http://localhost:3000/auth/callback/google', {
      host: 'shop.example.com',
    });
    expect(externalOrigin(req)).toBe('https://shop.example.com');
  });

  it('non-loopback host, x-forwarded-proto: http → https (header ignored)', () => {
    const req = makeRequest('https://localhost:3000/auth/callback/google', {
      host: 'shop.example.com',
      'x-forwarded-proto': 'http',
    });
    expect(externalOrigin(req)).toBe('https://shop.example.com');
  });

  it('non-loopback host, x-forwarded-proto: https → https (same result, header irrelevant)', () => {
    const req = makeRequest('http://localhost:3000/auth/callback/google', {
      host: 'shop.example.com',
      'x-forwarded-proto': 'https',
    });
    expect(externalOrigin(req)).toBe('https://shop.example.com');
  });

  // --- loopback host: always http, x-forwarded-proto is ignored ---

  it('localhost:port, no forwarded headers → http', () => {
    const req = makeRequest('https://localhost:3000/auth/callback/google', {
      host: 'localhost:3002',
    });
    expect(externalOrigin(req)).toBe('http://localhost:3002');
  });

  it('localhost:port, x-forwarded-proto: https → http (header ignored for loopback)', () => {
    const req = makeRequest('https://localhost:3000/auth/callback/google', {
      host: 'localhost:3002',
      'x-forwarded-proto': 'https',
    });
    expect(externalOrigin(req)).toBe('http://localhost:3002');
  });

  it('127.0.0.1:port, no forwarded headers → http', () => {
    const req = makeRequest('https://localhost:3000/auth/callback/google', {
      host: '127.0.0.1:3000',
    });
    expect(externalOrigin(req)).toBe('http://127.0.0.1:3000');
  });

  // --- x-forwarded-host takes precedence over host header ---

  it('x-forwarded-host (non-loopback) takes precedence over host header → https', () => {
    const req = makeRequest('http://localhost:3000/auth/callback/google', {
      host: 'internal.host.example',
      'x-forwarded-host': 'public.example.com',
    });
    expect(externalOrigin(req)).toBe('https://public.example.com');
  });

  it('x-forwarded-host present, x-forwarded-proto present but ignored → https from host logic', () => {
    const req = makeRequest('http://localhost:3000/auth/callback/google', {
      host: 'internal.host.example',
      'x-forwarded-host': 'public.example.com',
      'x-forwarded-proto': 'https',
    });
    expect(externalOrigin(req)).toBe('https://public.example.com');
  });

  it('x-forwarded-host only, no x-forwarded-proto, non-loopback forwarded host → https', () => {
    const req = makeRequest('https://localhost:3000/auth/callback/google', {
      'x-forwarded-host': 'shop.example.com',
    });
    expect(externalOrigin(req)).toBe('https://shop.example.com');
  });

  // --- fallback: no host or forwarded-host headers → new URL(request.url).origin ---

  it('falls back to request.url origin when no host or forwarded-host headers present', () => {
    const url = 'https://shop.example.com:8443/auth/callback/google';
    const req = makeRequest(url);
    // NextRequest derives a `host` header from the URL, so the result is built
    // via the host-branch (non-loopback → https). Verify it equals the URL origin.
    expect(externalOrigin(req)).toBe(new URL(url).origin);
  });
});
