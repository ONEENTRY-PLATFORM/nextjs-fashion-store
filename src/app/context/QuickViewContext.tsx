'use client'
import { useRef, useCallback } from 'react';
import { Product } from '../components/ProductCard';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  openQuickView as openQuickViewAction,
  closeQuickView as closeQuickViewAction,
  clearQuickViewProduct,
} from '../store/uiSlice';

interface QuickViewContextValue {
  isOpen: boolean;
  product: Product | null;
  initialColorIndex: number | null;
  openQuickView: (product: Product, initialColorIndex?: number) => void;
  closeQuickView: () => void;
}

export function useQuickView(): QuickViewContextValue {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(s => s.ui.quickView.isOpen);
  const product = useAppSelector(s => s.ui.quickView.product);
  const initialColorIndex = useAppSelector(s => s.ui.quickView.initialColorIndex);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openQuickView = useCallback((p: Product, colorIndex?: number) => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    dispatch(openQuickViewAction({ product: p, initialColorIndex: colorIndex ?? null }));
  }, [dispatch]);

  const closeQuickView = useCallback(() => {
    dispatch(closeQuickViewAction());
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => dispatch(clearQuickViewProduct()), 300);
  }, [dispatch]);

  return { isOpen, product, initialColorIndex, openQuickView, closeQuickView };
}
