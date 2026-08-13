'use client';
import { Eye, EyeOff, Mail, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/app/context/AuthContext';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';
import { useSchemas } from '@/app/utils/useFormMessages';
import {
  getPasswordResetPolicy,
  type PasswordResetPolicy,
  requestPasswordResetCodeAction,
  resetPasswordAction,
  verifyPasswordResetCodeAction,
} from '@/lib/oneentry/auth/password-reset';
import { useDict } from '@/lib/oneentry/labels/DictContext';

/** Password-recovery copy. */
export const PASSWORD_RESET_LABELS = {
  title: 'Reset Password',
  stepEmailHeading: 'Enter your email',
  stepEmailHint: "We'll send a one-time code to the email on your account.",
  emailLabel: 'Email Address',
  emailPlaceholder: 'you@example.com',
  sendCode: 'Send code',
  sending: 'Sending…',
  stepCodeHeading: 'Enter the code',
  /** `%email%` is replaced with the address the code went to. */
  stepCodeHint: 'We sent a code to %email%.',
  codeLabel: 'Code',
  codePlaceholder: 'Code from the email',
  verifyCode: 'Continue',
  verifying: 'Checking…',
  /** `%seconds%` is replaced with the remaining validity of the code. */
  codeExpiresIn: 'The code expires in %seconds%s',
  codeExpired: 'The code has expired — request a new one.',
  resendCode: 'Send a new code',
  stepPasswordHeading: 'Choose a new password',
  passwordLabel: 'New Password',
  passwordPlaceholder: 'Min. 8 characters',
  confirmLabel: 'Repeat Password',
  confirmPlaceholder: 'Repeat the password',
  submit: 'Save password',
  submitting: 'Saving…',
  success: 'Password changed — signing you in…',
  backToLogin: 'Back to sign in',
  closeLabel: 'Close',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  unavailable: 'Password recovery is unavailable for this store.',
} as const;

/** The three things the shopper does, in the order OneEntry requires them. */
type Step = 'email' | 'code' | 'password';

/** Password recovery, the way OneEntry actually implements it. */
export function ResetPasswordModal() {
  const { resetPasswordModalOpen } = useAuth();
  if (!resetPasswordModalOpen) return null;
  return <ResetPasswordFlow />;
}

/** The open modal: three steps, their state, and the OE calls behind them. */
function ResetPasswordFlow() {
  const L = useDict('sign_in_reset_', PASSWORD_RESET_LABELS);
  const { closeResetPasswordModal, resetPasswordEmail, openLoginModal, login } = useAuth();
  const trapRef = useFocusTrap(true, closeResetPasswordModal);

  const [policy, setPolicy] = useState<PasswordResetPolicy | null>(null);
  const [policyLoaded, setPolicyLoaded] = useState(false);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(resetPasswordEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  /** Seconds left on the current code; `0` once it expired (or none is out). */
  const [secondsLeft, setSecondsLeft] = useState(0);

  const schemas = useSchemas(useMemo(() => ({ resetCodeLength: policy?.codeLength ?? null }), [policy?.codeLength]));

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Provider config (code length + TTL).
  useEffect(() => {
    let cancelled = false;
    void getPasswordResetPolicy().then((p) => {
      if (cancelled) return;
      setPolicy(p);
      setPolicyLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Countdown on the outstanding code.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const sendCode = useCallback(async () => {
    const parsed = schemas.resetRequestSchema.safeParse({ email: email.trim() });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError('');
    setNotice('');
    setLoading(true);
    const res = await requestPasswordResetCodeAction(email);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? '');
      return;
    }
    setCode('');
    setSecondsLeft(policy?.codeTtlSec ?? 0);
    setStep('code');
  }, [email, policy?.codeTtlSec, schemas]);

  const verifyCode = useCallback(async () => {
    const parsed = schemas.resetCodeSchema.safeParse({ code });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError('');
    setLoading(true);
    const res = await verifyPasswordResetCodeAction(email, code);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? '');
      return;
    }
    setStep('password');
  }, [code, email, schemas]);

  const submitPassword = useCallback(async () => {
    const parsed = schemas.resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError('');
    setLoading(true);
    const res = await resetPasswordAction(email, code, password);
    if (!res.ok) {
      setLoading(false);
      setError(res.error ?? '');
      return;
    }
    // The shopper just proved ownership of the address and picked the password — signing them in here saves a pointless second form.
    setNotice(L.success);
    const signedIn = await login(email.trim(), password);
    setLoading(false);
    if (!signedIn) {
      // Password changed but sign-in failed (network, expired session): send them to the sign-in form rather than leaving a dead-end success note.
      setNotice('');
      openLoginModal();
    }
  }, [code, confirmPassword, email, L.success, login, openLoginModal, password, schemas]);

  const unavailable = policyLoaded && policy === null;
  /** A TTL the admin panel never configured leaves the code's lifetime unknown. */
  const ttlKnown = policy?.codeTtlSec != null;
  const codeExpired = step === 'code' && ttlKnown && secondsLeft === 0;

  return (
    <div className="fixed inset-0 z-300 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={closeResetPasswordModal} />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-password-modal-title"
        data-testid="reset-password-modal"
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto bg-white"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-8 py-6">
          <h2 id="reset-password-modal-title" className="text-lg font-bold tracking-[0.12em] uppercase">
            {L.title}
          </h2>
          <button
            aria-label={L.closeLabel}
            data-testid="reset-close"
            onClick={closeResetPasswordModal}
            className="transition-opacity hover:opacity-60 focus-visible:outline-none"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-5 px-8 py-6">
          {unavailable ? (
            <p className="text-sm text-gray-600" data-testid="reset-unavailable">
              {L.unavailable}
            </p>
          ) : (
            <>
              {step === 'email' && (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">{L.stepEmailHeading}</h3>
                    <p className="mt-1 text-xs text-gray-500">{L.stepEmailHint}</p>
                  </div>
                  <div>
                    <label
                      htmlFor="reset-email"
                      className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600 uppercase"
                    >
                      {L.emailLabel}
                    </label>
                    <div className="relative">
                      <input
                        id="reset-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError('');
                        }}
                        placeholder={L.emailPlaceholder}
                        data-testid="reset-email"
                        autoComplete="username"
                        className="w-full border border-gray-300 px-4 py-3 pr-10 text-sm transition-colors duration-200 outline-none focus:border-black"
                        onKeyDown={(e) => e.key === 'Enter' && sendCode()}
                      />
                      <Mail size={14} className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                  {/* Held until the provider config lands: the code's TTL comes
                      from there, and requesting one before we know it would
                      strand the shopper on a code step with no countdown and no
                      working resend. */}
                  <button
                    onClick={sendCode}
                    disabled={loading || !policyLoaded}
                    data-testid="reset-send-code"
                    className="w-full bg-black py-4 text-sm font-semibold tracking-[0.2em] text-white uppercase transition-colors duration-200 hover:bg-primary-women focus-visible:outline-none active:bg-primary-men disabled:pointer-events-none disabled:opacity-60"
                  >
                    {loading ? L.sending : L.sendCode}
                  </button>
                </div>
              )}

              {step === 'code' && (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">{L.stepCodeHeading}</h3>
                    <p className="mt-1 text-xs text-gray-500" data-testid="reset-code-hint">
                      {L.stepCodeHint.replace('%email%', email.trim())}
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor="reset-code"
                      className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600 uppercase"
                    >
                      {L.codeLabel}
                    </label>
                    <input
                      id="reset-code"
                      type="text"
                      inputMode="numeric"
                      value={code}
                      maxLength={policy?.codeLength ?? undefined}
                      onChange={(e) => {
                        setCode(e.target.value);
                        setError('');
                      }}
                      placeholder={L.codePlaceholder}
                      data-testid="reset-code"
                      autoComplete="one-time-code"
                      className="w-full border border-gray-300 px-4 py-3 text-sm tracking-[0.3em] transition-colors duration-200 outline-none focus:border-black"
                      onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
                    />
                    {ttlKnown && (
                      <p className="mt-1 text-xs text-gray-400" data-testid="reset-code-countdown">
                        {codeExpired ? L.codeExpired : L.codeExpiresIn.replace('%seconds%', String(secondsLeft))}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={verifyCode}
                    disabled={loading || codeExpired}
                    data-testid="reset-verify-code"
                    className="w-full bg-black py-4 text-sm font-semibold tracking-[0.2em] text-white uppercase transition-colors duration-200 hover:bg-primary-women focus-visible:outline-none active:bg-primary-men disabled:pointer-events-none disabled:opacity-60"
                  >
                    {loading ? L.verifying : L.verifyCode}
                  </button>
                  <button
                    onClick={sendCode}
                    disabled={loading || secondsLeft > 0}
                    data-testid="reset-resend"
                    type="button"
                    className="w-full text-xs text-primary-women hover:underline focus-visible:outline-none disabled:pointer-events-none disabled:text-gray-400 disabled:no-underline"
                  >
                    {L.resendCode}
                  </button>
                </div>
              )}

              {step === 'password' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">{L.stepPasswordHeading}</h3>
                  <div>
                    <label
                      htmlFor="reset-new-password"
                      className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600 uppercase"
                    >
                      {L.passwordLabel}
                    </label>
                    <div className="relative">
                      <input
                        id="reset-new-password"
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError('');
                        }}
                        placeholder={L.passwordPlaceholder}
                        data-testid="reset-new-password"
                        autoComplete="new-password"
                        className="w-full border border-gray-300 px-4 py-3 pr-10 text-sm transition-colors duration-200 outline-none focus:border-black"
                      />
                      <button
                        type="button"
                        aria-label={showPw ? L.hidePassword : L.showPassword}
                        onClick={() => setShowPw((p) => !p)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 focus-visible:outline-none"
                      >
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="reset-confirm-password"
                      className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600 uppercase"
                    >
                      {L.confirmLabel}
                    </label>
                    <input
                      id="reset-confirm-password"
                      type={showPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError('');
                      }}
                      placeholder={L.confirmPlaceholder}
                      data-testid="reset-confirm-password"
                      autoComplete="new-password"
                      className="w-full border border-gray-300 px-4 py-3 text-sm transition-colors duration-200 outline-none focus:border-black"
                      onKeyDown={(e) => e.key === 'Enter' && submitPassword()}
                    />
                  </div>
                  <button
                    onClick={submitPassword}
                    disabled={loading}
                    data-testid="reset-submit"
                    className="w-full bg-black py-4 text-sm font-semibold tracking-[0.2em] text-white uppercase transition-colors duration-200 hover:bg-primary-women focus-visible:outline-none active:bg-primary-men disabled:pointer-events-none disabled:opacity-60"
                  >
                    {loading ? L.submitting : L.submit}
                  </button>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-xs wrap-break-word whitespace-normal text-primary-men" data-testid="reset-error">
              {error}
            </p>
          )}
          {notice && (
            <p className="text-xs text-gray-600" data-testid="reset-notice">
              {notice}
            </p>
          )}

          <p className="text-center text-xs text-gray-500">
            <button
              onClick={openLoginModal}
              data-testid="reset-back-to-login"
              className="font-bold text-black hover:underline focus-visible:outline-none"
            >
              {L.backToLogin}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
