/**
 * Wishlist API slice (RTK Query)
 *
 * Talks to the Platform Content REST API at
 *   {NEXT_PUBLIC_API_URL}/users/me/wishlist
 * If `NEXT_PUBLIC_API_URL` is empty, the slice is still created (RTK
 * Query requires a `baseQuery`) but `isWishlistApiEnabled()` returns
 * `false`, and callers are expected to skip both queries and mutations.
 *
 * Authorization: a Bearer JWT pulled from `state.user.data.authToken`
 * via `prepareHeaders`. No token → no header → the request will 401 on
 * the server; callers must gate queries with `skip: !authToken`.
 */
import {
  createApi,
  fetchBaseQuery,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import type {
  WishlistApiResponse,
  WishlistAddItemArgs,
  WishlistRemoveItemArgs,
  WishlistSetArgs,
} from './types/wishlist';

/**
 * Resolve the Platform base URL once at module import. We do NOT call
 * `process.env` inside `prepareHeaders` — Next.js only inlines
 * `NEXT_PUBLIC_*` at build time.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * True when the playground should attempt real HTTP calls. When false,
 * callers fall back to localStorage-only behaviour.
 */
export function isWishlistApiEnabled(): boolean {
  return API_BASE_URL.length > 0;
}

export const wishlistApi = createApi({
  reducerPath: 'wishlistApi',
  tagTypes: ['Wishlist'],
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).user.data.authToken;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getWishlist: builder.query<WishlistApiResponse, void>({
      query: () => '/users/me/wishlist',
      providesTags: ['Wishlist'],
    }),
    addWishlistItem: builder.mutation<WishlistApiResponse, WishlistAddItemArgs>({
      query: (body) => ({
        url: '/users/me/wishlist/items',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wishlist'],
    }),
    removeWishlistItem: builder.mutation<
      WishlistApiResponse,
      WishlistRemoveItemArgs
    >({
      query: ({ productId }) => ({
        url: `/users/me/wishlist/items/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Wishlist'],
    }),
    setWishlist: builder.mutation<WishlistApiResponse, WishlistSetArgs>({
      query: (body) => ({
        url: '/users/me/wishlist',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Wishlist'],
    }),
  }),
});

export const {
  useGetWishlistQuery,
  useAddWishlistItemMutation,
  useRemoveWishlistItemMutation,
  useSetWishlistMutation,
} = wishlistApi;

/**
 * Convenience type guard for narrowing RTK Query errors to a HTTP-shaped
 * `{ status, data }` object — mostly useful in catch blocks where we
 * want to differentiate "transport failure" from "server 4xx".
 */
export function isFetchBaseQueryError(
  error: unknown,
): error is FetchBaseQueryError {
  return (
    typeof error === 'object' && error !== null && 'status' in error
  );
}
