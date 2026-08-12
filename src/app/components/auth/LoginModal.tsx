'use client';
import { Eye, EyeOff, Mail, X } from 'lucide-react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

import { TIMINGS } from '@/app/constants/timings';
import { useAuth } from '@/app/context/AuthContext';
import { isFormBasedProvider, SOCIAL_PROVIDER_REGISTRY } from '@/app/data/socialProviderRegistry';
import { useAuthProviders } from '@/app/hooks/useAuthProviders';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';
import { useSchemas } from '@/app/utils/useFormMessages';
import { useRouter } from '@/lib/i18n/navigation';
import { useSignUpFormSchema } from '@/lib/oneentry/auth/SignUpFormSchemaContext';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

export const LOGIN_MODAL_LABELS = {
  title: 'Sign In',
  socialGoogle: 'Continue with Google',
  socialApple: 'Continue with Apple',
  socialFacebook: 'Continue with Facebook',
  dividerOr: 'or',
  identifierLabel: 'Phone or Email',
  identifierPlaceholder: 'you@example.com or +44...',
  passwordLabel: 'Password',
  passwordPlaceholder: '••••••••',
  forgotPassword: 'Forgot password?',
  ctaSubmit: 'Log In',
  ctaLoading: 'Signing in…',
  switchPrompt: "Don't have an account?",
  switchCta: 'Create one',
  errorInvalidCredentials: 'Invalid email or password.',
  errorGoogleFailed: 'Google sign-in failed',
  closeLabel: 'Close',
  loadingOptions: 'Loading sign-in options',
  dismissError: 'Dismiss error',
} as const;

function SocialBtn({
  iconPath,
  label,
  onClick,
  disabled,
}: {
  iconPath?: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-2 border border-gray-300 py-3 text-sm font-medium transition-colors duration-200 hover:bg-gray-50 focus-visible:outline-none active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
    >
      {iconPath && <Image src={iconPath} alt="" width={18} height={18} className="size-4.5" unoptimized />}
      <span>{label}</span>
    </button>
  );
}

export function LoginModal() {
  const L = useDict('sign_in_modal_', LOGIN_MODAL_LABELS);
  const schemas = useSchemas();
  const {
    loginModalOpen,
    closeLoginModal,
    openRegisterModal,
    openResetPasswordModal,
    login,
    startGoogleOAuth,
    authError,
    setAuthError,
  } = useAuth();
  const lTitle = useT('sign_in_title', L.title);
  const lOr = useT('sign_in_or', L.dividerOr);
  const lForgot = useT('sign_in_forgot_password', L.forgotPassword);
  const lBottomText = useT('sign_in_bottom_text', L.switchPrompt);
  const lCreateOne = useT('sign_in_create_one', L.switchCta);
  const lGoogleFail = useT('sign_in_google_failed', L.errorGoogleFailed);
  const lClose = useT('sign_in_close', L.closeLabel);
  const lLoadingOpt = useT('sign_in_loading_options', L.loadingOptions);
  const lDismissErr = useT('sign_in_dismiss_error', L.dismissError);
  const schema = useSignUpFormSchema();
  const emailLabel = schema.email.title || L.identifierLabel;
  const emailPlaceholder = schema.email.placeholder || L.identifierPlaceholder;
  const emailHelper = schema.email.helperText;
  const emailInputType = schema.email.inputType || 'text';
  const emailAutoComp = schema.email.autoComplete || 'username';
  const passwordLabel = schema.password.title || L.passwordLabel;
  const passwordPlaceholder = schema.password.placeholder || L.passwordPlaceholder;
  const passwordHelper = schema.password.helperText;
  const passwordAutoComp = schema.password.autoComplete || 'current-password';
  const router = useRouter();
  const pathname = usePathname();
  const isCheckout = pathname?.startsWith('/checkout');
  const [input, setInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  // Social-provider (Google) errors get their own slot near the Google
  // button so a long OE response doesn't visually stick to the password
  // field. Cleared whenever the form errors are cleared too.
  const [socialError, setSocialError] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const trapRef = useFocusTrap(loginModalOpen, closeLoginModal);
  const { providers: authProviders, loading: authProvidersLoading } = useAuthProviders();
  const socialProviders = authProviders.filter((p) => !isFormBasedProvider(p.identifier, p.type));

  useEffect(() => {
    if (loginModalOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
      abortRef.current?.abort();
    };
  }, [loginModalOpen]);

  if (!loginModalOpen) return null;

  const handleLogin = async () => {
    const result = schemas.loginSchema.safeParse({ input: input.trim(), password });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, TIMINGS.LOGIN_MOCK_DELAY);
      controller.signal.addEventListener('abort', () => {
        clearTimeout(t);
        resolve();
      });
    });
    if (controller.signal.aborted) return;
    const ok = await login(input, password);
    setLoading(false);
    if (!ok) {
      setError(L.errorInvalidCredentials);
      return;
    }
    if (!isCheckout) router.push('/account');
  };

  const handleSocial = async (provider: string) => {
    setError('');
    setSocialError('');
    if (provider === 'google') {
      setLoading(true);
      try {
        // Full-page redirect to Google. After OE exchanges the code the
        // callback route bounces the user back — we come back to /account
        // (post-checkout would be handled by that page's own logic).
        await startGoogleOAuth(isCheckout ? window.location.pathname : '/account');
      } catch (e) {
        setSocialError(e instanceof Error ? e.message : lGoogleFail);
        setLoading(false);
      }
      return;
    }
    // Apple / Facebook are temporarily hidden; this branch only fires if
    // they are restored before the OE OAuth wiring is finished.
    await login(provider, 'social');
    if (!isCheckout) router.push('/account');
  };

  return (
    <div className="fixed inset-0 z-300 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={closeLoginModal} />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto bg-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-8 py-6">
          <h2 id="login-modal-title" className="text-lg font-bold tracking-[0.12em] uppercase">
            {lTitle}
          </h2>
          {/* Close button — guest checkout is enabled, so a visible X
              mirrors the backdrop-click behaviour and matches shopper
              expectations for a dismissable modal. */}
          <button
            aria-label={lClose}
            onClick={closeLoginModal}
            className="transition-opacity hover:opacity-60 focus-visible:outline-none"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-5 px-8 py-6">
          {/* Social — list is pulled from OE via `getAuthProviders()`. Buttons for
              providers we don't have client wiring for (only google today) render
              disabled with a "Coming soon" hint. */}
          {authProvidersLoading ? (
            <div className="space-y-2.5" aria-busy="true" aria-label={lLoadingOpt}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-11.5 w-full animate-pulse border border-gray-200 bg-gray-100 py-3" />
              ))}
            </div>
          ) : socialProviders.length > 0 ? (
            <div className="space-y-2.5">
              {socialProviders.map((p) => {
                const meta = SOCIAL_PROVIDER_REGISTRY[p.identifier];
                const wired = meta?.wired ?? false;
                return (
                  <SocialBtn
                    key={p.identifier}
                    iconPath={meta?.iconPath}
                    label={wired ? p.title : `${p.title} — Coming soon`}
                    onClick={() => handleSocial(p.identifier)}
                    disabled={!wired}
                  />
                );
              })}
              {socialError && (
                <p className="text-xs wrap-break-word whitespace-normal text-primary-men">{socialError}</p>
              )}
            </div>
          ) : null}

          {/* Divider present while providers are loading OR after they render
              — avoids a layout jump when the social block hydrates. */}
          {(authProvidersLoading || socialProviders.length > 0) && (
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs tracking-widest text-gray-400 uppercase">{lOr}</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>
          )}

          {/* Fields */}
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600 uppercase">
                {emailLabel}
              </label>
              <div className="relative">
                <input
                  type={emailInputType}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setError('');
                  }}
                  placeholder={emailPlaceholder}
                  data-testid="login-email"
                  autoComplete={emailAutoComp}
                  className="w-full border border-gray-300 px-4 py-3 pr-10 text-sm transition-colors duration-200 outline-none focus:border-black"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <Mail size={14} className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400" />
              </div>
              {emailHelper && <p className="mt-1 text-xs text-gray-400">{emailHelper}</p>}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold tracking-wide text-gray-600 uppercase">{passwordLabel}</label>
                {/* Opens OE's code-based recovery flow. It used to `alert()`
                    that a reset link had been sent — there is no link, and
                    nothing was sent. */}
                <button
                  className="text-xs text-primary-women hover:underline focus-visible:outline-none"
                  onClick={() => openResetPasswordModal(input)}
                  data-testid="login-forgot-password"
                  type="button"
                >
                  {lForgot}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder={passwordPlaceholder}
                  data-testid="login-password"
                  autoComplete={passwordAutoComp}
                  className="w-full border border-gray-300 px-4 py-3 pr-10 text-sm transition-colors duration-200 outline-none focus:border-black"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <button
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 focus-visible:outline-none"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {passwordHelper && <p className="mt-1 text-xs text-gray-400">{passwordHelper}</p>}
            </div>
          </div>

          {/* Prefer the OAuth-callback error banner over the transient
              inline validation error — a redirect back from Google is
              the only path that populates `authError`, and typing in
              either input clears the local `error` state anyway. */}
          {authError ? (
            <div className="flex items-start justify-between gap-2 rounded-none border border-red-100 bg-red-50 px-3 py-2 text-xs text-primary-men">
              <span>{authError}</span>
              <button
                type="button"
                onClick={() => setAuthError(null)}
                aria-label={lDismissErr}
                className="text-gray-500 transition-colors hover:text-black focus-visible:outline-none"
              >
                <X size={12} strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            error && <p className="text-xs text-primary-men">{error}</p>
          )}

          {/* CTA */}
          <button
            onClick={handleLogin}
            disabled={loading}
            data-testid="login-submit"
            className="w-full bg-black py-4 text-sm font-semibold tracking-[0.2em] text-white uppercase transition-colors duration-200 hover:bg-primary-women focus-visible:outline-none active:bg-primary-men disabled:pointer-events-none disabled:opacity-60"
          >
            {loading ? L.ctaLoading : L.ctaSubmit}
          </button>

          {/* Switch */}
          <p className="text-center text-xs text-gray-500">
            {lBottomText}{' '}
            <button
              onClick={openRegisterModal}
              className="font-bold text-black hover:underline focus-visible:outline-none"
            >
              {lCreateOne}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
