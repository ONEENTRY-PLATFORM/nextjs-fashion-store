import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { emitSyncWarning, SYNC_WARNING_EVENT } from '../../utils/syncWarnings';

describe('emitSyncWarning', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('logs to console.warn with the kind prefix', () => {
    emitSyncWarning('unmapped', 'hello');
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain('[sync:unmapped]');
    expect(warnSpy.mock.calls[0][0]).toContain('hello');
  });

  it('returns the detail payload', () => {
    const detail = emitSyncWarning('mutation', 'rolled back', { itemId: 'x' });
    expect(detail).toEqual({
      kind: 'mutation',
      message: 'rolled back',
      context: { itemId: 'x' },
    });
  });

  it('dispatches a window CustomEvent when available', () => {
    const listener = vi.fn();
    window.addEventListener(SYNC_WARNING_EVENT, listener as EventListener);
    emitSyncWarning('connectivity', 'offline');
    expect(listener).toHaveBeenCalledOnce();
    const evt = listener.mock.calls[0][0] as CustomEvent;
    expect(evt.detail.kind).toBe('connectivity');
    window.removeEventListener(SYNC_WARNING_EVENT, listener as EventListener);
  });
});
