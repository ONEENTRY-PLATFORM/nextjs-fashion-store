/** The two shapes OE answers `attributeValues` in, and the helper that flattens them. Pure and client-safe — the block renderers import it too. */
import type { IAttributeValues } from 'oneentry/types';

/** `attributeValues` as it actually arrives: already picked for the requested locale — all `IAttributeValues` describes — or wrapped in a per-locale map, depending on which endpoint answered. */
export type MaybeLocalizedAttributes = IAttributeValues | Record<string, IAttributeValues>;

/** Flatten `attributeValues` to one locale, accepting both shapes. A tenant whose attribute markers collide with a locale code would fool this, which is the same bet every call site here was already making. */
export function attributesForLang(av: MaybeLocalizedAttributes | unknown, lang: string): IAttributeValues {
  if (!av || typeof av !== 'object') return {};
  const wrapped = (av as Record<string, IAttributeValues | undefined>)[lang];
  return wrapped && typeof wrapped === 'object' && !Array.isArray(wrapped) ? wrapped : (av as IAttributeValues);
}
