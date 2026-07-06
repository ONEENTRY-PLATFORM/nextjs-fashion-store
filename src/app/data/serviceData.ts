// ── Service maintenance types ──────────────────────────────────────────────
// Types for the "Service Maintenance" section. Data now comes from OneEntry
// via `getServiceRequestsAction` (src/lib/oneentry/catalog/service-requests-action.ts).

// Request status:
//   'open'        — request received, awaiting technician assessment
//   'in-progress' — item is currently being worked on by a specialist
//   'ready'       — work completed, ready for collection at the store
//   'completed'   — customer collected the item, request closed
//   'cancelled'   — request cancelled (by customer or store)
export type ServiceStatus = 'open' | 'in-progress' | 'ready' | 'completed' | 'cancelled';

// Service category:
//   'alteration'  — fit adjustments (take in, shorten, let out)
//   'repair'      — repair (replacing zips, buttons, seams)
//   'cleaning'    — dry-cleaning or specialist washing
//   'restoration' — restoration (lining, wear marks, reshaping)
//   'other'       — other services
export type ServiceCategory = 'alteration' | 'repair' | 'cleaning' | 'restoration' | 'other';

export interface ServiceRequest {
  /** Unique request identifier (internal, used as React key) */
  id: string;

  /** Public request number shown to the customer, e.g. 'SVC-00412' */
  ref: string;

  /** Service category — see ServiceCategory */
  category: ServiceCategory;

  /** Name of the item dropped off for service */
  item: string;

  /** Work description: what needs to be done, what the problem is */
  description: string;

  /** Date the item was dropped off at the store, display format, e.g. '20 Feb 2026' */
  droppedOff: string;

  /** Estimated ready date, e.g. '27 Feb 2026'. null — if the date is not yet defined */
  estimatedReady: string | null;

  /** Current request status — see ServiceStatus */
  status: ServiceStatus;

  /** Service cost in £. null — if the price is not yet defined (TBC) */
  cost: number | null;

  /** Internal note for the customer: status explanation, collection instructions, etc. */
  notes: string;

  /** URL of the item image (200px preview) */
  img: string;
}
