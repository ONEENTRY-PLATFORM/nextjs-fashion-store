# MISMATCH-LOG — discrepancies and gaps

A single log of what needs to be synchronized between the front and OneEntry admin.
Filled out by the AI companion and the user as work progresses. Rules — see the MCP
`mismatch-log` rule (`get-rule mismatch-log`).

---

## Severity (for section B)

- **P0** — feature is broken (missing block, button not working, form not submitting).
- **P1** — noticeable visual/behavioral discrepancy, but the feature works.
- **P2** — minor issues (margins, tokens, hover effects).
- **P3** — code hygiene (commented-out code, inline SVG, duplicates).

Section C goes **without P-label** — these are tasks on the admin panel side, status: `open` or `✅`.

---

## Summary

| Section                            | Open | Closed ✅ | P0  | P1  | P2  | P3  |
| ---------------------------------- | ---- | --------- | --- | --- | --- | --- |
| C. OneEntry Admin Setup            | 1    | 1         | —   | —   | —   | —   |
| D. Conscious deviations from rules | 4    | —         | —   | —   | —   | —   |

Section B is omitted: this storefront has no external standard (no Figma / `static-html/`
reference) to verify against — the layout is authored in-repo.

---

## Section C. OneEntry Admin Setup

### C.2. Pages

**C.2.1** (2026-08-10) — ✅ Third-level catalog `pageUrl`s made unique.

22 catalog slugs were shared with the mirror-gender subtree (`men_shoes/shoes` and
`women_shoes/shoes` both answered to `shoes`), which made `Pages.getPageByUrl('shoes')`
ambiguous — it returned whichever branch the API picked, with no way to disambiguate.

The user chose rename over delete. All 44 pages (22 slugs × 2 branches) were renamed to the
convention level 2 already follows — `<parentPageUrl>_<leaf>`, hyphens folded to
underscores:

| before             | after                                                               |
| ------------------ | ------------------------------------------------------------------- |
| `shoes`            | `men_shoes_shoes` / `women_shoes_shoes`                             |
| `hoodies-sweaters` | `men_clothing_hoodies_sweaters` / `women_clothing_hoodies_sweaters` |
| `bags`             | `men_bags_bags` / `women_bags_bags`                                 |

Applied by `.claude/temp/admin-rename-dup-pages.mjs` (read-modify-write of the full admin
page object — a partial PUT drops omitted fields). The old→new mapping is in
`.claude/temp/rename-dup-pages.result.json`, which is what an undo run would need.
Re-checked afterwards: 137 pages, 0 duplicate `pageUrl`s.

No code changed. Nothing in `src/` referenced these slugs, and product filtering matches on
the first two path segments (`/women/women_shoes`), so only the untouched tail moved.

### C.4. Attributes / AttributesSets

**C.4.1** (2026-08-10) — Fill the `service_maintenance_category_*` dictionary keys, or drop them.

`AttributesSets.getAttributesByMarker('service_maintenance')` currently exposes only
`service_maintenance_category_alteration` and `service_maintenance_category_other`. Since
2026-08-10 the service-request category list is read from the OE **form** instead
(`service_request` → `category` → `listTitles`, see D.1), so these dictionary keys are a
second, partially-filled source for the same copy. They still serve as the display fallback
for retired options in
[ServiceMaintenanceSection.tsx](src/app/pages/account/ServiceMaintenanceSection.tsx) — either
complete the set to match the form's five values, or delete the keys so the form stays the
single source.

Left open deliberately rather than guessed at: since the code now reads live options from the
form, neither choice changes what a shopper sees, so this is an editorial call about where
the copy should live, not a defect. Filling the three missing keys would re-create the very
duplication that caused the `restoration` / `sole-replacement` drift; deleting the two
existing ones costs the fallback for records written against a since-retired option. Nothing
was written to the panel either way.

| listTitles value   | title            | dictionary key                            |
| ------------------ | ---------------- | ----------------------------------------- |
| `repair`           | Repair           | missing                                   |
| `cleaning`         | Cleaning         | missing                                   |
| `alteration`       | Alteration       | `service_maintenance_category_alteration` |
| `sole-replacement` | Sole replacement | missing                                   |
| `other`            | Other            | `service_maintenance_category_other`      |

---

## Section D. Conscious deviations from rules

### D.1. Forms render hand-authored fields, not a loop over `attributes`

- **Rule:** core MCP checklist §5 — "Forms — ALWAYS dynamic. Never hardcode
  `<input name="..." type="...">`; render by `attribute.type` / `attribute.marker`."
- **Deviation:** every form screen ships its own JSX
  ([ServiceRequestForm](src/app/pages/account/service/ServiceRequestForm.tsx),
  [ReserveInStoreModal](src/app/pages/product/ReserveInStoreModal.tsx),
  [WriteReviewModal](src/app/pages/product/WriteReviewModal.tsx),
  [AddressesSection](src/app/pages/account/myData/AddressesSection.tsx)); only the _content_
  comes from OE — labels, placeholders, option lists and result messages, via
  [loadFormContent](src/lib/oneentry/forms/placeholders.ts) and the `useFormLabel` /
  `useFormPlaceholder` / `useFormOptions` / `useFormMessage` hooks.
- **Reason:** the storefront's forms are laid out per-design (two-column grids, an inline
  star rating, a store picker with a map, a date field that feeds a `timeInterval` request) —
  a generic `type`-driven renderer cannot produce them, and a renderer with per-marker
  overrides for every field is the hand-written form with extra indirection. The rule's
  actual failure mode — copy frozen in code, options drifting from the panel — is closed by
  reading all of it from OE.
- **Cost, accepted:** a field _added_ in the panel does not appear on the site without a
  deploy. Guarded by keeping every fallback option list value-identical to `listTitles`
  (see C.4.1 for the one that had drifted).
- **Date:** 2026-08-10. **Review:** if a tenant starts authoring new form fields
  expecting them to show up live.

### D.2. Server Actions and loaders return adapted view models, not raw SDK entities

- **Rule:** core MCP checklist §10 + `common-mistakes` — "Server Action — thin proxy. Do not
  create intermediate types and do not map API responses to custom objects. Only `filter`
  and `sort` are allowed."
- **Deviation:** the `src/lib/oneentry/**` layer defines its own shapes — `OeUser`,
  `CmsMenu` / `MenuPageNode`, `FormContent`, `ServiceRequest`, and the catalog
  [adapt.ts](src/lib/oneentry/catalog/adapt.ts).
- **Reason:** these values cross the server→client boundary as props, so they must be
  serializable and small; the raw entities carry per-locale envelopes and attribute bags that
  would ship tens of kilobytes of unused JSON per page and pin every component to the wire
  format. The adapters are also the single place where OE's shape variance (one-file-object
  vs array, flat vs language-keyed `localizeInfos`) is absorbed — the thing the rule's own
  §7 warns about, handled once instead of at every call site.
- **Cost, accepted:** a new OE field needs a line in the adapter before a component can read
  it.
- **Date:** 2026-08-10. **Review:** if OE stabilises its response shapes enough that
  components can consume entities directly.

### D.3. `images.unoptimized: true` globally

- **Rule:** `performance-images.md` — `unoptimized` only for SVG and animated GIFs.
- **Reason:** `/_next/image` could not keep up with this catalog (see the reasoning kept
  inline in [next.config.ts](next.config.ts)); OE CDN serves acceptable weights directly.
  The cheaper fix is CMS-side — re-uploading block images through an OE preview template,
  which also mints the LQIP.
- **Cost, accepted:** the homepage hero ships a full-size JPEG.
- **Date:** 2026-08-05. **Review:** on hosting change, or once block images are re-uploaded
  through a preview template.

### D.4. Shopper session lives in `localStorage`, not in an httpOnly cookie

- **Rule:** general web-security practice; `security.md` describes the trade-off.
- **Reason:** OE binds the refresh token to the browser's device fingerprint (`tokens.md`),
  so a server-held token can never be refreshed from the client — `AuthProvider.auth` /
  `signUp` must run in the browser, and the token has to live where they run. See the header
  comment in [src/lib/oneentry/index.ts](src/lib/oneentry/index.ts).
- **Cost, accepted:** XSS reaches the token. Compensated by CSP and by sanitising all
  CMS-authored HTML ([sanitize-html.ts](src/lib/sanitize-html.ts)).
- **Date:** 2026-08-05. **Review:** if the API drops the fingerprint binding.
