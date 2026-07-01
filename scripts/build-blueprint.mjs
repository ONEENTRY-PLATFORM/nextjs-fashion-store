#!/usr/bin/env node
// Transform blueprint.example.json → blueprint.json.
// Applies the documented corrections listed in build-blueprint.prompt.md:
//   1. users_auth_providers[].type: "password" → "email"
//   2. orders_storage[].price_expiration: missing → "10m"
//   3. forms[].type: null → "order" / "data"
//   4. templates[@tpl.product_default].general_type_id: 4 → 1
//   5. attributes_sets[reg_form|order_form|service_form].type_id → 7
//   6. attributes_sets[@aset.user].type_id → 8
//   7. Drop orders_storage_payment_accounts (@osp.card trap on fresh DB).
//   8. Populate forms[*].attributes_sets.en_US from mock data.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = resolve(ROOT, 'blueprint.example.json');
const DST = resolve(ROOT, 'blueprint.json');

const raw = readFileSync(SRC, 'utf8');
const bp = JSON.parse(raw);
const t = bp.tables;

const notes = [];
const find = (arr, id) => arr.find((r) => r.id === id);

// --- (1) users_auth_providers: type "password" → "email" (dump allows only oauth|email)
for (const row of t.users_auth_providers ?? []) {
  if (row.type === 'password') row.type = 'email';
}

// --- (2) orders_storage.price_expiration: ensure "10m" present
for (const row of t.orders_storage ?? []) {
  if (row.price_expiration == null || row.price_expiration === '') {
    row.price_expiration = '10m';
  }
}

// --- (3) forms.type: null → concrete
for (const row of t.forms ?? []) {
  if (row.type == null) {
    if (row.identifier === 'order') row.type = 'order';
    else if (row.identifier === 'service') row.type = 'data';
    else row.type = 'data';
  }
}

// --- (4) templates: product_default.general_type_id → 1 (product)
const tpl = find(t.templates ?? [], '@tpl.product_default');
if (tpl && tpl.general_type_id !== 1 && tpl.general_type_id !== 5) {
  tpl.general_type_id = 1;
}

// --- (5) form attribute sets → type_id 7 (forForms)
for (const aid of ['@aset.reg_form', '@aset.order_form', '@aset.service_form']) {
  const a = find(t.attributes_sets ?? [], aid);
  if (a) a.type_id = 7;
}

// --- (6) @aset.user (attached to user_groups) → type_id 8 (forUserGroups)
const userAset = find(t.attributes_sets ?? [], '@aset.user');
if (userAset) userAset.type_id = 8;

// --- (7) Drop orders_storage_payment_accounts on fresh DB
if (t.orders_storage_payment_accounts) {
  delete t.orders_storage_payment_accounts;
  notes.push('Removed orders_storage_payment_accounts (FK to unseeded payment_accounts).');
}

// --- (8) Populate forms.attributes_sets.en_US from mock data
// Mock sources:
//   USER_DATASET.credentials: { email: 'test@test.com', password: '111' }
//   USER_DATASET.addresses[0]: line1='14 Baker Street', city='London', postcode='W1U 3BW'
//   USER_DATASET.profile.phone: '+44 20 7946 0958', addresses[0].fullName: 'Jane Smith'
//   SERVICE_REQUESTS[0]: category='alteration', item='Ribbed Knit Midi Dress',
//                         notes='Ready for collection — please bring your receipt.'
const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const richText = (plain) => [
  {
    htmlValue: `<p>${escapeHtml(plain).replace(/\n/g, '<br/>')}</p>`,
    plainValue: String(plain),
    mdValue: String(plain),
    params: { isImageCompressed: true, editorMode: 'html' },
  },
];

const formFills = {
  '@form.reg': {
    string_id1: 'test@test.com',
    string_id2: '111',
  },
  '@form.order': {
    string_id1: '14 Baker Street, London W1U 3BW',
    string_id2: '+44 20 7946 0958',
    string_id3: 'Jane Smith',
  },
  '@form.service': {
    string_id1: 'alteration',
    string_id2: 'Ribbed Knit Midi Dress',
    text_id3: richText('Ready for collection — please bring your receipt.'),
  },
};

for (const row of t.forms ?? []) {
  const fills = formFills[row.id];
  if (!fills) continue;
  row.attributes_sets ??= {};
  row.attributes_sets.en_US ??= {};
  Object.assign(row.attributes_sets.en_US, fills);
}

// --- Validation pass ---------------------------------------------------------
const errors = [];

// Collect all defined tokens + all referenced tokens.
const defined = new Set();
const referenced = new Map(); // token → sample path
const walk = (node, path, isRoot = false) => {
  if (node == null) return;
  if (typeof node === 'string') {
    if (node.startsWith('@') && !isRoot) {
      referenced.set(node, path);
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${path}[${i}]`));
    return;
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === 'id' && typeof v === 'string' && v.startsWith('@')) {
        if (defined.has(v)) errors.push(`Duplicate token: ${v} at ${path}`);
        defined.add(v);
        continue;
      }
      walk(v, `${path}.${k}`);
    }
  }
};
walk(t, '$');

for (const [tok, where] of referenced) {
  if (!defined.has(tok)) errors.push(`Undefined token: ${tok} referenced at ${where}`);
}

// Row cap check.
for (const [name, rows] of Object.entries(t)) {
  if (Array.isArray(rows) && rows.length > 1000) {
    errors.push(`Row cap exceeded in ${name}: ${rows.length}`);
  }
}

// Check no "null" key inside attributes_sets.<lang>
const checkNullKeys = (obj, path) => {
  if (obj == null || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => checkNullKeys(v, `${path}[${i}]`));
    return;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'null') errors.push(`"null" key found at ${path}`);
    checkNullKeys(v, `${path}.${k}`);
  }
};
for (const [name, rows] of Object.entries(t)) {
  if (!Array.isArray(rows)) continue;
  rows.forEach((row, i) => {
    if (row && typeof row === 'object' && row.attributes_sets) {
      checkNullKeys(row.attributes_sets, `${name}[${i}].attributes_sets`);
    }
  });
}

if (errors.length) {
  console.error('Validation errors:');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}

// --- Write -------------------------------------------------------------------
writeFileSync(DST, JSON.stringify(bp, null, 2) + '\n', 'utf8');

const counts = Object.fromEntries(
  Object.entries(t)
    .filter(([, v]) => Array.isArray(v))
    .map(([k, v]) => [k, v.length]),
);

console.log('Wrote', DST);
console.log('Row counts:');
for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
if (notes.length) {
  console.log('Notes:');
  for (const n of notes) console.log(`  - ${n}`);
}
