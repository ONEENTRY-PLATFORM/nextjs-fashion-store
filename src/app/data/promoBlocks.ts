export interface PromoItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  cta: string;
  href: string;
}

export const PROMO_ITEMS: PromoItem[] = [
  {
    id: 'p1',
    title: 'Best Dress for You',
    subtitle: 'Shop Dresses',
    href: '/women/clothing',
    image: 'https://images.unsplash.com/photo-1704915049592-d41831fb93c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGZhc2hpb24lMjBjb2F0JTIwd2ludGVyJTIwbW9kZWx8ZW58MXx8fHwxNzcxNDQwOTE0fDA&ixlib=rb-4.1.0&q=80&w=800',
    cta: 'Shop Dresses',
  },
  {
    id: 'p2',
    title: 'Discover New Style',
    subtitle: "Men's New Season",
    href: '/men/clothing',
    image: 'https://images.unsplash.com/photo-1726140872004-850c80900ae3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZW4lMjBjYXN1YWwlMjB0c2hpcnQlMjBtb2RlbCUyMHVyYmFufGVufDF8fHx8MTc3MTQ0MDkxNXww&ixlib=rb-4.1.0&q=80&w=800',
    cta: 'Shop Men',
  },
  {
    id: 'p3',
    title: 'Tops on Repeat',
    subtitle: 'Everyday Essentials',
    href: '/women/clothing',
    image: 'https://images.unsplash.com/photo-1759873911325-aead6238d9f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGZhc2hpb24lMjBqZWFucyUyMHRvcCUyMG1vZGVsfGVufDF8fHx8MTc3MTQ0MDkxOHww&ixlib=rb-4.1.0&q=80&w=800',
    cta: 'Shop Tops',
  },
  {
    id: 'p4',
    title: 'Accessories for You',
    subtitle: 'Complete Your Look',
    href: '/women/accessories',
    image: 'https://images.unsplash.com/photo-1758900728025-3d70604871c9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGFjY2Vzc29yaWVzJTIwZmFzaGlvbiUyMG1vZGVsfGVufDF8fHx8MTc3MTQ0MDkyMHww&ixlib=rb-4.1.0&q=80&w=800',
    cta: 'Shop Accessories',
  },
];
