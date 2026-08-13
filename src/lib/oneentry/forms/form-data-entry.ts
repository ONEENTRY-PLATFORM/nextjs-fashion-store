/** Narrowing helpers for OE form-data records. */
import type { FormDataType } from 'oneentry/dist/forms-data/formsDataInterfaces';

/** A form-data entry known to carry the marker that identifies its field. */
export type MarkedFormDataEntry = FormDataType & { marker: string; type?: string; value: unknown };

/** Type guard: does this entry name the field it belongs to? */
export function hasMarker(item: FormDataType): item is MarkedFormDataEntry {
  return (
    typeof item === 'object' &&
    item !== null &&
    'marker' in item &&
    typeof (item as { marker?: unknown }).marker === 'string'
  );
}

/** Read one field's value out of a record's `formData`. */
export function formDataValue(items: readonly FormDataType[] | undefined, marker: string): unknown {
  if (!Array.isArray(items)) return undefined;
  return items.find((item): item is MarkedFormDataEntry => hasMarker(item) && item.marker === marker)?.value;
}
