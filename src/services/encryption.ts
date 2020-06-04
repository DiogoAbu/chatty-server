import * as bcrypt from 'bcrypt';

import clamp from '!/helpers/clamp';

// Get salt rounds from env
export const ROUNDS = parseInt(process.env.SALT_ROUNDS!, 10) || 12;

// Available encryptors
export enum Encryptors {
  'bcrypt' = 'bcrypt',
}

// Active encryptor
export const activeEncryptor: string = Encryptors[process.env.ENCRYPTOR || 'bcrypt'];

// Length to store and retrieve from password string
const encryptorLength = 4;
const roundsLength = 2;

export type HashPassArgs = {
  encryptor?: Encryptors;
  rounds?: number;
  plain: string;
};

/**
 * Encrypt plain password using chosen encryption, stores encryption identifier
 * alongside the password.
 */
export async function hashPass({ encryptor, rounds, plain }: HashPassArgs): Promise<string> {
  let hashed = '';

  // Decide between chosen encrytor or default one
  const finalEncryptor = encryptor || activeEncryptor;

  // Se max and min for rouds
  const finalRounds = clamp(rounds || ROUNDS, 10, 99);

  switch (finalEncryptor) {
    default:
      hashed = await bcrypt.hash(plain, finalRounds);
      break;
  }

  // encryptor+rounds+pass => bcry10hashedpassword
  return finalEncryptor.slice(0, encryptorLength) + ROUNDS.toString() + hashed;
}

export type ComparePassArgs = {
  plain: string;
  hashed: string;
};

/**
 * Compare plain password with hashed one, using encryption stored in the latter.
 */
export async function comparePass({ plain, hashed }: ComparePassArgs): Promise<boolean> {
  // Get first part
  const encryptor = hashed.slice(0, encryptorLength);

  // Get second part
  // const rounds = hashed.slice(encryptorLength, encryptorLength + roundsLength);
  // Get from length until the end
  const hash = hashed.slice(encryptorLength + roundsLength);

  switch (encryptor) {
    default:
      return bcrypt.compare(plain, hash);
  }
}
