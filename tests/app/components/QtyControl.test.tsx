/// <reference types="@testing-library/jest-dom" />
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QTY_CONTROL_LABELS as L,QtyControl  } from '@/app/components/ui/QtyControl';



afterEach(cleanup);

describe('QtyControl', () => {
  describe('max prop — + button disabled state', () => {
    it('disables the + button when value === max', () => {
      render(<QtyControl value={5} max={5} onMinus={vi.fn()} onPlus={vi.fn()} />);
      const plus = screen.getByRole('button', { name: L.increaseLabel });
      expect((plus as HTMLButtonElement).disabled).toBe(true);
    });

    it('disables the + button when value > max (edge case — still capped)', () => {
      render(<QtyControl value={6} max={5} onMinus={vi.fn()} onPlus={vi.fn()} />);
      const plus = screen.getByRole('button', { name: L.increaseLabel });
      expect((plus as HTMLButtonElement).disabled).toBe(true);
    });

    it('leaves the + button enabled when value < max', () => {
      render(<QtyControl value={4} max={5} onMinus={vi.fn()} onPlus={vi.fn()} />);
      const plus = screen.getByRole('button', { name: L.increaseLabel });
      expect((plus as HTMLButtonElement).disabled).toBe(false);
    });

    it('leaves the + button enabled when max is undefined (uncapped / legacy)', () => {
      render(<QtyControl value={99} onMinus={vi.fn()} onPlus={vi.fn()} />);
      const plus = screen.getByRole('button', { name: L.increaseLabel });
      expect((plus as HTMLButtonElement).disabled).toBe(false);
    });
  });
});
