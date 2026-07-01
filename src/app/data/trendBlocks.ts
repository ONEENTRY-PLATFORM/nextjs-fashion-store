export interface TrendBlock {
  label: string;
  image: string;
  tag?: string;
}

export const TREND_BLOCKS_CATALOG: Record<string, TrendBlock[]> = {
  'women-bags': [
    {
      label: 'Suede Bags',
      image: 'https://images.unsplash.com/photo-1583791031288-d48c4326d5da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdWVkZSUyMGJhZyUyMGZhc2hpb24lMjBlZGl0b3JpYWwlMjBsdXh1cnklMjB0ZXh0dXJlfGVufDF8fHx8MTc3MTk0Nzg4Nnww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      label: 'Evening Bags',
      image: 'https://images.unsplash.com/photo-1667158646434-73828a7e837d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGV2ZW5pbmclMjBiYWclMjBjbHV0Y2glMjBtZXRhbGxpYyUyMHNwYXJrbGV8ZW58MXx8fHwxNzcxOTQ3ODg2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      label: 'Animal Prints',
      image: 'https://images.unsplash.com/photo-1557410118-89c8a1126a7f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsZW9wYXJkJTIwcHJpbnQlMjBiYWclMjBmYXNoaW9uJTIwZWRpdG9yaWFsJTIwYm9sZHxlbnwxfHx8fDE3NzE5NDc4ODd8MA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      label: 'XXL Bags',
      image: 'https://images.unsplash.com/photo-1571029068328-35c3c82907ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvdmVyc2l6ZWQlMjBsYXJnZSUyMHRvdGUlMjBzaG9wcGVyJTIwYmFnJTIwd29tYW58ZW58MXx8fHwxNzcxOTQ3ODg3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
  ],

  'men-bags': [
    {
      label: 'Suede Bags',
      image: 'https://images.unsplash.com/photo-1583791031288-d48c4326d5da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdWVkZSUyMGJhZyUyMGZhc2hpb24lMjBlZGl0b3JpYWwlMjBsdXh1cnl8ZW58MXx8fHwxNzcxOTQ2MDc0fDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      label: 'Evening Bags',
      image: 'https://images.unsplash.com/photo-1758817991388-54a98d456317?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxldmVuaW5nJTIwY2x1dGNoJTIwYmFnJTIwbHV4dXJ5JTIwZmFzaGlvbnxlbnwxfHx8fDE3NzE5NDYwNzd8MA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      label: 'Animal Prints',
      image: 'https://images.unsplash.com/photo-1563721465742-cc3ead9deb36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmltYWwlMjBwcmludCUyMGJhZyUyMGZhc2hpb24lMjBlZGl0b3JpYWx8ZW58MXx8fHwxNzcxOTQ2MDc0fDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      label: 'XXL Bags',
      image: 'https://images.unsplash.com/photo-1711113456416-7d96c9bc31fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvdmVyc2l6ZWQlMjBYWEwlMjBsYXJnZSUyMHRvdGUlMjBiYWclMjBmYXNoaW9ufGVufDF8fHx8MTc3MTk0NjA3N3ww&ixlib=rb-4.1.0&q=80&w=1080',
    },
  ],

  'women-shoes': [
    {
      label: 'Boot Season',
      tag: 'Autumn',
      image: 'https://images.unsplash.com/photo-1707676179930-b2a8d251288a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGJvb3RzJTIwZmFzaGlvbiUyMHRyZW5kJTIwZWRpdG9yaWFsJTIwYXV0dW1ufGVufDF8fHx8MTc3MjAyNTMxNXww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      label: 'Street Sneakers',
      tag: 'Trending',
      image: 'https://images.unsplash.com/photo-1623992011864-cc0f07cb7d24?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMHNuZWFrZXJzJTIwc3RyZWV0JTIwc3R5bGUlMjB0cmVuZCUyMHVyYmFufGVufDF8fHx8MTc3MjAyNTMxNXww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      label: 'Evening Heels',
      tag: 'Glamour',
      image: 'https://images.unsplash.com/photo-1673377441728-23e984e70521?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGV2ZW5pbmclMjBoZWVscyUyMGx1eHVyeSUyMGdsYW0lMjBmYXNoaW9ufGVufDF8fHx8MTc3MjAyNTMxNnww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      label: 'Summer Sandals',
      tag: 'Summer',
      image: 'https://images.unsplash.com/photo-1566499003412-4736d6099504?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMHN0cmFwcHklMjBzYW5kYWxzJTIwaGVlbHMlMjBzdW1tZXIlMjBmYXNoaW9ufGVufDF8fHx8MTc3MjAyNTMwMXww&ixlib=rb-4.1.0&q=80&w=1080',
    },
  ],

  'men-shoes': [
    {
      label: 'Boot Season',
      tag: 'Autumn',
      image: 'https://images.unsplash.com/photo-1766228425968-ed4664b6d640?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZW4lMjBib290cyUyMHRyZW5kJTIwZWRpdG9yaWFsJTIwYXV0dW1uJTIwc3RyZWV0fGVufDF8fHx8MTc3MjAyNTMxNnww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      label: 'Sneaker Culture',
      tag: 'Trending',
      image: 'https://images.unsplash.com/photo-1728233426599-f668e3fed476?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZW4lMjBzbmVha2VyJTIwY3VsdHVyZSUyMHN0cmVldCUyMGZhc2hpb24lMjBlZGl0b3JpYWx8ZW58MXx8fHwxNzcyMDI1MzE3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      label: 'Classic Leather',
      tag: 'Business',
      image: 'https://images.unsplash.com/photo-1770198408387-7f45e5d6c056?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZW4lMjBjbGFzc2ljJTIwbGVhdGhlciUyMGRyZXNzJTIwc2hvZXMlMjBidXNpbmVzc3xlbnwxfHx8fDE3NzIwMjUzMTd8MA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      label: 'Winter Essentials',
      tag: 'Season',
      image: 'https://images.unsplash.com/photo-1548795915-66b6ecd0d826?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZW4lMjBsZWF0aGVyJTIwYm9vdHMlMjB3aW50ZXIlMjBmYXNoaW9uJTIwZGFya3xlbnwxfHx8fDE3NzIwMjUzMDl8MA&ixlib=rb-4.1.0&q=80&w=1080',
    },
  ],

  'women-accessories': [
    {
      label: 'Fashion Jewelry',
      tag: 'Trending',
      image: 'https://images.unsplash.com/photo-1731406322264-dac59f83828b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGpld2VscnklMjB0cmVuZCUyMGVkaXRvcmlhbCUyMGdvbGQlMjBsYXllcmVkfGVufDF8fHx8MTc3MjAxNjMwMXww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      label: 'Winter Accessories',
      tag: 'Season',
      image: 'https://images.unsplash.com/photo-1639654827521-cb4f5edf8675?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMHdpbnRlciUyMGFjY2Vzc29yaWVzJTIwc2NhcmYlMjBoYXQlMjBnbG92ZXN8ZW58MXx8fHwxNzcyMDE2MzAyfDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      label: 'Sunglasses Edit',
      tag: 'Summer',
      image: 'https://images.unsplash.com/photo-1760446032732-c042b0d43580?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMHN1bmdsYXNzZXMlMjBmYXNoaW9uJTIwdHJlbmQlMjBzdW1tZXJ8ZW58MXx8fHwxNzcyMDE2MzAyfDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      label: 'Silk Scarves',
      tag: 'New In',
      image: 'https://images.unsplash.com/photo-1620740199226-2420c2fcaa18?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMHNpbGslMjBzY2FyZiUyMGZhc2hpb24lMjBsdXh1cnl8ZW58MXx8fHwxNzcyMDE2Mjg2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
  ],

  'men-accessories': [
    {
      label: 'Gift Sets',
      tag: 'Gifting',
      image: 'https://images.unsplash.com/photo-1662289032144-3ed681fdd260?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZW4lMjBncm9vbWluZyUyMGFjY2Vzc29yaWVzJTIwZ2lmdCUyMHNldCUyMHByZW1pdW18ZW58MXx8fHwxNzcyMDE2MzAzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      label: 'Winter Essentials',
      tag: 'Season',
      image: 'https://images.unsplash.com/photo-1639654827521-cb4f5edf8675?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZW4lMjB3aW50ZXIlMjBhY2Nlc3NvcmllcyUyMGhhdCUyMGdsb3ZlcyUyMHNjYXJmJTIwc2V0fGVufDF8fHx8MTc3MjAxNjMwNHww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      label: 'Watches & Sunglasses',
      tag: 'Trending',
      image: 'https://images.unsplash.com/photo-1723864885166-adb16aa57bae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZW4lMjB3YXRjaCUyMHN1bmdsYXNzZXMlMjBmYXNoaW9uJTIwdHJlbmQlMjBlZGl0b3JpYWx8ZW58MXx8fHwxNzcyMDE2MzA0fDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    {
      label: 'Premium Leather',
      tag: 'New In',
      image: 'https://images.unsplash.com/photo-1664735246099-6f4dd53c236a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZW4lMjBiaWZvbGQlMjBsZWF0aGVyJTIwd2FsbGV0JTIwbWluaW1hbCUyMGRhcmt8ZW58MXx8fHwxNzcyMDE2Mjk0fDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
  ],
};
