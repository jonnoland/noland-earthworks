/**
 * useBiometric — hook for biometric authentication in the Noland Field app.
 *
 * Flow:
 *  1. On mount, call checkBiometry() to determine what is available.
 *  2. If biometry is available AND the user has previously enrolled
 *     (preference stored in Capacitor Preferences), auto-prompt on load.
 *  3. Expose promptBiometric() for manual trigger (e.g. "Use Face ID" button).
 *  4. Expose setEnrolled() to let the user opt in/out from the Profile page.
 *
 * The hook does NOT manage the app token — that stays in useAuth.ts.
 * On success it calls the onSuccess callback so the caller can proceed.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
  BiometryType,
  type CheckBiometryResult,
} from "@aparajita/capacitor-biometric-auth";
import { Preferences } from "@capacitor/preferences";

const BIOMETRIC_ENROLLED_KEY = "noland_field_biometric_enrolled";

export type BiometricStatus =
  | "idle"
  | "checking"
  | "prompting"
  | "success"
  | "error"
  | "unavailable"
  | "not_enrolled";

export interface UseBiometricReturn {
  /** Whether the device has usable biometry hardware and enrollment. */
  isAvailable: boolean;
  /** Whether the user has opted in to biometric login. */
  isEnrolled: boolean;
  /** Human-readable label for the available biometry type. */
  biometryLabel: string;
  /** Current status of the biometric flow. */
  status: BiometricStatus;
  /** Last error message, if any. */
  error: string | null;
  /** Trigger the biometric prompt manually. */
  promptBiometric: () => Promise<void>;
  /** Save the user's opt-in preference. */
  setEnrolled: (enrolled: boolean) => Promise<void>;
}

function getBiometryLabel(result: CheckBiometryResult): string {
  if (!result.isAvailable) return "Biometrics";
  switch (result.biometryType) {
    case BiometryType.faceId:
      return "Face ID";
    case BiometryType.touchId:
      return "Touch ID";
    case BiometryType.faceAuthentication:
      return "Face Authentication";
    case BiometryType.fingerprintAuthentication:
      return "Fingerprint";
    case BiometryType.irisAuthentication:
      return "Iris Scan";
    default:
      return "Biometrics";
  }
}

export function useBiometric(onSuccess: () => void): UseBiometricReturn {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnrolled, setIsEnrolledState] = useState(false);
  const [biometryLabel, setBiometryLabel] = useState("Biometrics");
  const [status, setStatus] = useState<BiometricStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const hasAutoPrompted = useRef(false);

  // ── Check biometry availability and load enrollment preference ──────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [result, { value: enrolledVal }] = await Promise.all([
          BiometricAuth.checkBiometry(),
          Preferences.get({ key: BIOMETRIC_ENROLLED_KEY }),
        ]);

        if (cancelled) return;

        const available = result.isAvailable;
        const enrolled = enrolledVal === "true";

        setIsAvailable(available);
        setIsEnrolledState(enrolled);
        setBiometryLabel(getBiometryLabel(result));
        setStatus(available ? "idle" : "unavailable");
      } catch {
        if (!cancelled) setStatus("unavailable");
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // ── Auto-prompt when biometry is available and user is enrolled ─────────────
  useEffect(() => {
    if (
      status === "idle" &&
      isAvailable &&
      isEnrolled &&
      !hasAutoPrompted.current
    ) {
      hasAutoPrompted.current = true;
      // Small delay so the UI renders before the system prompt appears
      const timer = setTimeout(() => promptBiometric(), 400);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isAvailable, isEnrolled]);

  // ── Prompt handler ───────────────────────────────────────────────────────────
  const promptBiometric = useCallback(async () => {
    if (!isAvailable) return;
    setStatus("prompting");
    setError(null);

    try {
      await BiometricAuth.authenticate({
        reason: "Confirm your identity to access Noland Field",
        cancelTitle: "Use PIN instead",
        allowDeviceCredential: false,
        iosFallbackTitle: "Use PIN",
        androidTitle: "Noland Field",
        androidSubtitle: "Log in with biometrics",
        androidConfirmationRequired: false,
      });
      setStatus("success");
      onSuccess();
    } catch (err) {
      if (err instanceof BiometryError) {
        if (err.code === BiometryErrorType.userCancel) {
          // User tapped "Use PIN instead" — just go back to idle
          setStatus("idle");
        } else {
          setStatus("error");
          setError(err.message);
        }
      } else {
        setStatus("error");
        setError("Biometric authentication failed. Please use your PIN.");
      }
    }
  }, [isAvailable, onSuccess]);

  // ── Enrollment preference ────────────────────────────────────────────────────
  const setEnrolled = useCallback(async (enrolled: boolean) => {
    await Preferences.set({
      key: BIOMETRIC_ENROLLED_KEY,
      value: enrolled ? "true" : "false",
    });
    setIsEnrolledState(enrolled);
    // Reset auto-prompt guard so it fires again on next app open
    hasAutoPrompted.current = false;
  }, []);

  return {
    isAvailable,
    isEnrolled,
    biometryLabel,
    status,
    error,
    promptBiometric,
    setEnrolled,
  };
}
