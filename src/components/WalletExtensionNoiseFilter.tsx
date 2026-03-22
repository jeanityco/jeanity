"use client";

import { useEffect } from "react";

/**
 * MetaMask (and similar wallets) inject into all pages. Sometimes they surface
 * "Failed to connect to MetaMask" as an unhandled rejection on sites that never
 * call `window.ethereum` — which trips the Next.js dev overlay. This filter
 * only suppresses those known extension-only rejections.
 */
export function WalletExtensionNoiseFilter() {
  useEffect(() => {
    const extensionHint =
      /metamask|nkbihfbeogaeaoehlefnkodbefgpgknn|failed to connect to metamask/i;

    const describe = (reason: unknown): { text: string; stack: string } => {
      if (reason == null) return { text: "", stack: "" };
      if (typeof reason === "string") return { text: reason, stack: "" };
      if (reason instanceof Error) {
        return { text: reason.message ?? "", stack: reason.stack ?? "" };
      }
      if (typeof reason === "object" && "message" in reason) {
        const m = (reason as { message?: unknown }).message;
        return { text: String(m ?? ""), stack: "" };
      }
      try {
        return { text: String(reason), stack: "" };
      } catch {
        return { text: "", stack: "" };
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const { text, stack } = describe(event.reason);
      const combined = `${text} ${stack}`;
      if (extensionHint.test(combined)) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", onUnhandledRejection);
  }, []);

  return null;
}
