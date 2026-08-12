/**
 * Narrowing helpers for OE form-data records.
 *
 * The SDK types a submitted field as {@link FormDataType} — a union whose last
 * member is `Record<string, unknown>`, so `marker` is not readable off it
 * without a guard. That union is deliberate (the payload shape depends on the
 * attribute type), which is why this file narrows it at the access point rather
 * than declaring a private `{marker, type, value}` copy: a local triple would
 * drop the typed `value` payloads the SDK does describe, and would keep
 * compiling the day OE adds a field to them.
 */
import type { FormDataType } from 'oneentry/dist/forms-data/formsDataInterfaces';

/** A form-data entry known to carry the marker that identifies its field. */
export type MarkedFormDataEntry = FormDataType & { marker: string; type?: string; value: unknown };

/**
 * Type guard: does this entry name the field it belongs to?
 *
 * @param item - One element of a record's `formData`.
 * @returns `true` when `marker` is present and a string.
 */
export function hasMarker(item: FormDataType): item is MarkedFormDataEntry {
  return (
    typeof item === 'object' &&
    item !== null &&
    'marker' in item &&
    typeof (item as { marker?: unknown }).marker === 'string'
  );
}

/**
 * Read one field's value out of a record's `formData`.
 *
 * @param items  - The record's `formData`, in any order.
 * @param marker - Attribute marker to look for.
 * @returns The stored value, or `undefined` when the record has no such field.
 */
export function formDataValue(items: readonly FormDataType[] | undefined, marker: string): unknown {
  if (!Array.isArray(items)) return undefined;
  return items.find((item): item is MarkedFormDataEntry => hasMarker(item) && item.marker === marker)?.value;
}
