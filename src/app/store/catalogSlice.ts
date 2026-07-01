/**
 * catalogSlice — per-catalog UI state
 *
 * Manages filter selections, sort, pagination, view mode, and active quick-filter chip
 * for every catalog page, keyed by a catalog identifier (e.g. 'women-clothing').
 *
 * Why here instead of local state:
 * - Persists filter state when navigating back to a catalog
 * - Single source of truth for filter logic, easy to swap to API-driven filters later
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface CatalogUIState {
  selectedFilters: Record<string, string[]>;
  sortBy: string;
  currentPage: number;
  viewCols: 3 | 4;
  listMode: boolean;
  activeChip: string;
}

/** All catalogs keyed by a string identifier */
export type CatalogsState = Record<string, CatalogUIState>;

const DEFAULT: CatalogUIState = {
  selectedFilters: {},
  sortBy: 'featured',
  currentPage: 1,
  viewCols: 4,
  listMode: false,
  activeChip: '',
};

function getCatalog(state: CatalogsState, key: string): CatalogUIState {
  if (!state[key]) state[key] = { ...DEFAULT, selectedFilters: {} };
  return state[key];
}

const catalogSlice = createSlice({
  name: 'catalog',
  initialState: {} as CatalogsState,
  reducers: {
    /** Toggle a single filter value on/off */
    toggleFilter(
      state,
      action: PayloadAction<{ catalogKey: string; filterKey: string; value: string }>
    ) {
      const { catalogKey, filterKey, value } = action.payload;
      const catalog = getCatalog(state, catalogKey);
      const current = catalog.selectedFilters[filterKey] ?? [];
      catalog.selectedFilters[filterKey] = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      catalog.currentPage = 1;
    },

    /** Set all filters at once (e.g. from URL params) */
    setFilters(
      state,
      action: PayloadAction<{ catalogKey: string; filters: Record<string, string[]> }>
    ) {
      const { catalogKey, filters } = action.payload;
      const catalog = getCatalog(state, catalogKey);
      catalog.selectedFilters = filters;
      catalog.currentPage = 1;
    },

    /** Clear all filters for a catalog */
    clearFilters(state, action: PayloadAction<string>) {
      const catalog = getCatalog(state, action.payload);
      catalog.selectedFilters = {};
      catalog.activeChip = '';
      catalog.currentPage = 1;
    },

    setSort(state, action: PayloadAction<{ catalogKey: string; sortBy: string }>) {
      const catalog = getCatalog(state, action.payload.catalogKey);
      catalog.sortBy = action.payload.sortBy;
      catalog.currentPage = 1;
    },

    setPage(state, action: PayloadAction<{ catalogKey: string; page: number }>) {
      getCatalog(state, action.payload.catalogKey).currentPage = action.payload.page;
    },

    setViewCols(state, action: PayloadAction<{ catalogKey: string; cols: 3 | 4 }>) {
      getCatalog(state, action.payload.catalogKey).viewCols = action.payload.cols;
    },

    setListMode(state, action: PayloadAction<{ catalogKey: string; listMode: boolean }>) {
      getCatalog(state, action.payload.catalogKey).listMode = action.payload.listMode;
    },

    setActiveChip(state, action: PayloadAction<{ catalogKey: string; chip: string }>) {
      const catalog = getCatalog(state, action.payload.catalogKey);
      catalog.activeChip = action.payload.chip;
      catalog.currentPage = 1;
    },

    /** Load persisted catalog state from localStorage after client mount */
    hydrateCatalogs(_state, action: PayloadAction<CatalogsState>) {
      return action.payload;
    },
  },
});

export const {
  toggleFilter,
  setFilters,
  clearFilters,
  setSort,
  setPage,
  setViewCols,
  setListMode,
  setActiveChip,
  hydrateCatalogs,
} = catalogSlice.actions;

export default catalogSlice.reducer;
