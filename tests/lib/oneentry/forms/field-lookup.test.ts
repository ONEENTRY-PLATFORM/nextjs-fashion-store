import { describe, expect, it } from 'vitest';

import {
  entityOptionIds,
  fieldByRole,
  fieldsOfType,
  markerForRole,
  selectableEntityOptions,
  soleFieldOfType,
  visibleFields,
} from '@/lib/oneentry/forms/field-lookup';
import type { FormAttributeContent, FormContent } from '@/lib/oneentry/forms/form-content';
import { EMPTY_FORM_CONTENT, NO_FIELD_LIMITS } from '@/lib/oneentry/forms/form-content';

function field(over: Partial<FormAttributeContent> & { marker: string }): FormAttributeContent {
  return {
    type: 'string',
    position: 1,
    isVisible: true,
    title: '',
    placeholder: '',
    fields: {},
    options: [],
    limits: NO_FIELD_LIMITS,
    ...over,
  };
}

function form(fields: FormAttributeContent[]): FormContent {
  return {
    ...EMPTY_FORM_CONTENT,
    attributes: Object.fromEntries(fields.map((f) => [f.marker, f])),
    fields,
  };
}

// Mirrors what OE returns for the store-pickup form: the containing section
// first (depth 0), then the pages an editor ticked.
const STORE_OPTIONS = [
  { title: 'Store Locations', value: '9', extended: '', entityId: 9, depth: 0, parentId: null },
  { title: 'Oxford Street', value: '169', extended: '', entityId: 169, depth: 1, parentId: 9 },
  { title: 'Covent Garden', value: '170', extended: '', entityId: 170, depth: 1, parentId: 9 },
];

describe('visibleFields', () => {
  it('drops fields the admin hid', () => {
    const f = form([field({ marker: 'a' }), field({ marker: 'b', isVisible: false })]);

    expect(visibleFields(f).map((x) => x.marker)).toEqual(['a']);
  });

  it('returns an empty list for a form that never loaded', () => {
    expect(visibleFields(undefined)).toEqual([]);
  });
});

describe('fieldsOfType / soleFieldOfType', () => {
  it('finds a field by its type regardless of how the marker is spelled', () => {
    const f = form([
      field({ marker: 'anything_at_all', type: 'timeInterval', position: 2 }),
      field({ marker: 'renamed_yesterday', type: 'list', position: 1 }),
    ]);

    expect(soleFieldOfType(f, 'list')?.marker).toBe('renamed_yesterday');
    expect(soleFieldOfType(f, 'timeInterval')?.marker).toBe('anything_at_all');
  });

  it('returns undefined rather than guessing when several fields share a type', () => {
    const f = form([field({ marker: 'a', type: 'string' }), field({ marker: 'b', type: 'string' })]);

    expect(soleFieldOfType(f, 'string')).toBeUndefined();
    expect(fieldsOfType(f, 'string')).toHaveLength(2);
  });

  it('ignores hidden fields when deciding the type is unique', () => {
    const f = form([field({ marker: 'a', type: 'list' }), field({ marker: 'b', type: 'list', isVisible: false })]);

    expect(soleFieldOfType(f, 'list')?.marker).toBe('a');
  });
});

describe('fieldByRole / markerForRole', () => {
  /** Two same-typed fields that only the editor's `field_role` tells apart. */
  const ADDRESS = form([
    field({ marker: 'q7x', fields: { field_role: 'city' } }),
    field({ marker: 'b12', position: 2, fields: { field_role: 'postcode' } }),
    field({ marker: 'untagged', position: 3 }),
  ]);

  it('finds a field by the role an editor tagged it with', () => {
    expect(fieldByRole(ADDRESS, 'city')?.marker).toBe('q7x');
    expect(markerForRole(ADDRESS, 'postcode')).toBe('b12');
  });

  it('returns undefined for a role the form does not carry', () => {
    expect(fieldByRole(ADDRESS, 'instructions')).toBeUndefined();
    expect(markerForRole(ADDRESS, 'instructions')).toBeUndefined();
    expect(markerForRole(undefined, 'city')).toBeUndefined();
  });

  it('ignores a hidden field even when it carries the role', () => {
    const withHidden = form([field({ marker: 'h', isVisible: false, fields: { field_role: 'city' } })]);

    expect(fieldByRole(withHidden, 'city')).toBeUndefined();
  });
});

describe('selectableEntityOptions / entityOptionIds', () => {
  it('skips the containing section, which is a heading and not a choice', () => {
    const storeField = field({ marker: 'store', type: 'entity', options: STORE_OPTIONS });

    expect(selectableEntityOptions(storeField).map((o) => o.entityId)).toEqual([169, 170]);
  });

  it('collects the ids an editor ticked, in admin order', () => {
    const f = form([field({ marker: 'store', type: 'entity', options: STORE_OPTIONS })]);

    expect(entityOptionIds(f)).toEqual([169, 170]);
  });

  it('returns no ids when the form has no entity field, so callers impose no restriction', () => {
    expect(entityOptionIds(form([field({ marker: 'name' })]))).toEqual([]);
    expect(entityOptionIds(undefined)).toEqual([]);
  });
});
