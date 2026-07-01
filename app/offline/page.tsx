'use client'

import { useEffect, useState, useCallback } from 'react';
import { OFFLINE_PAGE_LABELS as L } from '../../src/app/data/offlinePageLabels';
import { useInterfaceControlsT } from '../../src/lib/oneentry/labels/InterfaceControlsLabelsContext';

const CHECK_INTERVAL = 10; // seconds

export default function OfflinePage() {
  const [countdown, setCountdown] = useState(CHECK_INTERVAL);
  const [checking, setChecking] = useState(false);
  const [dots, setDots] = useState('');
  const lBrand     = useInterfaceControlsT('offline_title_store', L.brand);
  const lHeading   = useInterfaceControlsT('offline_title',       L.heading);
  const lSubtitle  = useInterfaceControlsT('offline_text',        L.subtitle);
  const lNextCheck = useInterfaceControlsT('offline_next_check',  L.nextCheckIn);
  const lRetry     = useInterfaceControlsT('offline_cta',         L.retry);
  const lFooter    = useInterfaceControlsT('offline_text_below',  L.footerNote);

  const checkConnectivity = useCallback(async () => {
    setChecking(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        window.location.reload();
        return;
      }
    } catch {
      // still offline
    }
    setChecking(false);
    setCountdown(CHECK_INTERVAL);
  }, []);

  // Countdown timer
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          checkConnectivity();
          return CHECK_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [checkConnectivity]);

  // Animated dots
  useEffect(() => {
    const id = setInterval(() => {
      setDots(d => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(id);
  }, []);

  // Immediate check when browser fires 'online'
  useEffect(() => {
    window.addEventListener('online', checkConnectivity);
    return () => window.removeEventListener('online', checkConnectivity);
  }, [checkConnectivity]);

  return (
    <div
      style={{
        minHeight: '100svh',
        backgroundColor: '#fff',
        fontFamily: 'Inter, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      {/* Brand */}
      <p
        style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: '#999',
          marginBottom: '3rem',
        }}
      >
        {lBrand}
      </p>

      {/* Icon */}
      <div style={{ marginBottom: '2rem', color: '#ccc' }}>
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="32" cy="32" r="31" stroke="currentColor" strokeWidth="1.5" />
          {/* Wifi arc 1 */}
          <path
            d="M14 28a25.4 25.4 0 0 1 36 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.3"
          />
          {/* Wifi arc 2 */}
          <path
            d="M20 34a17 17 0 0 1 24 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.3"
          />
          {/* Wifi arc 3 */}
          <path
            d="M26 40a8.5 8.5 0 0 1 12 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.3"
          />
          {/* Dot */}
          <circle cx="32" cy="46" r="2.5" fill="currentColor" opacity="0.3" />
          {/* Slash */}
          <line
            x1="16"
            y1="16"
            x2="48"
            y2="48"
            stroke="#111"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Heading */}
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: '#111',
          margin: '0 0 0.75rem',
        }}
      >
        {lHeading}
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: '0.875rem',
          color: '#666',
          maxWidth: '320px',
          lineHeight: 1.6,
          margin: '0 0 3rem',
        }}
      >
        {lSubtitle}
      </p>

      {/* Status */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '2rem',
        }}
      >
        {checking ? (
          <p style={{ fontSize: '0.8rem', color: '#999', letterSpacing: '0.05em' }}>
            {L.checking}{dots}
          </p>
        ) : (
          <p style={{ fontSize: '0.8rem', color: '#bbb', letterSpacing: '0.05em' }}>
            {lNextCheck}{' '}
            <span style={{ color: '#111', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {String(countdown).padStart(2, '0')}s
            </span>
          </p>
        )}

        {/* Progress bar */}
        <div
          style={{
            width: '160px',
            height: '1px',
            backgroundColor: '#eee',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              backgroundColor: '#111',
              width: checking ? '100%' : `${((CHECK_INTERVAL - countdown) / CHECK_INTERVAL) * 100}%`,
              transition: checking ? 'width 0.3s ease' : 'width 1s linear',
            }}
          />
        </div>
      </div>

      {/* Manual retry */}
      <button
        onClick={checkConnectivity}
        disabled={checking}
        style={{
          padding: '0.75rem 2.5rem',
          backgroundColor: checking ? '#eee' : '#111',
          color: checking ? '#999' : '#fff',
          border: 'none',
          borderRadius: 0,
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          cursor: checking ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.15s',
        }}
      >
        {checking ? L.retryChecking : lRetry}
      </button>

      {/* Footer note */}
      <p
        style={{
          position: 'absolute',
          bottom: '2rem',
          fontSize: '10px',
          color: '#ccc',
          letterSpacing: '0.1em',
        }}
      >
        {lFooter}
      </p>
    </div>
  );
}
