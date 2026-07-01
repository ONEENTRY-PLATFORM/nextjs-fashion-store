/**
 * Cart API slice (RTK Query)
 *
 * Mirrors `wishlistApi` but talks to `/users/me/cart` and includes a
 * `setCart` (PUT) mutation used by `clearCart()` — the cart REST API
 * does not expose a single-call wipe endpoint, so we PUT an empty
 * `items` list.
 *
 * Important: the Platform `addItem` endpoint accepts an absolute `qty`, not
 * a delta. Callers (CartContext) must compute the resulting total
 * client-side before dispatching.
 */
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import type {
  CartApiResponse,
  CartAddItemArgs,
  CartRemoveItemArgs,
  CartSetArgs,
} from './types/cart';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/** True when the playground should attempt real HTTP calls. */
export function isCartApiEnabled(): boolean {
  return API_BASE_URL.length > 0;
}

export const cartApi = createApi({
  reducerPath: 'cartApi',
  tagTypes: ['Cart'],
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
    getCart: builder.query<CartApiResponse, void>({
      query: () => '/users/me/cart',
      providesTags: ['Cart'],
    }),
    addCartItem: builder.mutation<CartApiResponse, CartAddItemArgs>({
      query: (body) => ({
        url: '/users/me/cart/items',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Cart'],
    }),
    removeCartItem: builder.mutation<CartApiResponse, CartRemoveItemArgs>({
      query: ({ productId }) => ({
        url: `/users/me/cart/items/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),
    setCart: builder.mutation<CartApiResponse, CartSetArgs>({
      query: (body) => ({
        url: '/users/me/cart',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Cart'],
    }),
  }),
});

export const {
  useGetCartQuery,
  useAddCartItemMutation,
  useRemoveCartItemMutation,
  useSetCartMutation,
} = cartApi;
