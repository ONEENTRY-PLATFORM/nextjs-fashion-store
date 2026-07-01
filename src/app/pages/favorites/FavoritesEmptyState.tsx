'use client'
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { FAVORITES_EMPTY_LABELS as L } from '../../data/favoritesLabels';

export function FavoritesEmptyState() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="relative mb-8">
        <Image
          src="https://images.unsplash.com/photo-1601136610007-1ecf5706c908?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=320&q=80"
          alt={L.imageAlt}
          width={192}
          height={240}
          className="object-cover mx-auto grayscale-[30%]"
        />
        <div className="absolute inset-0 flex items-end justify-center pb-6 bg-gradient-to-t from-white/95 from-30% to-transparent">
          <Heart size={40} strokeWidth={1} className="text-[var(--accent)]" />
        </div>
      </div>
      <h2 className="text-xl tracking-[0.15em] uppercase mb-3 font-bold">{L.heading}</h2>
      <p className="text-sm text-gray-400 mb-8 max-w-xs leading-relaxed">
        {L.body}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => router.push(L.ctaWomenHref)}
          className="px-8 py-4 text-white text-xs tracking-[0.2em] uppercase focus-visible:outline-none hover:opacity-90 transition-opacity bg-black rounded-none font-bold"
        >
          {L.ctaWomen}
        </button>
        <button
          onClick={() => router.push(L.ctaHomeHref)}
          className="px-8 py-4 text-xs tracking-[0.2em] uppercase focus-visible:outline-none hover:bg-gray-50 transition-colors border border-black rounded-none font-semibold"
        >
          {L.ctaHome}
        </button>
      </div>
    </div>
  );
}
