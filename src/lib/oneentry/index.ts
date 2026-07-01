import { defineOneEntry } from 'oneentry';

const url = process.env.ONEENTRY_URL ?? '';
const token = process.env.ONEENTRY_TOKEN ?? '';

export const isOneEntryEnabled = Boolean(url && token);

export const oneentry = isOneEntryEnabled
  ? defineOneEntry(url, { token })
  : null;

export type OneEntryClient = NonNullable<typeof oneentry>;
