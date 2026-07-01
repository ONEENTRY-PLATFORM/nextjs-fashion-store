'use client'
import { useState, useRef, useEffect } from 'react';

export function useProductPageUIState() {
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartHovered, setCartHovered] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [storeCity, setStoreCity] = useState('London');
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareRef = useRef<HTMLDivElement>(null);
  const addedToCartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (addedToCartTimerRef.current) clearTimeout(addedToCartTimerRef.current);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showShare) return;
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShowShare(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showShare]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  const markAddedToCart = () => {
    setAddedToCart(true);
    if (addedToCartTimerRef.current) clearTimeout(addedToCartTimerRef.current);
    addedToCartTimerRef.current = setTimeout(() => setAddedToCart(false), 2000);
  };

  return {
    addedToCart,
    cartHovered, setCartHovered,
    showSizeGuide, setShowSizeGuide,
    showAllReviews, setShowAllReviews,
    showReviewModal, setShowReviewModal,
    showReserveModal, setShowReserveModal,
    storeCity, setStoreCity,
    showShare, setShowShare,
    copied,
    shareRef,
    handleCopyLink,
    markAddedToCart,
  };
}
