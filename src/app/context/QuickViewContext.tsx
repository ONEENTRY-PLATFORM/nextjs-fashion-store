'use client';
import { useCallback, useRef } from 'react';

import { type Product } from '@/app/components/product/ProductCard';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
  clearQuickViewProduct,
  closeQuickView as closeQuickViewAction,
  openQuickView as openQuickViewAction,
} from '@/app/store/uiSlice';

interface QuickViewContextValue {
  isOpen: boolean;
  product: Product | null;
  initialColorIndex: number | null;
  openQuickView: (product: Product, initialColorIndex?: number) => void;
  closeQuickView: () => void;
}

export function useQuickView(): QuickViewContextValue {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.ui.quickView.isOpen);
  const product = useAppSelector((s) => s.ui.quickView.product);
  const initialColorIndex = useAppSelector((s) => s.ui.quickView.initialColorIndex);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openQuickView = useCallback(
    (p: Product, colorIndex?: number) => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
      dispatch(openQuickViewAction({ product: p, initialColorIndex: colorIndex ?? null }));
    },
    [dispatch],
  );

  const closeQuickView = useCallback(() => {
    dispatch(closeQuickViewAction());
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => dispatch(clearQuickViewProduct()), 300);
  }, [dispatch]);

  return { isOpen, product, initialColorIndex, openQuickView, closeQuickView };
}
