import { cache } from 'react';
import { oneentry } from '../index';
import type { Lang } from '../system-text';

export interface SignUpFieldString {
  title: string;
  placeholder: string;
  helperText: string;
  autoComplete: string;
  inputType: string;
}
export interface SignUpFieldPhone extends SignUpFieldString {
  mask: string;
}
export interface SignUpFieldList {
  title: string;
  options: Array<{ title: string; value: string }>;
}
export interface SignUpFieldRadio {
  title: string;
  options: Array<{ title: string; value: string }>;
}
export interface SignUpFieldAgree extends SignUpFieldRadio {
  text1: string;
  termsTitle: string;
  text2: string;
  privacyTitle: string;
}

export interface SignUpFormSchema {
  email: SignUpFieldString;
  password: SignUpFieldString;
  first_name: SignUpFieldString;
  phone: SignUpFieldPhone;
  gender: SignUpFieldList;
  users_subscribe_to_promotional_email: SignUpFieldRadio;
  users_subscribe_to_promotional_sms: SignUpFieldRadio;
  users_agree: SignUpFieldAgree;
}

export const EMPTY_SIGN_UP_FORM_SCHEMA: SignUpFormSchema = {
  email: { title: '', placeholder: '', helperText: '', autoComplete: '', inputType: '' },
  password: { title: '', placeholder: '', helperText: '', autoComplete: '', inputType: '' },
  first_name: { title: '', placeholder: '', helperText: '', autoComplete: '', inputType: '' },
  phone: { title: '', placeholder: '', helperText: '', autoComplete: '', inputType: '', mask: '' },
  gender: { title: '', options: [] },
  users_subscribe_to_promotional_email: { title: '', options: [] },
  users_subscribe_to_promotional_sms: { title: '', options: [] },
  users_agree: { title: '', options: [], text1: '', termsTitle: '', text2: '', privacyTitle: '' },
};

type RawAttribute = {
  type?: string;
  identifier?: string;
  localizeInfos?: { title?: string } | Record<string, { title?: string }>;
  additionalFields?: Record<string, unknown>;
  listTitles?: Array<{ title?: unknown; value?: unknown }> | null;
};
type RawSet = {
  schema?: Record<string, RawAttribute>;
};

const asStr = (v: unknown): string => (typeof v === 'string' ? v : '');

const titleOf = (attr: RawAttribute, lang: Lang): string => {
  const li = attr.localizeInfos;
  if (!li) return '';
  const flat = (li as { title?: string }).title;
  if (typeof flat === 'string') return flat;
  const wrapped = (li as Record<string, { title?: string }>)[lang];
  return asStr(wrapped?.title);
};

const af = (attr: RawAttribute): Record<string, unknown> => attr.additionalFields ?? {};

const stringField = (attr: RawAttribute | undefined, lang: Lang): SignUpFieldString => {
  if (!attr) return { title: '', placeholder: '', helperText: '', autoComplete: '', inputType: '' };
  const extras = af(attr);
  return {
    title: titleOf(attr, lang),
    placeholder: asStr(extras.placeholder),
    helperText: asStr(extras.helperText),
    autoComplete: asStr(extras.autoComplete),
    inputType: asStr(extras.inputType),
  };
};

const phoneField = (attr: RawAttribute | undefined, lang: Lang): SignUpFieldPhone => {
  if (!attr) return { title: '', placeholder: '', helperText: '', autoComplete: '', inputType: '', mask: '' };
  const extras = af(attr);
  return {
    title: titleOf(attr, lang),
    placeholder: asStr(extras.placeholder),
    helperText: asStr(extras.helperText),
    autoComplete: asStr(extras.autoComplete),
    inputType: asStr(extras.inputType),
    mask: asStr(extras.mask),
  };
};

const optionsOf = (attr: RawAttribute | undefined): Array<{ title: string; value: string }> => {
  if (!attr?.listTitles) return [];
  return attr.listTitles
    .map((o) => ({ title: asStr(o.title), value: asStr(o.value) }))
    .filter((o) => o.value.length > 0);
};

const agreeField = (attr: RawAttribute | undefined, lang: Lang): SignUpFieldAgree => {
  if (!attr) return { title: '', options: [], text1: '', termsTitle: '', text2: '', privacyTitle: '' };
  const extras = af(attr);
  const pickVal = (key: string): string => {
    const entry = extras[key] as { value?: unknown } | undefined;
    return asStr(entry?.value);
  };
  return {
    title: titleOf(attr, lang),
    options: optionsOf(attr),
    text1: pickVal('users_agree_text_1'),
    termsTitle: pickVal('users_agree_terms_of_service_link'),
    text2: pickVal('users_agree_text_2'),
    privacyTitle: pickVal('users_agree_personal_data_processing_and_protection_policy_link'),
  };
};

export const loadSignUpFormSchema = cache(
  async (lang: Lang = 'en_US'): Promise<SignUpFormSchema> => {
    if (!oneentry) return EMPTY_SIGN_UP_FORM_SCHEMA;
    try {
      const set = (await oneentry.AttributesSets.getAttributeSetByMarker(
        'users_sign_in_sign_up',
        lang,
      )) as unknown as RawSet;
      const schema = set?.schema ?? {};
      return {
        email: stringField(schema.email, lang),
        password: stringField(schema.password, lang),
        first_name: stringField(schema.first_name, lang),
        phone: phoneField(schema.phone, lang),
        gender: { title: titleOf(schema.gender ?? {}, lang), options: optionsOf(schema.gender) },
        users_subscribe_to_promotional_email: {
          title: titleOf(schema.users_subscribe_to_promotional_email ?? {}, lang),
          options: optionsOf(schema.users_subscribe_to_promotional_email),
        },
        users_subscribe_to_promotional_sms: {
          title: titleOf(schema.users_subscribe_to_promotional_sms ?? {}, lang),
          options: optionsOf(schema.users_subscribe_to_promotional_sms),
        },
        users_agree: agreeField(schema.users_agree, lang),
      };
    } catch {
      return EMPTY_SIGN_UP_FORM_SCHEMA;
    }
  },
);
