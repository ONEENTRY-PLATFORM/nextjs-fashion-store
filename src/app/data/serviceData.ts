// ── Dataset: service maintenance requests ──────────────────────────────────
// Data for the "Service Maintenance" section in the user account.
// When integrating with the real API, replace SERVICE_REQUESTS with the server response.

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

// ── Data ───────────────────────────────────────────────────────────────────

export const SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: 's1',
    ref: 'SVC-00412',
    category: 'alteration',
    item: 'Ribbed Knit Midi Dress',
    description: 'Take in side seams by 2cm, shorten hem by 4cm.',
    droppedOff: '20 Feb 2026',
    estimatedReady: '27 Feb 2026',
    status: 'ready',
    cost: 45.00,
    notes: 'Ready for collection — please bring your receipt.',
    img: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=200&q=80',
  },
  {
    id: 's2',
    ref: 'SVC-00389',
    category: 'repair',
    item: 'Tailored Trench Coat',
    description: 'Replace broken zip on left pocket, re-stitch collar lining.',
    droppedOff: '14 Feb 2026',
    estimatedReady: '3 Mar 2026',
    status: 'in-progress',
    cost: null,
    notes: 'Sourcing replacement hardware — we will update you shortly.',
    img: 'https://images.unsplash.com/photo-1548624313-0396a75d2462?w=200&q=80',
  },
  {
    id: 's3',
    ref: 'SVC-00351',
    category: 'cleaning',
    item: 'Cashmere Knit Sweater',
    description: 'Specialist dry-clean, remove wine stain on left cuff.',
    droppedOff: '1 Feb 2026',
    estimatedReady: '8 Feb 2026',
    status: 'completed',
    cost: 28.50,
    notes: 'Collected on 9 Feb 2026.',
    img: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=200&q=80',
  },
  {
    id: 's4',
    ref: 'SVC-00298',
    category: 'restoration',
    item: 'Oversized Blazer',
    description: 'Re-line interior, replace all buttons with original-style gold.',
    droppedOff: '10 Jan 2026',
    estimatedReady: null,
    status: 'open',
    cost: null,
    notes: 'Request received — awaiting technician assessment.',
    img: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=200&q=80',
  },
];
