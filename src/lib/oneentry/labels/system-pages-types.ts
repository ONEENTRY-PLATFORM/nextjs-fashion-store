export const SYSTEM_PAGES_SET_MARKER = 'system_pages' as const;

/**
 * Copy for the pages a shopper only ever sees when something is wrong: 404,
 * the offline shell and the global error boundary.
 *
 * One set rather than three: these screens are rare, and three markers would
 * mean three extra API calls on every request for copy almost nobody reads.
 * Keys are prefixed by screen — `not_found_*`, `offline_*`, `error_*`.
 */
export type SystemPagesDict = Record<string, string>;
