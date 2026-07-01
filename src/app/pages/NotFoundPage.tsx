'use client'
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ArrowRight } from 'lucide-react';
import { NOT_FOUND_LABELS as L } from '../data/notFoundLabels';

export function NotFoundPage() {
  const router = useRouter();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main id="main-content" className="flex-1 flex flex-col items-center justify-center px-6 py-24">
        {/* Large 404 */}
        <div className="relative select-none mb-6">
          <span
            className="text-[180px] sm:text-[240px] font-bold leading-none tracking-tighter text-black/[0.04]"
            aria-hidden="true"
          >
            {L.largeNumberAria}
          </span>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p className="text-xs tracking-[0.25em] uppercase text-gray-400 font-medium">
              {L.eyebrow}
            </p>
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-black text-center leading-tight">
              {L.heading}
            </h1>
          </div>
        </div>

        {/* Divider */}
        <div className="w-12 h-px bg-black mb-8" />

        {/* Message */}
        <p className="text-sm text-gray-500 text-center max-w-sm leading-relaxed mb-10">
          {L.body}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => router.push(L.ctaHomeHref)}
            className="px-8 py-3 bg-black text-white text-xs tracking-widest uppercase hover:bg-gray-900 transition-colors duration-200"
          >
            {L.ctaHome}
          </button>
          <button
            onClick={() => router.push(L.ctaWomenHref)}
            className="flex items-center gap-2 px-8 py-3 border border-black text-black text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors duration-200"
          >
            {L.ctaWomen}
            <ArrowRight size={12} />
          </button>
          <button
            onClick={() => router.push(L.ctaMenHref)}
            className="flex items-center gap-2 px-8 py-3 border border-black text-black text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors duration-200"
          >
            {L.ctaMen}
            <ArrowRight size={12} />
          </button>
        </div>

        {/* Trending links */}
        <div className="mt-16 flex flex-col items-center gap-4">
          <p className="text-xs tracking-[0.2em] uppercase text-gray-400">{L.trendingHeading}</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {L.trendingLinks.map(({ label, href }) => (
              <button
                key={href}
                onClick={() => router.push(href)}
                className="text-xs text-gray-500 hover:text-black underline-offset-4 hover:underline transition-colors duration-150"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
