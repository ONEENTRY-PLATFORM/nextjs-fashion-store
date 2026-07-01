import { t, type Lang } from './system-text';

export async function SystemText({
  set,
  k,
  fallback,
  lang = 'en_US',
}: {
  set: string;
  k: string;
  fallback: string;
  lang?: Lang;
}) {
  const value = await t(set, k, fallback, lang);
  return <>{value}</>;
}
