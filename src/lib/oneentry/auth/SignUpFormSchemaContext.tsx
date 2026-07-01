'use client';
import { createContext, useContext } from 'react';
import {
  EMPTY_SIGN_UP_FORM_SCHEMA,
  type SignUpFormSchema,
} from './sign-up-form';

const SignUpFormSchemaContext = createContext<SignUpFormSchema>(EMPTY_SIGN_UP_FORM_SCHEMA);

export function SignUpFormSchemaProvider({
  data,
  children,
}: {
  data?: SignUpFormSchema;
  children: React.ReactNode;
}) {
  return (
    <SignUpFormSchemaContext.Provider value={data ?? EMPTY_SIGN_UP_FORM_SCHEMA}>
      {children}
    </SignUpFormSchemaContext.Provider>
  );
}

export function useSignUpFormSchema(): SignUpFormSchema {
  return useContext(SignUpFormSchemaContext);
}
