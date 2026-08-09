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

import { getImage, getImages, getImageUrl, getImageUrls } from '@/lib/oneentry/index';

const file = (name: string) => ({
  downloadLink: `https://cdn.oneentry.cloud/${name}.jpg`,
  previewLink: `https://cdn.oneentry.cloud/${name}-preview.jpg`,
});

/** A record uploaded through a preview template — `previewLink` is a level map. */
const lqipFile = (name: string, opts: { defaultPreview?: string; levels?: string[] } = {}) => {
  const levels = opts.levels ?? ['default', 'thumb'];
  return {
    downloadLink: `https://cdn.oneentry.cloud/${name}.jpg`,
    previewLink: Object.fromEntries(
      levels.map((lvl) => [
        lvl,
        [`data:image/webp;base64,${lvl}-${name}`, `https://cdn.oneentry.cloud/${name}.preview.${lvl}.jpg`],
      ]),
    ),
    ...(opts.defaultPreview ? { defaultPreview: opts.defaultPreview } : {}),
  };
};

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
    expect(getImageUrl({ previewLink: 'https://cdn.oneentry.cloud/only-preview.jpg' })).toBe(
      'https://cdn.oneentry.cloud/only-preview.jpg',
    );
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
    expect(getImageUrls([file('keep'), {}, { downloadLink: '' }])).toEqual(['https://cdn.oneentry.cloud/keep.jpg']);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty array', []],
  ])('returns [] for %s', (_label, input) => {
    expect(getImageUrls(input)).toEqual([]);
  });
});

/**
 * Files uploaded through a preview template carry the LQIP inline, as the first
 * entry of `previewLink[level]`. The regression these lock down: the object
 * shape must never reach an `<img src>` — it stringifies to "[object Object]"
 * and 404s — and the blur must survive the trip to `blurDataURL`.
 */
describe('getImage — preview-template LQIP', () => {
  it('returns the download url plus the blur data uri', () => {
    expect(getImage(lqipFile('coat'))).toEqual({
      url: 'https://cdn.oneentry.cloud/coat.jpg',
      blur: 'data:image/webp;base64,default-coat',
    });
  });

  it('honours defaultPreview when picking the level', () => {
    expect(getImage(lqipFile('coat', { defaultPreview: 'thumb' })).blur).toBe('data:image/webp;base64,thumb-coat');
  });

  it('falls back to the only level when the named one is missing', () => {
    expect(getImage(lqipFile('coat', { defaultPreview: 'nope', levels: ['card'] })).blur).toBe(
      'data:image/webp;base64,card-coat',
    );
  });

  it('leaves blur undefined for a legacy string previewLink', () => {
    expect(getImage(file('legacy'))).toEqual({ url: 'https://cdn.oneentry.cloud/legacy.jpg' });
  });

  it('never leaks the level object into the url', () => {
    const noDownload = { previewLink: lqipFile('x').previewLink };
    const { url } = getImage(noDownload);
    expect(url).toBe('');
    expect(url).not.toContain('object Object');
  });

  it('ignores a pair whose first entry is not a data uri', () => {
    expect(
      getImage({
        downloadLink: 'https://cdn.oneentry.cloud/a.jpg',
        previewLink: { default: ['https://cdn.oneentry.cloud/a.preview.jpg', 'x'] },
      }).blur,
    ).toBeUndefined();
  });

  it('unwraps the attribute envelope like getImageUrl does', () => {
    expect(getImage({ value: [lqipFile('wrapped')] }).blur).toBe('data:image/webp;base64,default-wrapped');
  });

  it('keeps getImageUrl string-only for the same input', () => {
    expect(getImageUrl(lqipFile('coat'))).toBe('https://cdn.oneentry.cloud/coat.jpg');
  });
});

describe('getImages — galleries carry per-file blur', () => {
  it('pairs every url with its own blur', () => {
    expect(getImages([lqipFile('a'), lqipFile('b')])).toEqual([
      { url: 'https://cdn.oneentry.cloud/a.jpg', blur: 'data:image/webp;base64,default-a' },
      { url: 'https://cdn.oneentry.cloud/b.jpg', blur: 'data:image/webp;base64,default-b' },
    ]);
  });

  it('mixes legacy and preview-template records without dropping either', () => {
    expect(getImages([file('old'), lqipFile('new')])).toEqual([
      { url: 'https://cdn.oneentry.cloud/old.jpg', blur: undefined },
      { url: 'https://cdn.oneentry.cloud/new.jpg', blur: 'data:image/webp;base64,default-new' },
    ]);
  });

  it('stays in sync with getImageUrls', () => {
    const value = [lqipFile('a'), {}, lqipFile('b')];
    expect(getImages(value).map((i) => i.url)).toEqual(getImageUrls(value));
  });
});
