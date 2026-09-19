"use server";

import { headers } from "next/headers";
import { auth } from "@/infrastructure/auth/auth";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";

export interface ChangePasswordFormState {
  error: string | null;
  success: boolean;
}

export async function changePasswordAction(
  _prevState: ChangePasswordFormState,
  formData: FormData,
): Promise<ChangePasswordFormState> {
  const userId = await getSessionUserId();
  if (!userId) {
    return {
      error: "Tu sesión expiró. Volvé a iniciar sesión.",
      success: false,
    };
  }

  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword !== confirmPassword) {
    return { error: "Las contraseñas no coinciden.", success: false };
  }

  if (newPassword.length < 8) {
    return {
      error: "La contraseña debe tener al menos 8 caracteres.",
      success: false,
    };
  }

  try {
    const ctx = await auth.$context;
    const hashedPassword = await ctx.password.hash(newPassword);
    await ctx.internalAdapter.updatePassword(userId, hashedPassword);
    return { error: null, success: true };
  } catch {
    return { error: "No se pudo cambiar la contraseña.", success: false };
  }
}

export interface ChangeEmailFormState {
  error: string | null;
  success: boolean;
}

export async function changeEmailAction(
  _prevState: ChangeEmailFormState,
  formData: FormData,
): Promise<ChangeEmailFormState> {
  const userId = await getSessionUserId();
  if (!userId) {
    return {
      error: "Tu sesión expiró. Volvé a iniciar sesión.",
      success: false,
    };
  }

  const newEmail = String(formData.get("newEmail") ?? "");
  const confirmEmail = String(formData.get("confirmEmail") ?? "");
  const currentEmail = String(formData.get("currentEmail") ?? "");

  if (newEmail !== confirmEmail) {
    return { error: "Los emails no coinciden.", success: false };
  }

  if (newEmail === currentEmail) {
    return {
      error: "El nuevo email es igual al actual.",
      success: false,
    };
  }

  try {
    await auth.api.changeEmail({
      body: { newEmail, callbackURL: "/configuracion" },
      headers: await headers(),
    });
    return { error: null, success: true };
  } catch {
    return {
      error: "No se pudo cambiar el email. Verificá que no esté en uso.",
      success: false,
    };
  }
}
