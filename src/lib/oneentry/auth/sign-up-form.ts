import type { IAttributeSchemaItem, IAttributeSetsEntity } from 'oneentry/dist/attribute-sets/attributeSetsInterfaces';
import { cache } from 'react';

import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { getApiSafe, isError } from '@/lib/oneentry/index';
import type { Lang } from '@/lib/oneentry/system-text';

import type { SignUpFieldAgree, SignUpFieldPhone, SignUpFieldString, SignUpFormSchema } from './sign-up-form-schema';
import { EMPTY_SIGN_UP_FORM_SCHEMA } from './sign-up-form-schema';

// Re-exported so existing importers keep their specifier; definitions live in a client-safe module (see `sign-up-form-schema.ts`).
export type {
  SignUpFieldAgree,
  SignUpFieldList,
  SignUpFieldPhone,
  SignUpFieldRadio,
  SignUpFieldString,
  SignUpFormSchema,
} from './sign-up-form-schema';
export { EMPTY_SIGN_UP_FORM_SCHEMA } from './sign-up-form-schema';

/** The `users_sign_in_sign_up` schema, keyed by attribute marker. */
type SignUpSchema = Partial<Record<string, IAttributeSchemaItem>>;

const asStr = (v: unknown): string => (typeof v === 'string' ? v : '');

/** `localizeInfos` arrives either flattened against the requested locale (`{title}`) or language-keyed (`{en_US: {title}}`). */
const titleOf = (attr: Pick<IAttributeSchemaItem, 'localizeInfos'> | undefined, lang: Lang): string => {
  const li = attr?.localizeInfos;
  if (!li) return '';
  if (typeof li.title === 'string') return li.title;
  const wrapped = li[lang] as { title?: unknown } | undefined;
  return asStr(wrapped?.title);
};

/** Read one `additionalFields` entry as a string. */
const extra = (attr: IAttributeSchemaItem | undefined, key: string): string => {
  const entry = attr?.additionalFields?.[key];
  if (typeof entry === 'string') return entry;
  return asStr(entry?.value);
};

const stringField = (attr: IAttributeSchemaItem | undefined, lang: Lang): SignUpFieldString => {
  if (!attr) return { title: '', placeholder: '', helperText: '', autoComplete: '', inputType: '' };
  return {
    title: titleOf(attr, lang),
    placeholder: extra(attr, 'placeholder'),
    helperText: extra(attr, 'helperText'),
    autoComplete: extra(attr, 'autoComplete'),
    inputType: extra(attr, 'inputType'),
  };
};

const phoneField = (attr: IAttributeSchemaItem | undefined, lang: Lang): SignUpFieldPhone => {
  if (!attr) return { title: '', placeholder: '', helperText: '', autoComplete: '', inputType: '', mask: '' };
  return {
    title: titleOf(attr, lang),
    placeholder: extra(attr, 'placeholder'),
    helperText: extra(attr, 'helperText'),
    autoComplete: extra(attr, 'autoComplete'),
    inputType: extra(attr, 'inputType'),
    mask: extra(attr, 'mask'),
  };
};

const optionsOf = (attr: IAttributeSchemaItem | undefined): Array<{ title: string; value: string }> => {
  if (!attr?.listTitles) return [];
  return attr.listTitles
    .map((o) => ({ title: asStr(o.title), value: asStr(o.value) }))
    .filter((o) => o.value.length > 0);
};

const agreeField = (attr: IAttributeSchemaItem | undefined, lang: Lang): SignUpFieldAgree => {
  if (!attr) return { title: '', options: [], text1: '', termsTitle: '', text2: '', privacyTitle: '' };
  const pickVal = (key: string): string => extra(attr, key);
  return {
    title: titleOf(attr, lang),
    options: optionsOf(attr),
    text1: pickVal('users_agree_text_1'),
    termsTitle: pickVal('users_agree_terms_of_service_link'),
    text2: pickVal('users_agree_text_2'),
    privacyTitle: pickVal('users_agree_personal_data_processing_and_protection_policy_link'),
  };
};

export const loadSignUpFormSchema = cache(async (langArg?: Lang): Promise<SignUpFormSchema> => {
  const lang = langArg ?? (await currentCmsLocale());
  const api = getApiSafe();
  if (!api) return EMPTY_SIGN_UP_FORM_SCHEMA;
  try {
    const raw = await api.AttributesSets.getAttributeSetByMarker('users_sign_in_sign_up', lang);
    if (isError(raw)) return EMPTY_SIGN_UP_FORM_SCHEMA;
    // `schema` is typed as a total `Record<string, IAttributeSchemaItem>`, but a marker the admin has not authored is simply absent.
    const schema: SignUpSchema = (raw as IAttributeSetsEntity).schema ?? {};
    return {
      email: stringField(schema.email, lang),
      password: stringField(schema.password, lang),
      first_name: stringField(schema.first_name, lang),
      phone: phoneField(schema.phone, lang),
      gender: { title: titleOf(schema.gender, lang), options: optionsOf(schema.gender) },
      users_subscribe_to_promotional_email: {
        title: titleOf(schema.users_subscribe_to_promotional_email, lang),
        options: optionsOf(schema.users_subscribe_to_promotional_email),
      },
      users_subscribe_to_promotional_sms: {
        title: titleOf(schema.users_subscribe_to_promotional_sms, lang),
        options: optionsOf(schema.users_subscribe_to_promotional_sms),
      },
      users_agree: agreeField(schema.users_agree, lang),
    };
  } catch {
    return EMPTY_SIGN_UP_FORM_SCHEMA;
  }
});
