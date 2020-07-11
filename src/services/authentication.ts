import { SymmetricKey, V2 as Protocol } from 'paseto.js';
import { v4 as uuid } from 'uuid';

import User from '!/entities/User';
import { Payload } from '!/types';

const SECRET_B64 = process.env.SECRET_B64!;

/**
 * Encrypt payload returning the token.
 */
export async function toToken(user: Partial<User>): Promise<string> {
  // Create key
  const key = new SymmetricKey(new Protocol());

  // Inject secret
  await key.base64(SECRET_B64);

  // Set token`s payload
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const payload: Payload = { __uuid: uuid(), id: user.id! };

  // Prepare payload
  const message = JSON.stringify(payload, null, 0);

  // Encrypt message returning the token
  return key.protocol().encrypt(message, key);
}

/**
 * Decrypt token returning the payload.
 */
export async function fromToken(token: string): Promise<string> {
  // Create key
  const key = new SymmetricKey(new Protocol());

  // Inject secret
  await key.base64(SECRET_B64);

  // Decrypt token returning message
  const message = await key.protocol().decrypt(token, key);

  // Get token`s data
  const payload: Payload = JSON.parse(message);

  // Return payload
  return payload.id;
}

/**
 * Find token from request header Bearer, then return related User.
 */
export async function getUserFromHeader(
  headers: Record<string, string | string[] | undefined>,
): Promise<string | null> {
  // Check existence of header
  if (!headers?.authorization) {
    return null;
  }

  // Check if header is correctly formed
  const parts = (headers.authorization as string).split(' ');
  if (parts.length !== 2) {
    return null;
  }

  const [scheme, token] = parts;

  // Check first part
  if (!/^Bearer$/i.test(scheme)) {
    return null;
  }

  // Check specific for Insomnia variable
  if (!token || token === 'null') {
    return null;
  }

  try {
    // Get ID from token
    const userId = await fromToken(token);

    return userId;
  } catch {
    return null;
  }
}
