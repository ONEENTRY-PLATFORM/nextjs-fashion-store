'use client'
import { useState, useTransition } from 'react';
import { submitForm } from '../../lib/oneentry/forms/submit';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;
    startTransition(async () => {
      // The `subscribe_new_drops` form lives on the OE `subscribe` page.
      // OE needs both `formModuleConfigId` (the id from the page's
      // `moduleFormConfigs`) and `moduleEntityIdentifier` (the page's
      // `pageUrl`) — without them OE rejects with "Incorrect formIdentifier
      // for provided config". Look these up with `Pages.getPageByUrl('subscribe')`
      // → `page.moduleFormConfigs[0]` if they ever change in OE admin.
      const result = await submitForm(
        'subscribe_new_drops',
        [{ marker: 'subscribe_new_drops_email', value: email.trim(), type: 'string' }],
        { moduleConfigId: 52, moduleEntityIdentifier: 'subscribe' },
      );
      if (result.ok) {
        setStatus('success');
        setEmail('');
        setError('');
      } else {
        setStatus('error');
        // OE returns "Incorrect formIdentifier for provided config" when the
        // form isn't set up in the admin panel. Show a friendlier message
        // to the shopper — the raw error only helps developers.
        const friendly = /formidentifier|form identifier/i.test(result.error)
          ? "Newsletter isn't set up yet — please check back soon."
          : result.error;
        setError(friendly);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-sm mx-auto">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
        placeholder="Your email address"
        className="flex-1 px-3 py-2 text-sm bg-white/5 border border-white/15 outline-none focus:border-white/40 transition-colors"
        disabled={isPending}
      />
      <button
        type="submit"
        disabled={isPending || email.trim().length === 0}
        className="px-4 py-2 text-xs tracking-widest uppercase font-bold text-black bg-white hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? '...' : 'Subscribe'}
      </button>
      <span
        className={`text-xs ml-3 ${status === 'success' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'sr-only'}`}
        role="status"
      >
        {status === 'success' && 'Subscribed!'}
        {status === 'error' && (error || 'Something went wrong.')}
      </span>
    </form>
  );
}
