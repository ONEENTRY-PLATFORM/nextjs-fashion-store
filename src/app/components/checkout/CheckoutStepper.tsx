'use client';

import { Check } from 'lucide-react';

import { ACCENT_WOMEN as ACCENT } from '@/app/constants/colors';
import { useRouter } from '@/lib/i18n/navigation';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

export const CHECKOUT_STEPPER_ARIA = {
  checkoutProgress: 'Checkout progress',
} as const;

/** Appended to a step's own label, so each value is a standalone word group. */
export const CHECKOUT_STEPPER_DYNAMIC_ARIA = {
  stepSuffixCompleted: '(completed)',
  stepSuffixCurrent: '(current step)',
  stepSuffixUpcoming: '(upcoming)',
} as const;

export const CHECKOUT_STEPPER_LABELS = {
  cart: 'Cart',
  delivery: 'Delivery',
  payment: 'Payment',
  confirmation: 'Confirmation',
} as const;

/** Path per step, keyed by the dictionary key — the copy is editable, the route is not, so they are kept apart. */
const STEP_PATHS = ['cart', 'delivery', 'payment', 'confirmation'] as const;
const STEP_ROUTES: Record<(typeof STEP_PATHS)[number], string> = {
  cart: '/cart',
  delivery: '/checkout/delivery',
  payment: '/checkout/payment',
  confirmation: '/checkout/confirmation',
};

interface Props {
  currentStep: number; // 0-based
}

export function CheckoutStepper({ currentStep }: Props) {
  const router = useRouter();
  const L = useDict('checkout_stepper_', CHECKOUT_STEPPER_LABELS);
  const A = useDict('checkout_stepper_aria_', CHECKOUT_STEPPER_DYNAMIC_ARIA);
  const aProgress = useT('checkout_stepper_aria_progress', CHECKOUT_STEPPER_ARIA.checkoutProgress);
  const STEPS = STEP_PATHS.map((key) => ({ label: L[key], path: STEP_ROUTES[key] }));
  const isLast = (idx: number) => idx === STEPS.length - 1;

  return (
    <nav
      aria-label={aProgress}
      className="flex items-center justify-center px-4 py-6 font-sans"
      style={{ '--accent': ACCENT } as React.CSSProperties}
    >
      {STEPS.map((step, idx) => {
        const done = idx < currentStep;
        const active = idx === currentStep;

        return (
          /*
           * Each step occupies flex-1 (except the last which is shrink-0).
           * The connector line lives inside this wrapper, after the button,
           * so we never need React.Fragment in the map.
           */
          <div key={step.label} className={`flex items-center ${isLast(idx) ? 'flex-none' : 'flex-1'}`}>
            {/* Circle + label */}
            <button
              onClick={() => done && router.push(step.path)}
              aria-label={`${step.label} ${done ? A.stepSuffixCompleted : active ? A.stepSuffixCurrent : A.stepSuffixUpcoming}`}
              aria-current={active ? 'step' : undefined}
              className={`flex min-w-15 shrink-0 flex-col items-center gap-1.5 focus-visible:outline-none ${
                done ? 'cursor-pointer' : 'cursor-default'
              }`}
              disabled={!done && !active}
            >
              <span
                className={`flex size-8 items-center justify-center text-xs font-bold transition-all duration-200 ${
                  done
                    ? 'bg-black text-white'
                    : active
                      ? 'bg-accent text-white'
                      : 'border-[1.5px] border-[#d1d5db] bg-white text-[#9ca3af]'
                }`}
              >
                {done ? <Check size={14} strokeWidth={2.5} /> : idx + 1}
              </span>
              <span
                className={`text-xs tracking-wider whitespace-nowrap uppercase ${
                  active ? 'font-bold text-black' : done ? 'text-[#555]' : 'text-[#9ca3af]'
                }`}
              >
                {step.label}
              </span>
            </button>

            {/* Connector line — only rendered between steps */}
            {!isLast(idx) && (
              <div
                className={`mx-2 mb-4.5 h-0.5 flex-1 transition-colors duration-300 ${
                  idx < currentStep ? 'bg-black' : 'bg-[#e5e7eb]'
                }`}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
