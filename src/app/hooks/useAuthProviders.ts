'use client';
import { useEffect, useState } from 'react';

import { type AuthProviderInfo, getAuthProvidersAction } from '@/lib/oneentry/auth/actions';

/** Module-level cache so LoginModal, RegisterModal and SocialNetworksSection share one server round-trip per page load instead of each firing its own `getAuthProviders` call. */
let cache: AuthProviderInfo[] | null = null;
let inflight: Promise<AuthProviderInfo[]> | null = null;

async function loadOnce(): Promise<AuthProviderInfo[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = getAuthProvidersAction().then((list) => {
      cache = list;
      inflight = null;
      return list;
    });
  }
  return inflight;
}

export function useAuthProviders(): {
  providers: AuthProviderInfo[];
  loading: boolean;
} {
  // Seed straight from the module cache.
  const [providers, setProviders] = useState<AuthProviderInfo[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    loadOnce().then((list) => {
      if (cancelled) return;
      setProviders(list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { providers, loading };
}
