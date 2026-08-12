'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import { isFormBasedProvider, SOCIAL_PROVIDER_REGISTRY } from '@/app/data/socialProviderRegistry';
import { useAuthProviders } from '@/app/hooks/useAuthProviders';
import { SectionTitle } from '@/app/pages/account/shared';
import { startGoogleOAuth } from '@/lib/google-auth';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

// ─── My Data → Social Networks section ──────────────────────────────────────
export const SOCIAL_NETWORKS_LABELS = {
  title: 'Connected Social Accounts',
  connectedBadge: 'Connected',
  connect: 'Connect',
  disconnect: 'Disconnect',
  errorConnect: 'Failed to connect Google',
  loading: 'Loading…',
  emptyProviders: 'No social sign-in providers configured.',
  comingSoon: 'Coming soon',
} as const;

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
  const L = useDict('user_account_social_', SOCIAL_NETWORKS_LABELS);
  const { providers, loading } = useAuthProviders();
  const socialProviders = providers.filter((p) => !isFormBasedProvider(p.identifier, p.type));
  const [linked, setLinked] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = readLinkedProviders();
    let next = stored;
    // If we're coming back from the Google OAuth callback, promote Google
    // to "linked" and drop the flag from the URL so a refresh doesn't
    // re-trigger the effect.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.get('googleLinked') === '1') {
        next = Array.from(new Set([...stored, 'google']));
        writeLinkedProviders(next);
        url.searchParams.delete('googleLinked');
        window.history.replaceState({}, '', url.toString());
      }
    }
    // Reading localStorage + a one-shot URL query flag on mount is exactly
    // the "sync from external source" case the rule allows — no cascading
    // renders because the effect has no deps and runs once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLinked(next);
  }, []);

  const setProviderLinked = (id: string, isLinked: boolean) => {
    const next = isLinked ? Array.from(new Set([...linked, id])) : linked.filter((p) => p !== id);
    setLinked(next);
    writeLinkedProviders(next);
  };

  const handleConnect = async (id: string) => {
    setError(null);
    // Only Google is wired client-side today. For everything else we render
    // the button as disabled, so this guard is defence-in-depth.
    if (id !== 'google') return;
    setBusy(id);
    try {
      // Full-page redirect per MCP `auth-provider` rule. On return, the
      // callback bounces us back to /account with ?googleLinked=1, which
      // the mount effect above picks up to set the badge.
      await startGoogleOAuth('/account?googleLinked=1');
    } catch (e) {
      setError(e instanceof Error ? e.message : lErrConnect);
      setBusy(null);
    }
  };

  const handleDisconnect = (id: string) => {
    setProviderLinked(id, false);
  };

  const lTitle = useT('user_account_social_title', L.title);
  const lConnected = useT('user_account_social_connected', L.connectedBadge);
  const lDisconnect = useT('user_account_social_disconnect', L.disconnect);
  const lErrConnect = useT('user_account_social_connect_error', L.errorConnect);
  const lLoading = useT('user_account_social_loading', L.loading);
  const lEmpty = useT('user_account_social_empty', L.emptyProviders);
  const lComingSoon = useT('user_account_social_coming_soon', L.comingSoon);

  return (
    <div>
      <SectionTitle title={lTitle} />
      <div className="space-y-3">
        {loading && socialProviders.length === 0 && <p className="text-xs text-gray-400">{lLoading}</p>}
        {!loading && socialProviders.length === 0 && <p className="text-xs text-gray-400">{lEmpty}</p>}
        {socialProviders.map((p) => {
          const meta = SOCIAL_PROVIDER_REGISTRY[p.identifier];
          const wired = meta?.wired ?? false;
          const isLinked = linked.includes(p.identifier);
          const isBusy = busy === p.identifier;
          return (
            <div key={p.identifier} className="flex items-center justify-between border border-[#e5e7eb] p-4">
              <div className="flex items-center gap-3">
                {meta?.iconPath && (
                  <Image src={meta.iconPath} alt="" width={18} height={18} className="size-4.5" unoptimized />
                )}
                <span className="text-xs font-semibold tracking-wide uppercase">{p.title}</span>
                {isLinked && (
                  <span className="border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] tracking-widest text-green-700 uppercase">
                    {lConnected}
                  </span>
                )}
              </div>
              {!wired ? (
                <button
                  className="cursor-not-allowed text-xs font-semibold tracking-wide text-gray-400 uppercase"
                  disabled
                  title={lComingSoon}
                >
                  {L.connect}
                </button>
              ) : isLinked ? (
                <button
                  onClick={() => handleDisconnect(p.identifier)}
                  className="text-xs font-semibold tracking-wide text-black uppercase transition-opacity hover:opacity-70 focus-visible:outline-none"
                >
                  {lDisconnect}
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(p.identifier)}
                  disabled={isBusy}
                  className="text-xs font-semibold tracking-wide text-black uppercase transition-opacity hover:opacity-70 focus-visible:outline-none disabled:opacity-50"
                >
                  {isBusy ? '…' : L.connect}
                </button>
              )}
            </div>
          );
        })}
        {error && (
          <p className="mt-2 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
