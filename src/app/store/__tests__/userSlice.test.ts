import { describe, it, expect } from 'vitest';
import userReducer, { setAuth, clearAuth, patchUserData } from '../userSlice';

describe('userSlice auth fields', () => {
  it('initial state has null auth fields', () => {
    const state = userReducer(undefined, { type: '@@INIT' });
    expect(state.data.authToken).toBeNull();
    expect(state.data.refreshToken).toBeNull();
    expect(state.data.userIdentifier).toBeNull();
  });

  it('setAuth populates the three auth fields', () => {
    const state = userReducer(undefined, setAuth({
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
      userIdentifier: 'seed-demo-user-active-1',
    }));
    expect(state.data.authToken).toBe('access-123');
    expect(state.data.refreshToken).toBe('refresh-456');
    expect(state.data.userIdentifier).toBe('seed-demo-user-active-1');
  });

  it('clearAuth resets all three fields to null', () => {
    let state = userReducer(undefined, setAuth({
      accessToken: 'a', refreshToken: 'r', userIdentifier: 'u',
    }));
    state = userReducer(state, clearAuth());
    expect(state.data.authToken).toBeNull();
    expect(state.data.refreshToken).toBeNull();
    expect(state.data.userIdentifier).toBeNull();
  });

  it('patchUserData does not nuke auth fields', () => {
    let state = userReducer(undefined, setAuth({
      accessToken: 'keep-me', refreshToken: 'r', userIdentifier: 'u',
    }));
    state = userReducer(state, patchUserData({
      profile: { ...state.data.profile, firstName: 'NewName' },
    }));
    expect(state.data.authToken).toBe('keep-me');
    expect(state.data.profile.firstName).toBe('NewName');
  });
});
