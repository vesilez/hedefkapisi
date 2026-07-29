import "client-only";

import { auth } from "@/lib/firebase/auth";
import { getAuthErrorDetails } from "@/lib/firebase/auth-error-map";
import {
  isPublicRegisterRole,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth-schema";
import type {
  AuthResult,
  AuthUser,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "@/types/auth";
import { createUserDocument } from "@/services/user-service";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

const INVALID_INPUT_CODE = "validation/invalid-input";

function validationFailure<T>(message: string): AuthResult<T> {
  return {
    success: false,
    error: {
      code: INVALID_INPUT_CODE,
      message,
    },
  };
}

function firebaseFailure<T>(error: unknown): AuthResult<T> {
  return {
    success: false,
    error: getAuthErrorDetails(error),
  };
}

export function mapFirebaseUser(user: User): AuthUser {
  return {
    id: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

export async function registerWithEmailAndPassword(
  input: RegisterInput,
): Promise<AuthResult<AuthUser>> {
  if (!isPublicRegisterRole(input.role)) {
    return {
      success: false,
      error: {
        code: "auth/invalid-role",
        message: "Bu kullanıcı rolüyle herkese açık kayıt yapılamaz.",
      },
    };
  }

  const validation = registerSchema.safeParse(input);

  if (!validation.success) {
    return validationFailure(
      validation.error.issues[0]?.message ?? "Kayıt bilgileri geçersiz.",
    );
  }

  try {
    const { email, password, name, surname, role } = validation.data;
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    await updateProfile(credential.user, {
      displayName: `${name} ${surname}`,
    });

    const userDocumentResult = await createUserDocument({
      uid: credential.user.uid,
      role,
      name,
      surname,
      email: credential.user.email ?? email,
      emailVerified: credential.user.emailVerified,
    });

    if (!userDocumentResult.success) {
      return {
        success: false,
        error: {
          code: "auth/user-document-creation-failed",
          message:
            "Hesabınız oluşturulmuş olabilir ancak kullanıcı kaydınız tamamlanamadı. Lütfen işlemi tekrar deneyin.",
        },
      };
    }

    await sendEmailVerification(credential.user);

    return {
      success: true,
      data: mapFirebaseUser(credential.user),
    };
  } catch (error: unknown) {
    return firebaseFailure(error);
  }
}

export async function loginWithEmailAndPassword(
  input: LoginInput,
): Promise<AuthResult<AuthUser>> {
  const validation = loginSchema.safeParse(input);

  if (!validation.success) {
    return validationFailure(
      validation.error.issues[0]?.message ?? "Giriş bilgileri geçersiz.",
    );
  }

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      validation.data.email,
      validation.data.password,
    );

    return {
      success: true,
      data: mapFirebaseUser(credential.user),
    };
  } catch (error: unknown) {
    return firebaseFailure(error);
  }
}

export async function logout(): Promise<AuthResult<void>> {
  try {
    await signOut(auth);

    return { success: true, data: undefined };
  } catch (error: unknown) {
    return firebaseFailure(error);
  }
}

export async function sendPasswordReset(
  input: ResetPasswordInput,
): Promise<AuthResult<void>> {
  const validation = resetPasswordSchema.safeParse(input);

  if (!validation.success) {
    return validationFailure(
      validation.error.issues[0]?.message ?? "E-posta adresi geçersiz.",
    );
  }

  try {
    await sendPasswordResetEmail(auth, validation.data.email);

    return { success: true, data: undefined };
  } catch (error: unknown) {
    return firebaseFailure(error);
  }
}

export async function sendVerificationEmail(): Promise<AuthResult<void>> {
  const user = auth.currentUser;

  if (!user) {
    return {
      success: false,
      error: {
        code: "auth/no-current-user",
        message: "Doğrulama e-postası göndermek için giriş yapmalısınız.",
      },
    };
  }

  try {
    await sendEmailVerification(user);

    return { success: true, data: undefined };
  } catch (error: unknown) {
    return firebaseFailure(error);
  }
}

export function getCurrentAuthUser(): AuthUser | null {
  return auth.currentUser ? mapFirebaseUser(auth.currentUser) : null;
}
