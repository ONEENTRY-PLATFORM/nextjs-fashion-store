'use client'
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { TIMINGS } from '../constants/timings';
import { X, Eye, EyeOff, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { requestGoogleIdToken } from '../../lib/google-auth';
import { useRouter, usePathname } from 'next/navigation';
import { loginSchema } from '../utils/schemas';
import { LOGIN_MODAL_LABELS as L } from '../data/authLabels';
import { useSignInT } from '../../lib/oneentry/labels/SignInLabelsContext';
import { useSignUpFormSchema } from '../../lib/oneentry/auth/SignUpFormSchemaContext';

function SocialBtn({ logo, label, onClick }: { logo: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 w-full py-3 text-sm border border-gray-300 font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors duration-200 focus-visible:outline-none"
    >
      {logo}
      <span>{label}</span>
    </button>
  );
}

const SOCIAL_LOGO_CLASS = 'w-[18px] h-[18px]';
const GoogleLogo = () => <Image src="/icons/auth/google.svg" alt="" width={18} height={18} className={SOCIAL_LOGO_CLASS} unoptimized />;
const AppleLogo = () => <Image src="/icons/auth/apple.svg" alt="" width={18} height={18} className={SOCIAL_LOGO_CLASS} unoptimized />;
const FacebookLogo = () => <Image src="/icons/auth/facebook.svg" alt="" width={18} height={18} className={SOCIAL_LOGO_CLASS} unoptimized />;

export function LoginModal() {
  const { loginModalOpen, closeLoginModal, openRegisterModal, login, loginWithGoogle } = useAuth();
  const lTitle      = useSignInT('sign_in_title',          L.title);
  const lOr         = useSignInT('sign_in_or',             L.dividerOr);
  const lForgot     = useSignInT('sign_in_forgot_password', L.forgotPassword);
  const lBottomText = useSignInT('sign_in_bottom_text',    L.switchPrompt);
  const lCreateOne  = useSignInT('sign_in_create_one',     L.switchCta);
  const schema = useSignUpFormSchema();
  const emailLabel       = schema.email.title       || L.identifierLabel;
  const emailPlaceholder = schema.email.placeholder || L.identifierPlaceholder;
  const emailHelper      = schema.email.helperText;
  const emailInputType   = schema.email.inputType   || 'text';
  const emailAutoComp    = schema.email.autoComplete || 'username';
  const passwordLabel       = schema.password.title       || L.passwordLabel;
  const passwordPlaceholder = schema.password.placeholder || L.passwordPlaceholder;
  const passwordHelper      = schema.password.helperText;
  const passwordAutoComp    = schema.password.autoComplete || 'current-password';
  const router = useRouter();
  const pathname = usePathname();
  const isCheckout = pathname?.startsWith('/checkout');
  const [input, setInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const trapRef = useFocusTrap(loginModalOpen, closeLoginModal);

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
    const result = loginSchema.safeParse({ input: input.trim(), password });
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
      controller.signal.addEventListener('abort', () => { clearTimeout(t); resolve(); });
    });
    if (controller.signal.aborted) return;
    const ok = await login(input, password);
    setLoading(false);
    if (!ok) { setError(L.errorInvalidCredentials); return; }
    if (!isCheckout) router.push('/account');
  };

  const handleSocial = async (provider: string) => {
    setError('');
    if (provider === 'google') {
      setLoading(true);
      try {
        const idToken = await requestGoogleIdToken();
        const result = await loginWithGoogle(idToken);
        if (!result.ok) {
          setError(result.error ?? L.errorInvalidCredentials);
          return;
        }
        if (!isCheckout) router.push('/account');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Google sign-in failed');
      } finally {
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
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={closeLoginModal} />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        className="relative bg-white w-full max-w-md flex flex-col max-h-[90vh] overflow-y-auto"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200">
          <h2 id="login-modal-title" className="text-lg tracking-[0.12em] uppercase font-bold">{lTitle}</h2>
          {/* Close button temporarily hidden — sign-in required while guest checkout is disabled.
          <button onClick={closeLoginModal} className="hover:opacity-60 transition-opacity focus-visible:outline-none">
            <X size={20} strokeWidth={1.5} />
          </button>
          */}
        </div>

        <div className="px-8 py-6 space-y-5">
          {/* Social */}
          <div className="space-y-2.5">
            <SocialBtn logo={<GoogleLogo />} label={L.socialGoogle} onClick={() => handleSocial('google')} />
            {/* TODO: re-enable when OE wires Apple / Facebook auth providers.
            <SocialBtn logo={<AppleLogo />} label={L.socialApple} onClick={() => handleSocial('apple')} />
            <SocialBtn logo={<FacebookLogo />} label={L.socialFacebook} onClick={() => handleSocial('facebook')} />
            */}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400 tracking-widest uppercase">{lOr}</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs uppercase tracking-wide mb-1.5 font-semibold text-gray-600">
                {emailLabel}
              </label>
              <div className="relative">
                <input
                  type={emailInputType}
                  value={input}
                  onChange={e => { setInput(e.target.value); setError(''); }}
                  placeholder={emailPlaceholder}
                  autoComplete={emailAutoComp}
                  className="w-full px-4 py-3 text-sm outline-none pr-10 border border-gray-300 focus:border-black transition-colors duration-200"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <Mail size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              {emailHelper && <p className="text-xs text-gray-400 mt-1">{emailHelper}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs uppercase tracking-wide font-semibold text-gray-600">
                  {passwordLabel}
                </label>
                <button
                  className="text-xs hover:underline focus-visible:outline-none text-primary-women"
                  onClick={() => alert(L.forgotConfirm)}
                >
                  {lForgot}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder={passwordPlaceholder}
                  autoComplete={passwordAutoComp}
                  className="w-full px-4 py-3 text-sm outline-none pr-10 border border-gray-300 focus:border-black transition-colors duration-200"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <button
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 focus-visible:outline-none"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {passwordHelper && <p className="text-xs text-gray-400 mt-1">{passwordHelper}</p>}
            </div>
          </div>

          {error && <p className="text-xs text-primary-men">{error}</p>}

          {/* CTA */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 text-white text-sm tracking-[0.2em] uppercase bg-black hover:bg-primary-women active:bg-primary-men font-semibold transition-colors duration-200 focus-visible:outline-none disabled:opacity-60 disabled:pointer-events-none"
          >
            {loading ? L.ctaLoading : L.ctaSubmit}
          </button>

          {/* Switch */}
          <p className="text-xs text-center text-gray-500">
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
