'use server'
import { USER_DATASET } from '../data/userData';

/**
 * Validates login credentials server-side so that the plain-text mock password
 * never reaches the client bundle.
 *
 * Replace the body with a real DB/bcrypt lookup when connecting to an API.
 */
export async function validateCredentials(
  emailOrPhone: string,
  password: string,
): Promise<boolean> {
  const { email, password: validPassword } = USER_DATASET.credentials;
  const emailMatch = emailOrPhone.trim().toLowerCase() === email.toLowerCase();
  return emailMatch && password === validPassword;
}
