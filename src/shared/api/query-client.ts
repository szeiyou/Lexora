import { QueryClient } from "@tanstack/react-query";

const protectedQueryKeyRoots = new Set([
  "entry",
  "history",
  "recent-searches",
  "wordbooks",
  "wordbooks-select",
  "wordbook-words",
]);

export const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function clearProtectedQueryCache() {
  appQueryClient.removeQueries({
    predicate: (query) => {
      const [root] = query.queryKey;
      return typeof root === "string" && protectedQueryKeyRoots.has(root);
    },
  });
}

export function createQueryClient() {
  // Compatibility alias for older callers; this returns the shared singleton client.
  return appQueryClient;
}
