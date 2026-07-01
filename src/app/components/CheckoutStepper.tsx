'use client'
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';

import { ACCENT_WOMEN as ACCENT } from '../constants/colors';
import { CHECKOUT_STEPPER_LABELS as L } from '../data/checkoutLabels';
import { CHECKOUT_STEPPER_ARIA, CHECKOUT_STEPPER_DYNAMIC_ARIA } from '../data/commonLabels';

const STEPS = [
  { label: L.cart, path: '/cart' },
  { label: L.delivery, path: '/checkout/delivery' },
  { label: L.payment, path: '/checkout/payment' },
  { label: L.confirmation, path: '/checkout/confirmation' },
];

interface Props {
  currentStep: number; // 0-based
}

export function CheckoutStepper({ currentStep }: Props) {
  const router = useRouter();
  const isLast = (idx: number) => idx === STEPS.length - 1;

  return (
    <nav
      aria-label={CHECKOUT_STEPPER_ARIA.checkoutProgress}
      className="flex items-center justify-center py-6 px-4 font-[Inter,sans-serif]"
      style={{ '--accent': ACCENT } as React.CSSProperties}
    >
      {STEPS.map((step, idx) => {
        const done = idx < currentStep;
        const active = idx === currentStep;

        return (
          /*
           * Each step occupies flex-1 (except the last which is flex-shrink-0).
           * The connector line lives inside this wrapper, after the button,
           * so we never need React.Fragment in the map.
           */
          <div
            key={step.label}
            className={`flex items-center ${isLast(idx) ? 'flex-none' : 'flex-1'}`}
          >
            {/* Circle + label */}
            <button
              onClick={() => done && router.push(step.path)}
              aria-label={`${step.label}${done ? CHECKOUT_STEPPER_DYNAMIC_ARIA.stepSuffixCompleted : active ? CHECKOUT_STEPPER_DYNAMIC_ARIA.stepSuffixCurrent : CHECKOUT_STEPPER_DYNAMIC_ARIA.stepSuffixUpcoming}`}
              aria-current={active ? 'step' : undefined}
              className={`flex flex-col items-center gap-1.5 focus-visible:outline-none flex-shrink-0 min-w-[60px] ${
                done ? 'cursor-pointer' : 'cursor-default'
              }`}
              disabled={!done && !active}
            >
              <span
                className={`w-8 h-8 flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                  done
                    ? 'bg-black text-white'
                    : active
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-white text-[#9ca3af] border-[1.5px] border-[#d1d5db]'
                }`}
              >
                {done ? <Check size={14} strokeWidth={2.5} /> : idx + 1}
              </span>
              <span
                className={`text-xs tracking-wider uppercase whitespace-nowrap ${
                  active ? 'font-bold text-black' : done ? 'text-[#555]' : 'text-[#9ca3af]'
                }`}
              >
                {step.label}
              </span>
            </button>

            {/* Connector line — only rendered between steps */}
            {!isLast(idx) && (
              <div
                className={`flex-1 mx-2 h-0.5 mb-[18px] transition-colors duration-300 ${
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
