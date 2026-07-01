'use client'
import { useEffect, useState } from 'react';
import { SectionTitle } from '../shared';
import { SOCIAL_NETWORKS_LABELS as L } from '../../../data/accountLabels';
import { requestGoogleIdToken } from '../../../../lib/google-auth';
import { connectGoogleAccountAction } from '../../../../lib/oneentry/auth/actions';

interface OAuthProvider {
  id: 'google' | 'apple' | 'facebook';
  name: string;
  /** Disabled until OE wires the provider on this tenant. */
  enabled: boolean;
}

const OAUTH_PROVIDERS: OAuthProvider[] = [
  { id: 'google',   name: 'Google',   enabled: true },
  { id: 'apple',    name: 'Apple',    enabled: false },
  { id: 'facebook', name: 'Facebook', enabled: false },
];

// Local persistence key for the "connected" badge. OE doesn't expose a
// per-user `linkedProviders` field on this tenant, so we remember the link
// in localStorage. Disconnect just drops the flag — Google sessions
// themselves live independently in the user's browser.
const STORAGE_KEY = 'oe_linked_providers';

function readLinkedProviders(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function writeLinkedProviders(providers: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
  } catch {
    /* quota — ignore */
  }
}

export function SocialNetworksSection() {
  const [linked, setLinked] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLinked(readLinkedProviders());
  }, []);

  const setProviderLinked = (id: string, isLinked: boolean) => {
    const next = isLinked
      ? Array.from(new Set([...linked, id]))
      : linked.filter((p) => p !== id);
    setLinked(next);
    writeLinkedProviders(next);
  };

  const handleConnect = async (id: OAuthProvider['id']) => {
    setError(null);
    if (id !== 'google') return;
    setBusy(id);
    try {
      const idToken = await requestGoogleIdToken();
      const res = await connectGoogleAccountAction(idToken);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setProviderLinked(id, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect Google');
    } finally {
      setBusy(null);
    }
  };

  const handleDisconnect = (id: OAuthProvider['id']) => {
    setProviderLinked(id, false);
  };

  return (
    <div>
      <SectionTitle title={L.title} />
      <div className="space-y-3">
        {OAUTH_PROVIDERS.map((s) => {
          const isLinked = linked.includes(s.id);
          const isBusy = busy === s.id;
          return (
            <div key={s.id} className="flex items-center justify-between p-4 border border-[#e5e7eb]">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wide font-semibold">{s.name}</span>
                {isLinked && (
                  <span className="text-[10px] tracking-widest uppercase text-green-700 bg-green-50 border border-green-200 px-2 py-0.5">
                    Connected
                  </span>
                )}
              </div>
              {!s.enabled ? (
                <button
                  className="text-xs tracking-wide uppercase font-semibold text-gray-400 cursor-not-allowed"
                  disabled
                >
                  {L.connect}
                </button>
              ) : isLinked ? (
                <button
                  onClick={() => handleDisconnect(s.id)}
                  className="text-xs tracking-wide uppercase focus-visible:outline-none hover:opacity-70 transition-opacity font-semibold text-black"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(s.id)}
                  disabled={isBusy}
                  className="text-xs tracking-wide uppercase focus-visible:outline-none hover:opacity-70 transition-opacity font-semibold text-black disabled:opacity-50"
                >
                  {isBusy ? '…' : L.connect}
                </button>
              )}
            </div>
          );
        })}
        {error && (
          <p className="text-xs text-red-600 mt-2" role="alert">{error}</p>
        )}
      </div>
    </div>
  );
}
