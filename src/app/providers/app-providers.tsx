import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { RouterProvider, type RouterProviderProps } from "react-router-dom";
import { appQueryClient } from "@/shared/api/query-client";

type AppProvidersProps = {
  children?: ReactNode;
  router?: RouterProviderProps["router"];
};

export function AppProviders({ children, router }: AppProvidersProps) {
  return (
    <QueryClientProvider client={appQueryClient}>
      {router ? <RouterProvider router={router} /> : children}
    </QueryClientProvider>
  );
}
