"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { finishAuthFromUrl, getAuthState } from "@/lib/playerIdentity";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (finishedRef.current) return;

    async function finish() {
      const exchange = await finishAuthFromUrl();
      if (exchange.ok === false) {
        setError(exchange.error ?? "Sign-in failed");
        return;
      }

      const auth = await getAuthState();
      if (auth.kind !== "logged_in") {
        setError("No session after sign-in. Check Google OAuth + Supabase redirect URLs.");
        return;
      }

      finishedRef.current = true;
      router.replace("/");
    }

    finish();
  }, [router]);

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "system-ui, sans-serif",
          color: "#252a37",
          background: "#fff6ee",
        }}
      >
        <p>Sign-in failed: {error}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        color: "#252a37",
        background:
          "radial-gradient(120% 120% at 50% 0%, rgba(252, 181, 127, 0.35) 0%, rgba(37, 42, 55, 0.72) 60%)",
      }}
    >
      Signing you in…
    </div>
  );
}
