/**
 * Sign-up form shapes shared by the server loader and Client Components.
 *
 * Split out of `sign-up-form.ts` so `SignUpFormSchemaContext` can import the
 * type and the empty default without dragging in the loader — which reaches
 * for `next/root-params`, a Server-Component-only module that the build
 * refuses to place in a client bundle.
 */

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
