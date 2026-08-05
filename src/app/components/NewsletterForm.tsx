'use client'
import { useState, useTransition } from 'react';
import { submitForm } from '../../lib/oneentry/forms/submit';
import {
  useFormPlaceholder,
  useFormLabel,
  useFormMessage,
} from '../../lib/oneentry/forms/FormPlaceholdersContext';
import { NEWSLETTER_FORM_LABELS as L } from '../data/commonLabels';

/** OE form marker — the form lives on the `subscribe` page in the admin panel. */
const FORM = 'subscribe_new_drops';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  // Every visible string is authored on the OE form itself: the field label and
  // placeholder on the `subscribe_new_drops_email` attribute, the CTA on the
  // `…_button` attribute, and both result messages on the form record. Local
  // constants are only the offline fallback.
  const placeholder = useFormPlaceholder(FORM, 'subscribe_new_drops_email', 'placeholder_email', L.placeholder);
  const submitLabel = useFormLabel(FORM, 'subscribe_new_drops_button', L.submit);
  const successMessage = useFormMessage(FORM, 'successMessage', L.success);
  const failureMessage = useFormMessage(FORM, 'unsuccessMessage', L.failure);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;
    startTransition(async () => {
      // OE needs both `formModuleConfigId` (the id from the page's
      // `moduleFormConfigs`) and `moduleEntityIdentifier` (the page's
      // `pageUrl`) — without them OE rejects with "Incorrect formIdentifier
      // for provided config". Look these up with `Pages.getPageByUrl('subscribe')`
      // → `page.moduleFormConfigs[0]` if they ever change in OE admin.
      const result = await submitForm(
        FORM,
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
        // form isn't set up in the admin panel. That one stays in code on
        // purpose: it fires precisely when OE has no form to read copy from.
        const friendly = /formidentifier|form identifier/i.test(result.error)
          ? L.notConfigured
          : result.error;
        setError(friendly);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-sm mx-auto" data-testid="newsletter-form">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 px-3 py-2 text-sm bg-white/5 border border-white/15 outline-none focus:border-white/40 transition-colors"
        disabled={isPending}
        data-testid="newsletter-email"
      />
      <button
        type="submit"
        disabled={isPending || email.trim().length === 0}
        className="px-4 py-2 text-xs tracking-widest uppercase font-bold text-black bg-white hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        data-testid="newsletter-submit"
      >
        {isPending ? L.pending : submitLabel}
      </button>
      <span
        className={`text-xs ml-3 ${status === 'success' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'sr-only'}`}
        role="status"
        data-testid="newsletter-status"
      >
        {status === 'success' && successMessage}
        {status === 'error' && (error || failureMessage)}
      </span>
    </form>
  );
}
