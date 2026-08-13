'use client';
import { createContext, useContext } from 'react';

// From the client-safe module, not `./sign-up-form` — that one imports `next/root-params`, which cannot appear in a client bundle.
import { EMPTY_SIGN_UP_FORM_SCHEMA, type SignUpFormSchema } from './sign-up-form-schema';

const SignUpFormSchemaContext = createContext<SignUpFormSchema>(EMPTY_SIGN_UP_FORM_SCHEMA);

export function SignUpFormSchemaProvider({ data, children }: { data?: SignUpFormSchema; children: React.ReactNode }) {
  return (
    <SignUpFormSchemaContext.Provider value={data ?? EMPTY_SIGN_UP_FORM_SCHEMA}>
      {children}
    </SignUpFormSchemaContext.Provider>
  );
}

export function useSignUpFormSchema(): SignUpFormSchema {
  return useContext(SignUpFormSchemaContext);
}
