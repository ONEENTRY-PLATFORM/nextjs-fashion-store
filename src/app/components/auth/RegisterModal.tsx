'use client';
import { Eye, EyeOff, X } from 'lucide-react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/app/context/AuthContext';
import { isFormBasedProvider, SOCIAL_PROVIDER_REGISTRY } from '@/app/data/socialProviderRegistry';
import { useAuthProviders } from '@/app/hooks/useAuthProviders';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';
import { useSchemas } from '@/app/utils/useFormMessages';
import { useRouter } from '@/lib/i18n/navigation';
import { useSignUpFormSchema } from '@/lib/oneentry/auth/SignUpFormSchemaContext';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

export const REGISTER_MODAL_LABELS = {
  title: 'Create Account',
  socialGoogle: 'Google',
  socialApple: 'Apple',
  socialFacebook: 'Facebook',
  dividerOr: 'or',
  firstNameLabel: 'First Name',
  firstNamePlaceholder: 'Jane',
  genderLabel: 'Gender',
  genderFemale: 'Female',
  genderMale: 'Male',
  emailLabel: 'Email Address',
  emailPlaceholder: 'you@example.com',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Min. 8 characters',
  emailSubscribe: 'Subscribe to promotional email newsletters about trends, events, and exclusive offers',
  smsSubscribe: 'Subscribe to promotional SMS notifications about offers and customer events',
  agreePrefix: 'I agree to the',
  termsLink: 'Terms of Service',
  agreeAnd: 'and',
  privacyLink: 'Personal Data Processing & Protection Policy',
  required: '*',
  ctaSubmit: 'Register',
  ctaLoading: 'Creating Account…',
  switchPrompt: 'Already have an account?',
  switchCta: 'Sign in',
  errorGeneric: 'Something went wrong. Please try again.',
  errorGoogleFailed: 'Google sign-in failed',
  closeLabel: 'Close',
  loadingOptions: 'Loading sign-up options',
} as const;

/**
 * Consent / subscription checkbox.
 *
 * Wraps a visually-hidden native input instead of hanging `onClick` on a bare
 * `<span>`. The previous version was not a checkbox to anything but the eye:
 * it could not be reached or toggled by keyboard, a screen reader announced
 * the caption as plain text with no role or checked state, and — since the
 * `<label>` had no control to associate with — clicking the caption did
 * nothing, leaving only a 16 px box as the hit target. On the terms checkbox
 * that made registration impossible without a mouse.
 *
 * Mirrors the pattern the catalogue filters already use (`MobileFilterBody`).
 * Anchors inside `children` stay safe: per the HTML spec a label's activation
 * behaviour is skipped when the click targets interactive content, so opening
 * the Terms link does not silently tick the box.
 */
function Checkbox({
  checked,
  onChange,
  children,
  testId,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
  /** Stable hook for the E2E suite; also names the control in failures. */
  testId?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-gray-600">
      <input type="checkbox" checked={checked} onChange={onChange} data-testid={testId} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center border transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-black ${
          checked ? 'border-black bg-black' : 'border-gray-300 bg-white'
        }`}
      >
        {checked && <Image src="/icons/ui/check.svg" alt="" width={8} height={8} className="size-2" unoptimized />}
      </span>
      <span>{children}</span>
    </label>
  );
}

export function RegisterModal() {
  const L = useDict('create_account_modal_', REGISTER_MODAL_LABELS);
  const schemas = useSchemas();
  const { registerModalOpen, closeRegisterModal, openLoginModal, signUp, login, startGoogleOAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isCheckout = pathname?.startsWith('/checkout');
  const trapRef = useFocusTrap(registerModalOpen, closeRegisterModal);
  const lTitle = useT('create_account_title', L.title);
  const lOr = useT('create_account_or', L.dividerOr);
  const lBottomText = useT('create_account_bottom_text', L.switchPrompt);
  const lSignIn = useT('create_account_sign_in', L.switchCta);
  const lRegister = useT('users_register_cta', L.ctaSubmit);
  const lGoogleFail = useT('create_account_google_failed', L.errorGoogleFailed);
  const lClose = useT('create_account_close', L.closeLabel);
  const lLoadingOpt = useT('create_account_loading_options', L.loadingOptions);
  const schema = useSignUpFormSchema();

  const [firstName, setFirstName] = useState('');
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [emailSub, setEmailSub] = useState(false);
  const [smsSub, setSmsSub] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { providers: authProviders, loading: authProvidersLoading } = useAuthProviders();
  const socialProviders = authProviders.filter((p) => !isFormBasedProvider(p.identifier, p.type));

  useEffect(() => {
    if (registerModalOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
      abortRef.current?.abort();
    };
  }, [registerModalOpen]);

  if (!registerModalOpen) return null;

  const handleRegister = async () => {
    const result = schemas.registerSchema.safeParse({
      firstName: firstName.trim(),
      email: email.trim(),
      password,
      confirmPassword: password, // confirm field not shown separately; validated on a dedicated confirm field if added
      acceptsTerms: agreed || undefined,
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    const res = await signUp({
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      phone: '',
      gender,
      subscribeEmail: emailSub,
      subscribeSms: smsSub,
      agreed,
    });
    setLoading(false);
    if (abortRef.current?.signal.aborted) return;
    if (!res.ok) {
      setError(res.error ?? L.errorGeneric);
      return;
    }
    if (!isCheckout) router.push('/account');
  };

  const handleSocial = async (provider: string) => {
    setError('');
    if (provider === 'google') {
      try {
        await startGoogleOAuth(isCheckout ? window.location.pathname : '/account');
      } catch (e) {
        setError(e instanceof Error ? e.message : lGoogleFail);
      }
      return;
    }
    // Apple / Facebook hidden until OE wires the providers.
    await login(provider, 'social');
    if (!isCheckout) router.push('/account');
  };

  return (
    <div className="fixed inset-0 z-300 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={closeRegisterModal} />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-modal-title"
        className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto bg-white"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-8 py-5">
          <h2 id="register-modal-title" className="text-lg font-bold tracking-[0.12em] uppercase">
            {lTitle}
          </h2>
          {/* Close button — guest checkout is enabled, so a visible X
              mirrors the backdrop-click behaviour and matches shopper
              expectations for a dismissable modal. */}
          <button
            aria-label={lClose}
            onClick={closeRegisterModal}
            className="transition-opacity hover:opacity-60 focus-visible:outline-none"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-5 px-8 py-6">
          {/* Social — list from OE via `getAuthProviders()`. Only providers
              with client wiring in SOCIAL_PROVIDER_REGISTRY are actionable;
              the rest render disabled with a "Coming soon" hint. */}
          {authProvidersLoading ? (
            <div className="grid grid-cols-1 gap-2" aria-busy="true" aria-label={lLoadingOpt}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-9.5 animate-pulse border border-gray-200 bg-gray-100 py-3" />
              ))}
            </div>
          ) : socialProviders.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {socialProviders.map((p) => {
                const meta = SOCIAL_PROVIDER_REGISTRY[p.identifier];
                const wired = meta?.wired ?? false;
                return (
                  <button
                    key={p.identifier}
                    onClick={() => handleSocial(p.identifier)}
                    disabled={!wired}
                    className="flex items-center justify-center gap-1.5 border border-gray-300 py-3 text-xs font-medium transition-colors duration-200 hover:bg-gray-50 focus-visible:outline-none active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                  >
                    {meta?.iconPath && (
                      <Image src={meta.iconPath} alt="" width={16} height={16} className="size-4" unoptimized />
                    )}
                    {wired ? p.title : `${p.title} — Coming soon`}
                  </button>
                );
              })}
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

          {/* First Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600 uppercase">
              {schema.first_name.title || L.firstNameLabel} <span className="text-primary-women">{L.required}</span>
            </label>
            <input
              type={schema.first_name.inputType || 'text'}
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                setError('');
              }}
              placeholder={schema.first_name.placeholder || L.firstNamePlaceholder}
              autoComplete={schema.first_name.autoComplete || 'given-name'}
              className="w-full border border-gray-300 px-4 py-3 text-sm transition-colors duration-200 outline-none focus:border-black"
            />
            {schema.first_name.helperText && (
              <p className="mt-1 text-xs text-gray-400">{schema.first_name.helperText}</p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600 uppercase">
              {schema.gender.title || L.genderLabel}
            </label>
            <div className="flex">
              {(schema.gender.options.length > 0
                ? schema.gender.options.filter((o) => o.value === 'female' || o.value === 'male')
                : [
                    { value: 'female', title: L.genderFemale },
                    { value: 'male', title: L.genderMale },
                  ]
              ).map((opt, i) => (
                <button
                  key={opt.value}
                  onClick={() => setGender(opt.value as 'female' | 'male')}
                  className={`flex-1 py-3 text-sm tracking-wide capitalize transition-colors duration-200 focus-visible:outline-none ${
                    gender === opt.value
                      ? 'border border-black bg-black font-bold text-white'
                      : 'border border-gray-300 bg-white font-normal text-gray-600 hover:bg-gray-50'
                  } ${i > 0 ? '-ml-px' : ''}`}
                >
                  {opt.title}
                </button>
              ))}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600 uppercase">
              {schema.email.title || L.emailLabel}
            </label>
            <input
              type={schema.email.inputType || 'email'}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder={schema.email.placeholder || L.emailPlaceholder}
              autoComplete={schema.email.autoComplete || 'email'}
              className="w-full border border-gray-300 px-4 py-3 text-sm transition-colors duration-200 outline-none focus:border-black"
            />
            {schema.email.helperText && <p className="mt-1 text-xs text-gray-400">{schema.email.helperText}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600 uppercase">
              {schema.password.title || L.passwordLabel}
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : schema.password.inputType || 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder={schema.password.placeholder || L.passwordPlaceholder}
                autoComplete={schema.password.autoComplete || 'new-password'}
                className="w-full border border-gray-300 px-4 py-3 pr-10 text-sm transition-colors duration-200 outline-none focus:border-black"
              />
              <button
                onClick={() => setShowPw((p) => !p)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 focus-visible:outline-none"
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {schema.password.helperText && <p className="mt-1 text-xs text-gray-400">{schema.password.helperText}</p>}
          </div>

          {/* Marketing checkboxes */}
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <Checkbox checked={emailSub} onChange={() => setEmailSub((p) => !p)} testId="register-subscribe-email">
              {schema.users_subscribe_to_promotional_email.title || L.emailSubscribe}
            </Checkbox>
            <Checkbox checked={smsSub} onChange={() => setSmsSub((p) => !p)} testId="register-subscribe-sms">
              {schema.users_subscribe_to_promotional_sms.title || L.smsSubscribe}
            </Checkbox>
          </div>

          {/* Legal */}
          <div className="border-t border-gray-100 pt-4">
            <Checkbox checked={agreed} onChange={() => setAgreed((p) => !p)} testId="register-agree-terms">
              {schema.users_agree.text1 || L.agreePrefix}{' '}
              <a href="#" className="text-black underline">
                {schema.users_agree.termsTitle || L.termsLink}
              </a>{' '}
              {schema.users_agree.text2 || L.agreeAnd}{' '}
              <a href="#" className="text-black underline">
                {schema.users_agree.privacyTitle || L.privacyLink}
              </a>{' '}
              <span className="text-primary-women">{L.required}</span>
            </Checkbox>
          </div>

          {error && <p className="text-xs text-primary-men">{error}</p>}

          {/* CTA */}
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-black py-4 text-sm font-semibold tracking-[0.2em] text-white uppercase transition-colors duration-200 hover:bg-primary-women focus-visible:outline-none active:bg-primary-men disabled:pointer-events-none disabled:opacity-60"
          >
            {loading ? L.ctaLoading : lRegister}
          </button>

          {/* Switch */}
          <p className="pb-2 text-center text-xs text-gray-500">
            {lBottomText}{' '}
            <button
              onClick={openLoginModal}
              className="font-bold text-black hover:underline focus-visible:outline-none"
            >
              {lSignIn}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
