import { getSystemSet, readSystemValue, type Lang } from '../system-text';
import { INTERFACE_CONTROLS_SET_MARKER, type InterfaceControlsDict } from './interface-controls-types';
export { INTERFACE_CONTROLS_SET_MARKER } from './interface-controls-types';
export type { InterfaceControlsDict } from './interface-controls-types';

export async function loadInterfaceControlsSystemTexts(
  lang: Lang = 'en_US',
): Promise<InterfaceControlsDict> {
  const schema = await getSystemSet(INTERFACE_CONTROLS_SET_MARKER, lang);
  const dict: InterfaceControlsDict = {};
  for (const [key, item] of Object.entries(schema)) {
    const v = readSystemValue(item, lang);
    if (typeof v === 'string' && v.length > 0) dict[key] = v;
  }
  return dict;
}
