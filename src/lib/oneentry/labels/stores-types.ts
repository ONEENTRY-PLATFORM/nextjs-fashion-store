export const STORES_SET_MARKERS = ['store_location', 'store_pages'] as const;

export type StoresSetMarker = (typeof STORES_SET_MARKERS)[number];

export type StoresSystemTexts = Record<StoresSetMarker, Record<string, string>>;
