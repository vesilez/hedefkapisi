import { getMissingFirebaseEnvKeys, type FirebaseEnvKey } from "@/config/env";

export interface FirebaseConfigStatus {
  configured: boolean;
  missingKeys: FirebaseEnvKey[];
}

export function getFirebaseConfigStatus(): FirebaseConfigStatus {
  const missingKeys = getMissingFirebaseEnvKeys();

  return {
    configured: missingKeys.length === 0,
    missingKeys,
  };
}
