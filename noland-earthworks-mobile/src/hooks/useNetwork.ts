/**
 * useNetwork — Tracks network connectivity using @capacitor/network.
 *
 * Returns { isOnline, connectionType } and updates reactively when the
 * device connectivity changes. Falls back to navigator.onLine on web.
 */
import { useState, useEffect } from "react";
import { Network } from "@capacitor/network";

interface NetworkState {
  isOnline: boolean;
  connectionType: string;
}

export function useNetwork(): NetworkState {
  const [state, setState] = useState<NetworkState>({
    isOnline: true,
    connectionType: "unknown",
  });

  useEffect(() => {
    let cancelled = false;

    // Get initial status
    Network.getStatus().then((status) => {
      if (!cancelled) {
        setState({
          isOnline: status.connected,
          connectionType: status.connectionType,
        });
      }
    }).catch(() => {
      // Fallback: use browser API
      if (!cancelled) {
        setState({ isOnline: navigator.onLine, connectionType: "unknown" });
      }
    });

    // Listen for changes
    const listenerPromise = Network.addListener("networkStatusChange", (status) => {
      if (!cancelled) {
        setState({
          isOnline: status.connected,
          connectionType: status.connectionType,
        });
      }
    });

    return () => {
      cancelled = true;
      listenerPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, []);

  return state;
}
