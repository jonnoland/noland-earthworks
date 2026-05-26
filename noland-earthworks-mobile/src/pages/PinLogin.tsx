import { useCallback, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useBiometric } from "@/hooks/useBiometric";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

// ── Biometry icon SVGs ────────────────────────────────────────────────────────

function FaceIdIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7V5a2 2 0 0 1 2-2h2" />
      <path d="M22 7V5a2 2 0 0 0-2-2h-2" />
      <path d="M2 17v2a2 2 0 0 0 2 2h2" />
      <path d="M22 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
      <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
      <path d="M12 7v3" />
    </svg>
  );
}

function FingerprintIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M2 12a10 10 0 0 1 18-6" />
      <path d="M2 17c1 .5 2.5 1.5 4 2" />
      <path d="M22 12c0 .34-.01.67-.03 1" />
      <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
      <path d="M17.44 9.12A6 6 0 0 1 18 12c0 .7-.08 1.37-.18 2" />
    </svg>
  );
}

function BiometryIcon({ label }: { label: string }) {
  if (label === "Face ID" || label === "Face Authentication") return <FaceIdIcon />;
  return <FingerprintIcon />;
}

// ── Keypad button ─────────────────────────────────────────────────────────────

function KeypadButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const [pressed, setPressed] = useState(false);

  if (label === "") {
    return <div style={{ height: 72 }} />;
  }

  const bg = pressed ? "oklch(0.28 0 0)" : "oklch(0.20 0 0)";

  return (
    <button
      onClick={onPress}
      disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        height: 72,
        borderRadius: 16,
        border: "none",
        backgroundColor: bg,
        color: "oklch(0.94 0.01 80)",
        fontSize: label === "⌫" ? 22 : 26,
        fontWeight: 500,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        WebkitTapHighlightColor: "transparent",
        transition: "background-color 0.1s ease",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PinLogin() {
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const { setToken } = useAuth();

  const handleAuthSuccess = useCallback(() => {
    // Biometric auth succeeded — we still need a server token.
    // Re-use the verifyPin mutation with an empty pin sentinel that the server
    // recognises as a biometric bypass. The server checks the FIELD_APP_PIN
    // only when pin is non-empty; when pin is "__biometric__" it trusts the
    // client-side biometric result and issues the token.
    verifyMutation.mutate({ pin: "__biometric__" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    isAvailable: biometryAvailable,
    isEnrolled: biometryEnrolled,
    biometryLabel,
    status: biometryStatus,
    error: biometryError,
    promptBiometric,
  } = useBiometric(handleAuthSuccess);

  const verifyMutation = trpc.fieldQuote.verifyPin.useMutation({
    onSuccess: (data) => {
      setToken(data.token);
    },
    onError: (err) => {
      setPinError(err.message || "Incorrect PIN.");
      setPin("");
    },
  });

  function handleKey(key: string) {
    if (key === "⌫") {
      setPin((p) => p.slice(0, -1));
      setPinError("");
      return;
    }
    if (pin.length >= 4) return;

    const next = pin + key;
    setPin(next);
    setPinError("");

    if (next.length === 4) {
      verifyMutation.mutate({ pin: next });
    }
  }

  const dots = Array.from({ length: 4 }, (_, i) => i < pin.length);
  const isPending = verifyMutation.isPending || biometryStatus === "prompting";
  const showBiometryButton = biometryAvailable && biometryEnrolled;
  const displayError = pinError || biometryError || "";

  // Subtitle changes based on biometry state
  let subtitle = "Enter your PIN to continue";
  if (biometryStatus === "prompting") subtitle = `Waiting for ${biometryLabel}...`;
  else if (biometryStatus === "checking") subtitle = "Checking biometry...";
  else if (showBiometryButton) subtitle = `Use ${biometryLabel} or enter your PIN`;

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "oklch(0.13 0 0)",
        padding: "0 32px",
        gap: 0,
      }}
    >
      {/* Logo / App name */}
      <div style={{ marginBottom: 40, textAlign: "center" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            backgroundColor: "oklch(0.65 0.18 50)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="oklch(0.13 0 0)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <p style={{ color: "oklch(0.94 0.01 80)", fontSize: 22, fontWeight: 700, margin: 0 }}>Noland Field</p>
        <p style={{ color: "oklch(0.55 0.01 80)", fontSize: 14, margin: "6px 0 0" }}>{subtitle}</p>
      </div>

      {/* Biometric prompt button — shown when enrolled and available */}
      {showBiometryButton && (
        <button
          onClick={promptBiometric}
          disabled={isPending}
          style={{
            marginBottom: 32,
            width: 64,
            height: 64,
            borderRadius: "50%",
            border: "2px solid oklch(0.65 0.18 50)",
            backgroundColor: "transparent",
            color: "oklch(0.65 0.18 50)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            WebkitTapHighlightColor: "transparent",
            opacity: isPending ? 0.4 : 1,
            transition: "opacity 0.15s ease",
          }}
          aria-label={`Log in with ${biometryLabel}`}
        >
          <BiometryIcon label={biometryLabel} />
        </button>
      )}

      {/* PIN dots */}
      <div style={{ display: "flex", gap: 20, marginBottom: 32 }}>
        {dots.map((filled, i) => (
          <div
            key={i}
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              backgroundColor: filled ? "oklch(0.65 0.18 50)" : "oklch(0.25 0 0)",
              border: `2px solid ${filled ? "oklch(0.65 0.18 50)" : "oklch(0.35 0 0)"}`,
              transition: "background-color 0.12s ease",
            }}
          />
        ))}
      </div>

      {/* Status / error message */}
      <div style={{ height: 20, marginBottom: 20 }}>
        {displayError && (
          <p style={{ color: "oklch(0.65 0.20 25)", fontSize: 14, margin: 0, textAlign: "center" }}>
            {displayError}
          </p>
        )}
        {isPending && !displayError && (
          <p style={{ color: "oklch(0.55 0.01 80)", fontSize: 14, margin: 0, textAlign: "center" }}>
            Verifying...
          </p>
        )}
      </div>

      {/* Keypad */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
          width: "100%",
          maxWidth: 280,
        }}
      >
        {KEYS.map((key, i) => (
          <KeypadButton
            key={i}
            label={key}
            onPress={() => handleKey(key)}
            disabled={isPending}
          />
        ))}
      </div>

      {/* Biometric opt-in prompt for first-time users */}
      {biometryAvailable && !biometryEnrolled && (
        <p style={{ color: "oklch(0.45 0.01 80)", fontSize: 13, marginTop: 28, textAlign: "center" }}>
          Enable {biometryLabel} in Settings after logging in.
        </p>
      )}

      <p style={{ color: "oklch(0.35 0 0)", fontSize: 12, marginTop: 28, textAlign: "center" }}>
        Noland Earthworks, LLC — Field Operations
      </p>
    </div>
  );
}
