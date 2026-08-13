/** Wishlist API slice (RTK Query) over `{NEXT_PUBLIC_API_URL}/users/me/wishlist`. Without that env the slice still exists, but `isWishlistApiEnabled()` is `false` and callers must skip it. */
import { createApi, fetchBaseQuery, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';

import type { RootState } from '@/app/store/index';

import type {
  WishlistAddItemArgs,
  WishlistApiResponse,
  WishlistRemoveItemArgs,
  WishlistSetArgs,
} from './types/wishlist';

/** Resolve the Platform base URL once at module import. */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/** True when the playground should attempt real HTTP calls. */
export function isWishlistApiEnabled(): boolean {
  return API_BASE_URL.length > 0;
}

export const wishlistApi = createApi({
  reducerPath: 'wishlistApi',
  tagTypes: ['Wishlist'],
  // Wishlist changes are relatively rare (user opens their favourites, occasionally toggles).
  keepUnusedDataFor: 300,
  refetchOnMountOrArgChange: 60,
  refetchOnFocus: false,
  refetchOnReconnect: true,
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
    removeWishlistItem: builder.mutation<WishlistApiResponse, WishlistRemoveItemArgs>({
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

/** Convenience type guard for narrowing RTK Query errors to a HTTP-shaped `{ status, data }` object. */
export function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === 'object' && error !== null && 'status' in error;
}
