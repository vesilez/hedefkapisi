export type FirebaseErrorCode = string;

const DEFAULT_FIREBASE_ERROR_MESSAGE =
  "İşlem sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.";

const FIREBASE_ERROR_MESSAGES: Readonly<Record<FirebaseErrorCode, string>> = {
  "auth/invalid-email": "Geçerli bir e-posta adresi girin.",
  "auth/user-disabled": "Bu kullanıcı hesabı devre dışı bırakılmış.",
  "auth/user-not-found": "Bu bilgilerle eşleşen bir kullanıcı bulunamadı.",
  "auth/wrong-password": "E-posta veya şifre hatalı.",
  "auth/email-already-in-use": "Bu e-posta adresi zaten kullanılıyor.",
  "auth/weak-password": "Şifre yeterince güçlü değil.",
  "auth/too-many-requests":
    "Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.",
  "auth/network-request-failed":
    "Ağ bağlantısı kurulamadı. İnternet bağlantınızı kontrol edin.",
  "auth/invalid-credential": "E-posta veya şifre hatalı.",
  "permission-denied": "Bu işlemi gerçekleştirmek için yetkiniz yok.",
  "firestore/permission-denied": "Bu işlemi gerçekleştirmek için yetkiniz yok.",
  unavailable: "Hizmete şu anda ulaşılamıyor. Lütfen tekrar deneyin.",
  "firestore/unavailable":
    "Hizmete şu anda ulaşılamıyor. Lütfen tekrar deneyin.",
  "storage/unauthorized": "Bu dosyaya erişmek için yetkiniz yok.",
  "storage/object-not-found": "İstenen dosya bulunamadı.",
  "storage/quota-exceeded":
    "Dosya depolama kotası aşıldı. Lütfen daha sonra tekrar deneyin.",
};

function hasStringCode(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  );
}

export function getFirebaseErrorCode(
  error: unknown,
): FirebaseErrorCode | undefined {
  return hasStringCode(error) ? error.code : undefined;
}

export function getFirebaseErrorMessage(error: unknown): string {
  const code = getFirebaseErrorCode(error);

  if (!code) return DEFAULT_FIREBASE_ERROR_MESSAGE;

  return FIREBASE_ERROR_MESSAGES[code] ?? DEFAULT_FIREBASE_ERROR_MESSAGE;
}
