'use client';

import { useMemo } from 'react';
import { useDict } from '../../lib/oneentry/labels/DictContext';
import { VALIDATION_MESSAGES, type ValidationMessages } from '../data/validationMessages';
import { createSchemas } from './schemas';

/** Marker prefix of the OE `form_messages` set. */
const PREFIX = 'form_messages_';

/**
 * The form error copy for the current locale, admin values overlaid.
 *
 * Every key resolves as `form_messages_<snake_case_key>`; keys the admin left
 * empty keep the shipped English.
 * @returns {ValidationMessages} The message table.
 */
export function useFormMessages(): ValidationMessages {
  return useDict(PREFIX, VALIDATION_MESSAGES);
}

/**
 * Form schemas built with the admin panel's error wording.
 *
 * Drop-in replacement for importing `loginSchema` & co. directly — those stay
 * exported, but they close over the shipped copy and cannot be reworded.
 * @returns The seven schemas, rebuilt whenever the dictionary changes.
 */
export function useSchemas(): ReturnType<typeof createSchemas> {
  const messages = useFormMessages();
  return useMemo(() => createSchemas(messages), [messages]);
}
