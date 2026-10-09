import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import { useSettingsStore } from "@/modules/settings/model/settings.store";

const SILENT_VERIFICATION_COOLDOWN_MS = 30_000;

function isProtectedPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/translations") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/wordbooks")
  );
}

type LatestGuardState = {
  pathname: string;
  authStatus: ReturnType<typeof useAuthStore.getState>["status"];
  baseUrl: string;
  requestTimeoutMs: number;
  silentlyVerifySession: ReturnType<typeof useAuthStore.getState>["silentlyVerifySession"];
  navigate: ReturnType<typeof useNavigate>;
};

export function SilentSessionGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { baseUrl, requestTimeoutMs } = useSettingsStore((state) => state.values);
  const authStatus = useAuthStore((state) => state.status);
  const silentlyVerifySession = useAuthStore((state) => state.silentlyVerifySession);

  const lastVerificationAtRef = useRef<number | null>(null);
  const verificationInFlightRef = useRef<Promise<unknown> | null>(null);
  const latestGuardStateRef = useRef<LatestGuardState>({
    pathname: location.pathname,
    authStatus,
    baseUrl,
    requestTimeoutMs,
    silentlyVerifySession,
    navigate,
  });

  latestGuardStateRef.current = {
    pathname: location.pathname,
    authStatus,
    baseUrl,
    requestTimeoutMs,
    silentlyVerifySession,
    navigate,
  };

  const triggerSilentVerification = (respectCooldown = true) => {
    const state = latestGuardStateRef.current;

    if (
      state.authStatus !== "authenticated" ||
      !state.baseUrl ||
      !isProtectedPath(state.pathname)
    ) {
      return null;
    }

    if (verificationInFlightRef.current) {
      return verificationInFlightRef.current;
    }

    const now = Date.now();
    if (
      respectCooldown &&
      lastVerificationAtRef.current !== null &&
      now - lastVerificationAtRef.current < SILENT_VERIFICATION_COOLDOWN_MS
    ) {
      return null;
    }

    lastVerificationAtRef.current = now;

    const verificationPromise = state
      .silentlyVerifySession({
        baseUrl: state.baseUrl,
        requestTimeoutMs: state.requestTimeoutMs,
      })
      .then((user) => {
        if (!user && isProtectedPath(latestGuardStateRef.current.pathname)) {
          latestGuardStateRef.current.navigate("/settings", { replace: true });
        }

        return user;
      })
      .finally(() => {
        verificationInFlightRef.current = null;
      });

    verificationInFlightRef.current = verificationPromise;
    return verificationPromise;
  };

  useEffect(() => {
    if (!isProtectedPath(location.pathname)) {
      return;
    }

    void triggerSilentVerification(false);
  }, [location.pathname]);

  useEffect(() => {
    if (authStatus === "authenticated" && baseUrl) {
      return;
    }

    lastVerificationAtRef.current = null;
    verificationInFlightRef.current = null;
  }, [authStatus, baseUrl]);

  useEffect(() => {
    const handleWindowFocus = () => {
      void triggerSilentVerification();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void triggerSilentVerification();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
