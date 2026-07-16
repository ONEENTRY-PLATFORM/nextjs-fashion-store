'use client'
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { registerSchema } from '../utils/schemas';
import { REGISTER_MODAL_LABELS as L } from '../data/authLabels';
import { useCreateAccountT } from '../../lib/oneentry/labels/CreateAccountLabelsContext';
import { useSignUpFormSchema } from '../../lib/oneentry/auth/SignUpFormSchemaContext';
import { useAuthProviders } from '../hooks/useAuthProviders';
import { SOCIAL_PROVIDER_REGISTRY, isFormBasedProvider } from '../data/socialProviderRegistry';

function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer text-xs text-gray-600 leading-relaxed">
      <span
        className={`flex-shrink-0 w-4 h-4 mt-0.5 flex items-center justify-center border transition-colors duration-150 ${
          checked ? 'border-black bg-black' : 'border-gray-300 bg-white'
        }`}
        onClick={onChange}
      >
        {checked && <Image src="/icons/ui/check.svg" alt="" width={8} height={8} className="w-2 h-2" unoptimized />}
      </span>
      <span>{children}</span>
    </label>
  );
}

export function RegisterModal() {
  const { registerModalOpen, closeRegisterModal, openLoginModal, signUp, login, startGoogleOAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isCheckout = pathname?.startsWith('/checkout');
  const trapRef = useFocusTrap(registerModalOpen, closeRegisterModal);
  const lTitle      = useCreateAccountT('create_account_title',       L.title);
  const lOr         = useCreateAccountT('create_account_or',          L.dividerOr);
  const lBottomText = useCreateAccountT('create_account_bottom_text', L.switchPrompt);
  const lSignIn     = useCreateAccountT('create_account_sign_in',     L.switchCta);
  const lRegister   = useCreateAccountT('users_register_cta',         L.ctaSubmit);
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
    const result = registerSchema.safeParse({
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
        setError(e instanceof Error ? e.message : 'Google sign-in failed');
      }
      return;
    }
    // Apple / Facebook hidden until OE wires the providers.
    await login(provider, 'social');
    if (!isCheckout) router.push('/account');
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={closeRegisterModal} />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-modal-title"
        className="relative bg-white w-full max-w-md flex flex-col max-h-[92vh] overflow-y-auto"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 sticky top-0 bg-white z-10 border-b border-gray-200">
          <h2 id="register-modal-title" className="text-lg tracking-[0.12em] uppercase font-bold">{lTitle}</h2>
          {/* Close button — guest checkout is enabled, so a visible X
              mirrors the backdrop-click behaviour and matches shopper
              expectations for a dismissable modal. */}
          <button
            aria-label="Close"
            onClick={closeRegisterModal}
            className="hover:opacity-60 transition-opacity focus-visible:outline-none"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-8 py-6 space-y-5">
          {/* Social — list from OE via `getAuthProviders()`. Only providers
              with client wiring in SOCIAL_PROVIDER_REGISTRY are actionable;
              the rest render disabled with a "Coming soon" hint. */}
          {authProvidersLoading ? (
            <div className="grid grid-cols-1 gap-2" aria-busy="true" aria-label="Loading sign-up options">
              {[0, 1, 2].map((i) => (
                <div key={i} className="py-3 h-[38px] border border-gray-200 bg-gray-100 animate-pulse" />
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
                    className="flex items-center justify-center gap-1.5 py-3 text-xs border border-gray-300 font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors duration-200 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    {meta?.iconPath && (
                      <Image src={meta.iconPath} alt="" width={16} height={16} className="w-4 h-4" unoptimized />
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
              <span className="text-xs text-gray-400 tracking-widest uppercase">{lOr}</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>
          )}

          {/* First Name */}
          <div>
            <label className="block text-xs uppercase tracking-wide mb-1.5 font-semibold text-gray-600">
              {schema.first_name.title || L.firstNameLabel} <span className="text-primary-women">{L.required}</span>
            </label>
            <input
              type={schema.first_name.inputType || 'text'}
              value={firstName}
              onChange={e => { setFirstName(e.target.value); setError(''); }}
              placeholder={schema.first_name.placeholder || L.firstNamePlaceholder}
              autoComplete={schema.first_name.autoComplete || 'given-name'}
              className="w-full px-4 py-3 text-sm outline-none border border-gray-300 focus:border-black transition-colors duration-200"
            />
            {schema.first_name.helperText && <p className="text-xs text-gray-400 mt-1">{schema.first_name.helperText}</p>}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs uppercase tracking-wide mb-1.5 font-semibold text-gray-600">
              {schema.gender.title || L.genderLabel}
            </label>
            <div className="flex">
              {(schema.gender.options.length > 0
                ? schema.gender.options.filter(o => o.value === 'female' || o.value === 'male')
                : [{ value: 'female', title: L.genderFemale }, { value: 'male', title: L.genderMale }]
              ).map((opt, i) => (
                <button
                  key={opt.value}
                  onClick={() => setGender(opt.value as 'female' | 'male')}
                  className={`flex-1 py-3 text-sm capitalize tracking-wide transition-colors duration-200 focus-visible:outline-none ${
                    gender === opt.value
                      ? 'border border-black bg-black text-white font-bold'
                      : 'border border-gray-300 bg-white text-gray-600 font-normal hover:bg-gray-50'
                  } ${i > 0 ? '-ml-px' : ''}`}
                >
                  {opt.title}
                </button>
              ))}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs uppercase tracking-wide mb-1.5 font-semibold text-gray-600">
              {schema.email.title || L.emailLabel}
            </label>
            <input
              type={schema.email.inputType || 'email'}
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder={schema.email.placeholder || L.emailPlaceholder}
              autoComplete={schema.email.autoComplete || 'email'}
              className="w-full px-4 py-3 text-sm outline-none border border-gray-300 focus:border-black transition-colors duration-200"
            />
            {schema.email.helperText && <p className="text-xs text-gray-400 mt-1">{schema.email.helperText}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs uppercase tracking-wide mb-1.5 font-semibold text-gray-600">
              {schema.password.title || L.passwordLabel}
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : (schema.password.inputType || 'password')}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder={schema.password.placeholder || L.passwordPlaceholder}
                autoComplete={schema.password.autoComplete || 'new-password'}
                className="w-full px-4 py-3 text-sm outline-none pr-10 border border-gray-300 focus:border-black transition-colors duration-200"
              />
              <button onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 focus-visible:outline-none">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {schema.password.helperText && <p className="text-xs text-gray-400 mt-1">{schema.password.helperText}</p>}
          </div>

          {/* Marketing checkboxes */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <Checkbox checked={emailSub} onChange={() => setEmailSub(p => !p)}>
              {schema.users_subscribe_to_promotional_email.title || L.emailSubscribe}
            </Checkbox>
            <Checkbox checked={smsSub} onChange={() => setSmsSub(p => !p)}>
              {schema.users_subscribe_to_promotional_sms.title || L.smsSubscribe}
            </Checkbox>
          </div>

          {/* Legal */}
          <div className="pt-4 border-t border-gray-100">
            <Checkbox checked={agreed} onChange={() => setAgreed(p => !p)}>
              {schema.users_agree.text1 || L.agreePrefix}{' '}
              <a href="#" className="underline text-black">{schema.users_agree.termsTitle || L.termsLink}</a>
              {' '}{schema.users_agree.text2 || L.agreeAnd}{' '}
              <a href="#" className="underline text-black">{schema.users_agree.privacyTitle || L.privacyLink}</a>{' '}
              <span className="text-primary-women">{L.required}</span>
            </Checkbox>
          </div>

          {error && <p className="text-xs text-primary-men">{error}</p>}

          {/* CTA */}
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-4 text-white text-sm tracking-[0.2em] uppercase bg-black hover:bg-primary-women active:bg-primary-men font-semibold transition-colors duration-200 focus-visible:outline-none disabled:opacity-60 disabled:pointer-events-none"
          >
            {loading ? L.ctaLoading : lRegister}
          </button>

          {/* Switch */}
          <p className="text-xs text-center text-gray-500 pb-2">
            {lBottomText}{' '}
            <button onClick={openLoginModal} className="font-bold text-black hover:underline focus-visible:outline-none">
              {lSignIn}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
