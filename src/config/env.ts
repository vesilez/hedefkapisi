import { z } from "zod";

export const FIREBASE_ENV_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export type FirebaseEnvKey = (typeof FIREBASE_ENV_KEYS)[number];

const requiredEnvValue = (key: FirebaseEnvKey) =>
  z
    .string({ error: `${key} ortam değişkeni eksik.` })
    .trim()
    .min(1, `${key} ortam değişkeni eksik.`);

const firebaseEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: requiredEnvValue(
    "NEXT_PUBLIC_FIREBASE_API_KEY",
  ),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: requiredEnvValue(
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  ),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: requiredEnvValue(
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  ),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: requiredEnvValue(
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  ),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: requiredEnvValue(
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  ),
  NEXT_PUBLIC_FIREBASE_APP_ID: requiredEnvValue("NEXT_PUBLIC_FIREBASE_APP_ID"),
});

export type FirebaseEnv = z.infer<typeof firebaseEnvSchema>;

function readFirebaseEnv(): Record<FirebaseEnvKey, string | undefined> {
  return {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function getFirebaseEnv(): FirebaseEnv {
  const result = firebaseEnvSchema.safeParse(readFirebaseEnv());

  if (!result.success) {
    const details = result.error.issues.map((issue) => issue.message).join(" ");
    throw new Error(`Firebase ortam değişkenleri geçersiz: ${details}`);
  }

  return result.data;
}

export function getMissingFirebaseEnvKeys(): FirebaseEnvKey[] {
  const values = readFirebaseEnv();

  return FIREBASE_ENV_KEYS.filter((key) => !values[key]?.trim());
}
