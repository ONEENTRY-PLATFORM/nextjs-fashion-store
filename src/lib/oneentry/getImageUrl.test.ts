/**
 * `getImageUrl` / `getImageUrls` — the single normalizer for OE image-ish
 * attribute values.
 *
 * The regression these lock down: the wire shape depends only on the **number
 * of uploaded files** (SDK ≥ 1.0.157) — one file arrives as a bare object,
 * two or more as an array. Every call site used to handle the array case only,
 * so a banner silently vanished the moment a content manager deleted the
 * second picture.
 */
import { describe, expect, it } from 'vitest';
import { getImageUrl, getImageUrls } from './index';

const file = (name: string) => ({
  downloadLink: `https://cdn.oneentry.cloud/${name}.jpg`,
  previewLink: `https://cdn.oneentry.cloud/${name}-preview.jpg`,
});

describe('getImageUrl — shape tolerance', () => {
  it('reads a single-file attribute value (bare object)', () => {
    expect(getImageUrl(file('hero'))).toBe('https://cdn.oneentry.cloud/hero.jpg');
  });

  it('reads a multi-file attribute value (array) and takes the first entry', () => {
    expect(getImageUrl([file('one'), file('two')])).toBe('https://cdn.oneentry.cloud/one.jpg');
  });

  it('unwraps the `{ value: … }` attribute envelope', () => {
    expect(getImageUrl({ value: file('wrapped') })).toBe('https://cdn.oneentry.cloud/wrapped.jpg');
    expect(getImageUrl({ value: [file('wrapped-arr')] })).toBe('https://cdn.oneentry.cloud/wrapped-arr.jpg');
  });

  it('passes a plain string through unchanged', () => {
    expect(getImageUrl('https://cdn.oneentry.cloud/direct.jpg')).toBe('https://cdn.oneentry.cloud/direct.jpg');
  });
});

describe('getImageUrl — fallbacks and empty cases', () => {
  it('falls back to previewLink when downloadLink is absent', () => {
    expect(getImageUrl({ previewLink: 'https://cdn.oneentry.cloud/only-preview.jpg' }))
      .toBe('https://cdn.oneentry.cloud/only-preview.jpg');
  });

  it('prefers downloadLink over previewLink', () => {
    expect(getImageUrl(file('both'))).toBe('https://cdn.oneentry.cloud/both.jpg');
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty string', ''],
    ['empty array', []],
    ['empty object', {}],
    ['envelope with null value', { value: null }],
    ['array of non-objects', [1, 2, 3]],
    ['object with non-string links', { downloadLink: 42, previewLink: false }],
  ])('returns "" for %s', (_label, input) => {
    expect(getImageUrl(input)).toBe('');
  });
});

describe('getImageUrls — galleries', () => {
  it('returns every url of a groupOfImages attribute, in wire order', () => {
    expect(getImageUrls([file('a'), file('b'), file('c')])).toEqual([
      'https://cdn.oneentry.cloud/a.jpg',
      'https://cdn.oneentry.cloud/b.jpg',
      'https://cdn.oneentry.cloud/c.jpg',
    ]);
  });

  it('wraps a single-file value into a one-element list', () => {
    expect(getImageUrls(file('solo'))).toEqual(['https://cdn.oneentry.cloud/solo.jpg']);
  });

  it('unwraps the `{ value: … }` envelope', () => {
    expect(getImageUrls({ value: [file('x')] })).toEqual(['https://cdn.oneentry.cloud/x.jpg']);
  });

  it('drops entries without a usable link', () => {
    expect(getImageUrls([file('keep'), {}, { downloadLink: '' }])).toEqual([
      'https://cdn.oneentry.cloud/keep.jpg',
    ]);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty array', []],
  ])('returns [] for %s', (_label, input) => {
    expect(getImageUrls(input)).toEqual([]);
  });
});
