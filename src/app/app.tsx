import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef, useState } from "react";
import { AppProviders } from "@/app/providers/app-providers";
import { router } from "@/app/router";
import {
  type RememberedCloseBehavior,
  resolveCloseBehavior,
} from "@/modules/desktop-shell/model/close-behavior";
import { CloseBehaviorDialog } from "@/modules/desktop-shell/ui/close-behavior-dialog";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import { useSettingsStore } from "@/modules/settings/model/settings.store";
import "@/shared/styles/tokens.css";

function CloseBehaviorController() {
  const isHydrated = useSettingsStore((state) => state.isHydrated);
  const closeBehavior = useSettingsStore((state) => state.values.closeBehavior);
  const persistCloseBehavior = useSettingsStore((state) => state.persistCloseBehavior);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!isHydrated || !isTauri()) {
      return undefined;
    }

    let unlisten: (() => void) | undefined;

    void (async () => {
      unlisten = await getCurrentWindow().onCloseRequested(async (event) => {
        event.preventDefault();

        const resolved = resolveCloseBehavior(closeBehavior);
        if (resolved === "ask") {
          setDialogOpen(true);
          return;
        }

        if (resolved === "tray") {
          await invoke("hide_to_tray");
          return;
        }

        await invoke("exit_app");
      });
    })();

    return () => {
      unlisten?.();
    };
  }, [closeBehavior, isHydrated]);

  const handleChoose = async (value: RememberedCloseBehavior) => {
    await persistCloseBehavior(value);
    setDialogOpen(false);

    if (value === "tray") {
      await invoke("hide_to_tray");
      return;
    }

    await invoke("exit_app");
  };

  return dialogOpen ? <CloseBehaviorDialog onChoose={handleChoose} /> : null;
}

function StartupAuthBootstrap() {
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  const isSettingsHydrated = useSettingsStore((state) => state.isHydrated);
  const { baseUrl, requestTimeoutMs } = useSettingsStore((state) => state.values);

  const authStatus = useAuthStore((state) => state.status);
  const restoreSession = useAuthStore((state) => state.restoreSession);

  const hasBootstrappedRef = useRef(false);

  useEffect(() => {
    void hydrateSettings();
  }, [hydrateSettings]);

  useEffect(() => {
    if (hasBootstrappedRef.current) {
      return;
    }

    if (!isSettingsHydrated) {
      return;
    }

    // Startup bootstrap: only attempt once after hydrating settings.
    hasBootstrappedRef.current = true;

    if (!baseUrl) {
      return;
    }

    if (authStatus !== "anonymous") {
      return;
    }

    void restoreSession({ baseUrl, requestTimeoutMs });
  }, [authStatus, baseUrl, isSettingsHydrated, requestTimeoutMs, restoreSession]);

  return null;
}

export default function App() {
  return (
    <>
      <StartupAuthBootstrap />
      <CloseBehaviorController />
      <AppProviders router={router} />
    </>
  );
}
