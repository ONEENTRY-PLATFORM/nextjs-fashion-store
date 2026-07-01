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
      const result = await submitForm('subscribe_new_drops', [
        { marker: 'subscribe_new_drops_email', value: email.trim(), type: 'string' },
      ]);
      if (result.ok) {
        setStatus('success');
        setEmail('');
        setError('');
      } else {
        setStatus('error');
        setError(result.error);
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
