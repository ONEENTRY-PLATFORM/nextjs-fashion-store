/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QtyControl } from './QtyControl';
import { QTY_CONTROL_LABELS as L } from '../data/commonLabels';

afterEach(cleanup);

describe('QtyControl', () => {
  describe('max prop — + button disabled state', () => {
    it('disables the + button when value === max', () => {
      render(
        <QtyControl value={5} max={5} onMinus={vi.fn()} onPlus={vi.fn()} />,
      );
      const plus = screen.getByRole('button', { name: L.increaseLabel });
      expect((plus as HTMLButtonElement).disabled).toBe(true);
    });

    it('disables the + button when value > max (edge case — still capped)', () => {
      render(
        <QtyControl value={6} max={5} onMinus={vi.fn()} onPlus={vi.fn()} />,
      );
      const plus = screen.getByRole('button', { name: L.increaseLabel });
      expect((plus as HTMLButtonElement).disabled).toBe(true);
    });

    it('leaves the + button enabled when value < max', () => {
      render(
        <QtyControl value={4} max={5} onMinus={vi.fn()} onPlus={vi.fn()} />,
      );
      const plus = screen.getByRole('button', { name: L.increaseLabel });
      expect((plus as HTMLButtonElement).disabled).toBe(false);
    });

    it('leaves the + button enabled when max is undefined (uncapped / legacy)', () => {
      render(
        <QtyControl value={99} onMinus={vi.fn()} onPlus={vi.fn()} />,
      );
      const plus = screen.getByRole('button', { name: L.increaseLabel });
      expect((plus as HTMLButtonElement).disabled).toBe(false);
    });
  });
});
