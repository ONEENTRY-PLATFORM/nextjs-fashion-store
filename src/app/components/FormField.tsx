import { useId, useState } from 'react';
import { SALE_COLOR } from '../constants/colors';

interface FormFieldProps {
  label: string;
  placeholder: string;
  type?: string;
  name?: string;
  autoComplete?: string;
  value?: string;
  onChange?: (v: string) => void;
  error?: string;
}

export function FormField({ label, placeholder, type = 'text', name, autoComplete, value, onChange, error }: FormFieldProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const borderClass = error
    ? 'border-[var(--sale)]'
    : focused
      ? 'border-black'
      : 'border-[#d1d5db]';
  return (
    <div style={{ '--sale': SALE_COLOR } as React.CSSProperties}>
      <label
        htmlFor={id}
        className={`block text-xs tracking-wide uppercase mb-1.5 font-semibold ${
          error ? 'text-[var(--sale)]' : 'text-[#555]'
        }`}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        name={name}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange ? e => onChange(e.target.value) : undefined}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full px-4 py-3 text-sm outline-none transition-colors border rounded-none ${borderClass}`}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs mt-1 text-[var(--sale)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
