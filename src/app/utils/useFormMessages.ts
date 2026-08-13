'use client';

import { useMemo } from 'react';

import type { ValidationMessages } from '@/app/utils/copy';
import { VALIDATION_MESSAGES } from '@/app/utils/copy';
import { useDict } from '@/lib/oneentry/labels/DictContext';

import { type CheckoutBounds, createSchemas } from './schemas';

/** Marker prefix of the OE `form_messages` set. */
const PREFIX = 'form_messages_';

/** The form error copy for the current locale, admin values overlaid. */
export function useFormMessages(): ValidationMessages {
  return useDict(PREFIX, VALIDATION_MESSAGES);
}

/** Form schemas built with the admin panel's error wording. */
export function useSchemas(bounds?: CheckoutBounds): ReturnType<typeof createSchemas> {
  const messages = useFormMessages();
  // `bounds` is rebuilt each render by the caller's own `useMemo`; keying on its JSON keeps the schemas stable when the numbers didn't actually move.
  const boundsKey = JSON.stringify(bounds ?? {});
  return useMemo(() => createSchemas(messages, bounds ?? {}), [messages, boundsKey]); // eslint-disable-line react-hooks/exhaustive-deps
}
