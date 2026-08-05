/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SizeDropdown } from './SizeDropdown';
import { SIZE_DROPDOWN_LABELS as L } from '../data/commonLabels';

describe('SizeDropdown', () => {
  beforeEach(() => {
    // no-op
  });
  afterEach(() => {
    cleanup();
  });

  describe('availableSizes === undefined (fallback)', () => {
    it('falls back to clothing sizes when not a shoe and value is not oneSize', () => {
      const onChange = vi.fn();
      const { container } = render(<SizeDropdown value="M" onChange={onChange} isShoe={false} />);

      // Interactive dropdown => button with chevron is present
      const trigger = container.querySelector('button');
      expect(trigger).not.toBeNull();
      // Expect displayed value "Size: M"
      expect(trigger!.textContent).toContain(`${L.sizeLabel} M`);

      // Open menu
      fireEvent.click(trigger!);
      // All clothing sizes should appear as option buttons
      for (const s of L.clothingSizes) {
        expect(screen.getByRole('button', { name: s })).toBeTruthy();
      }
    });

    it('falls back to shoe sizes when isShoe is true', () => {
      const onChange = vi.fn();
      const { container } = render(<SizeDropdown value="38" onChange={onChange} isShoe={true} />);
      const trigger = container.querySelector('button');
      fireEvent.click(trigger!);
      for (const s of L.shoeSizes) {
        expect(screen.getByRole('button', { name: s })).toBeTruthy();
      }
    });

    it('falls back to [oneSize] and renders static badge when value is oneSize', () => {
      const onChange = vi.fn();
      const { container } = render(
        <SizeDropdown value={L.oneSize} onChange={onChange} isShoe={false} />,
      );
      // Single-option => static badge, no button, no chevron
      expect(container.querySelector('button')).toBeNull();
      expect(container.textContent).toContain(`${L.sizeLabel} ${L.oneSize}`);
    });
  });

  describe('availableSizes === []', () => {
    it('renders nothing', () => {
      const onChange = vi.fn();
      const { container } = render(
        <SizeDropdown value="M" onChange={onChange} isShoe={false} availableSizes={[]} />,
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('availableSizes = ["One"] (single option)', () => {
    it('renders a static badge showing "Size: One" without dropdown button', () => {
      const onChange = vi.fn();
      const { container } = render(
        <SizeDropdown value="One" onChange={onChange} isShoe={false} availableSizes={['One']} />,
      );
      // No interactive button
      expect(container.querySelector('button')).toBeNull();
      // Static badge shows the label + value
      expect(container.textContent).toContain(`${L.sizeLabel} One`);
    });

    it('uses first (only) available size when value is empty', () => {
      const onChange = vi.fn();
      const { container } = render(
        <SizeDropdown value="" onChange={onChange} isShoe={false} availableSizes={['One']} />,
      );
      expect(container.textContent).toContain(`${L.sizeLabel} One`);
    });
  });

  describe('availableSizes = ["S","M","L"] (interactive)', () => {
    it('renders trigger showing current value, opens menu with only provided options, and calls onChange on click', () => {
      const onChange = vi.fn();
      const { container } = render(
        <SizeDropdown
          value="M"
          onChange={onChange}
          isShoe={false}
          availableSizes={['S', 'M', 'L']}
        />,
      );

      // Trigger is present (interactive)
      const trigger = container.querySelector('button');
      expect(trigger).not.toBeNull();
      expect(trigger!.textContent).toContain(`${L.sizeLabel} M`);

      // Menu closed initially: no S option button yet
      expect(screen.queryByRole('button', { name: 'S' })).toBeNull();

      // Open menu
      fireEvent.click(trigger!);

      // Exactly the three provided options are rendered as clickable buttons
      const s = screen.getByRole('button', { name: 'S' });
      const m = screen.getByRole('button', { name: 'M' });
      const l = screen.getByRole('button', { name: 'L' });
      expect(s).toBeTruthy();
      expect(m).toBeTruthy();
      expect(l).toBeTruthy();

      // None of the hardcoded fallback sizes leak through
      expect(screen.queryByRole('button', { name: 'XL' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'XS' })).toBeNull();

      // Click a size -> onChange fires with that size
      fireEvent.click(s);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('S');
    });

    it('does not include hardcoded shoe sizes even when isShoe=true, availableSizes wins', () => {
      const onChange = vi.fn();
      const { container } = render(
        <SizeDropdown
          value="S"
          onChange={onChange}
          isShoe={true}
          availableSizes={['S', 'M', 'L']}
        />,
      );
      const trigger = container.querySelector('button');
      fireEvent.click(trigger!);

      // Only provided options
      expect(screen.getByRole('button', { name: 'S' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'M' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'L' })).toBeTruthy();
      // Shoe fallback should not leak
      expect(screen.queryByRole('button', { name: '38' })).toBeNull();
      expect(screen.queryByRole('button', { name: '42' })).toBeNull();
    });
  });
});
