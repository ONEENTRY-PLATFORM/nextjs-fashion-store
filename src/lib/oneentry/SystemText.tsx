import { t, type Lang } from './system-text';
import { DEFAULT_LOCALE } from './locale';

export async function SystemText({
  set,
  k,
  fallback,
  lang = DEFAULT_LOCALE,
}: {
  set: string;
  k: string;
  fallback: string;
  lang?: Lang;
}) {
  const value = await t(set, k, fallback, lang);
  return <>{value}</>;
}
