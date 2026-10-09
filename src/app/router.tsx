import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { AppShell } from "@/app/layouts/app-shell";
import { HistoryScreen } from "@/modules/history/screens/history-screen";
import { WorkspaceScreen } from "@/modules/query/screens/workspace-screen";
import { SettingsScreen } from "@/modules/settings/screens/settings-screen";
import { TranslationsScreen } from "@/modules/translations/screens/translations-screen";
import { WordbooksScreen } from "@/modules/wordbooks/ui/wordbooks-screen";

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <WorkspaceScreen /> },
      { path: "translations", element: <TranslationsScreen /> },
      { path: "history", element: <HistoryScreen /> },
      { path: "wordbooks", element: <WordbooksScreen /> },
      { path: "settings", element: <SettingsScreen /> },
    ],
  },
];

export const router = createBrowserRouter(appRoutes);
