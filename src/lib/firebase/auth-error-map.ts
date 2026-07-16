import {
  getFirebaseErrorCode,
  getFirebaseErrorMessage,
} from "./firebase-error";

const AUTH_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  "auth/missing-password": "Şifre boş bırakılamaz.",
  "auth/requires-recent-login":
    "Bu işlem için kısa süre önce yeniden giriş yapmanız gerekir.",
};

export interface AuthErrorDetails {
  code: string;
  message: string;
}

export function getAuthErrorDetails(error: unknown): AuthErrorDetails {
  const code = getFirebaseErrorCode(error) ?? "auth/unknown";

  return {
    code,
    message: AUTH_ERROR_MESSAGES[code] ?? getFirebaseErrorMessage(error),
  };
}
