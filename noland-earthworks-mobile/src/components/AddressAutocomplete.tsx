/**
 * AddressAutocomplete — Google Places-backed address input for the Noland Field
 * companion app. Calls fieldQuote.placesAutocomplete on the server (which uses
 * the Manus Maps proxy) so no API key is ever exposed to the client.
 *
 * Usage:
 *   <AddressAutocomplete
 *     value={form.address}
 *     onChange={(address) => setForm(f => ({ ...f, address }))}
 *     rightSlot={<GPSButton />}
 *   />
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, MapPin, X } from "lucide-react";

interface Prediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface Props {
  value: string;
  onChange: (address: string) => void;
  /** Optional element rendered on the right side of the input (e.g. GPS button) */
  rightSlot?: React.ReactNode;
  inputStyle?: React.CSSProperties;
  placeholder?: string;
}

// Simple debounce — avoids a lodash dependency
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function AddressAutocomplete({
  value,
  onChange,
  rightSlot,
  inputStyle,
  placeholder = "Street address or description",
}: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Stable session token per autocomplete session (resets on selection)
  const sessionRef = useRef(crypto.randomUUID());

  const debouncedQuery = useDebounce(query, 300);

  // Keep internal query in sync when parent resets the value (e.g. GPS fill)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Fetch predictions via tRPC whenever the debounced query changes
  const utils = trpc.useUtils();
  useEffect(() => {
    if (debouncedQuery.length < 3) {
      setPredictions([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    utils.client.fieldQuote.placesAutocomplete
      .query({ input: debouncedQuery, sessiontoken: sessionRef.current })
      .then((res) => {
        if (cancelled) return;
        setPredictions(res.predictions);
        setOpen(res.predictions.length > 0);
      })
      .catch(() => {
        if (!cancelled) setPredictions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const handleSelect = useCallback(
    (prediction: Prediction) => {
      const addr = prediction.description;
      setQuery(addr);
      onChange(addr);
      setPredictions([]);
      setOpen(false);
      // Reset session token after a selection (Google billing best practice)
      sessionRef.current = crypto.randomUUID();
    },
    [onChange]
  );

  const handleClear = () => {
    setQuery("");
    onChange("");
    setPredictions([]);
    setOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasRightContent = rightSlot || query.length > 0 || loading;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value); // keep parent in sync as user types
          }}
          onFocus={() => predictions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            ...inputStyle,
            paddingRight: hasRightContent ? 80 : 16,
          }}
        />

        {/* Right-side icons: loading spinner, clear button, then rightSlot (GPS) */}
        <div
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {loading && (
            <Loader2
              size={15}
              color="oklch(0.65 0.18 50)"
              style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}
            />
          )}
          {!loading && query.length > 0 && (
            <button
              onClick={handleClear}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 2,
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
              }}
              title="Clear address"
            >
              <X size={14} color="oklch(0.50 0.01 80)" />
            </button>
          )}
          {rightSlot}
        </div>
      </div>

      {/* Dropdown */}
      {open && predictions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 999,
            background: "oklch(0.18 0.01 80)",
            border: "1px solid oklch(0.28 0.01 80)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}
        >
          {predictions.map((p, i) => (
            <button
              key={p.place_id}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur before click registers
                handleSelect(p);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "10px 14px",
                borderBottom:
                  i < predictions.length - 1
                    ? "1px solid oklch(0.25 0.01 80)"
                    : "none",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "oklch(0.23 0.01 80)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "none")
              }
            >
              <MapPin
                size={14}
                color="oklch(0.65 0.18 50)"
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <div>
                {p.structured_formatting ? (
                  <>
                    <div
                      style={{
                        fontSize: 13,
                        color: "oklch(0.92 0.01 80)",
                        fontWeight: 500,
                        lineHeight: 1.3,
                      }}
                    >
                      {p.structured_formatting.main_text}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "oklch(0.55 0.01 80)",
                        marginTop: 1,
                      }}
                    >
                      {p.structured_formatting.secondary_text}
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      fontSize: 13,
                      color: "oklch(0.92 0.01 80)",
                      lineHeight: 1.4,
                    }}
                  >
                    {p.description}
                  </div>
                )}
              </div>
            </button>
          ))}
          <div
            style={{
              padding: "6px 14px",
              fontSize: 10,
              color: "oklch(0.40 0.01 80)",
              textAlign: "right",
            }}
          >
            Powered by Google
          </div>
        </div>
      )}
    </div>
  );
}
