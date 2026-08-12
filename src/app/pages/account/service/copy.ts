/**
 * Copy shared by this feature's components, overlaid by the OneEntry
 * dictionary at render time — see `src/lib/oneentry/labels/dict.ts`.
 */

// ─── Service Maintenance section ────────────────────────────────────────────
export const SERVICE_LABELS = {
  title: 'Service Maintenance',
  eyebrow: 'Care & Repair',
  bannerHeading: 'Your Requests',
  statActive: 'Active',
  statCompleted: 'Completed',
  statTotalSpent: 'Total Spent',
  newRequest: 'New Request',
  cancel: 'Cancel',
  filterAll: 'All',
  emptyFiltered: 'No requests match this filter.',
  formHeading: 'Submit a Service Request',
  successMessage: "Request submitted! We'll be in touch shortly.",
  labelItem: 'Item Name *',
  placeholderItem: 'e.g. Tailored Trench Coat',
  labelServiceType: 'Service Type *',
  labelDate: 'Preferred Drop-off Date',
  labelDescription: 'Description *',
  placeholderDescription: 'Describe the issue or alteration needed…',
  submitButton: 'Submit Request',
  progressLabel: 'Progress',
  fieldDroppedOff: 'Dropped Off',
  fieldEstReady: 'Est. Ready',
  fieldServiceType: 'Service Type',
  fieldCost: 'Cost',
  fieldRef: 'Ref',
  fieldType: 'Type',
  fieldItem: 'Item',
  costTbc: 'TBC',
  requestDetails: 'Request Details',
  howItWorks: 'How It Works',
  // Flat, not an array of objects: `mergeDict` overlays strings only, so a
  // nested step would stay frozen in code. The `NN` is the rendered badge and
  // stays here — it is a number, not copy.
  howStep1Title: 'Submit Request',
  howStep1Body: 'Tell us what your item needs — repair, cleaning, alteration or resoling.',
  howStep2Title: 'Drop Off',
  howStep2Body: 'Bring your item to any Kekimoro store with your confirmation reference.',
  howStep3Title: 'We Get to Work',
  howStep3Body: 'Our specialist technicians assess and complete your service request.',
  howStep4Title: 'Collect',
  howStep4Body: "You'll be notified when ready. Collect in-store or request delivery.",
  statuses: {
    open: 'Open',
    'in-progress': 'In Progress',
    ready: 'Ready',
    completed: 'Completed',
    cancelled: 'Cancelled',
  } as const,
  // Offline mirror of the OE `service_request` form's `category` listTitles —
  // keys are the option *values* OE stores, in its authored `position` order.
  // The live list wins at runtime (`useFormOptions`); this only covers the
  // first paint and the CMS-unreachable path, so a key that OE does not have
  // would put an unsubmittable option in the select.
  categoryLabels: {
    repair: 'Repair',
    cleaning: 'Cleaning',
    alteration: 'Alteration',
    'sole-replacement': 'Sole replacement',
    other: 'Other',
  } as const,
  loadingAria: 'Loading service requests',
} as const;
