import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { fetch as expoFetch } from "expo/fetch";
import { createApiClient, type ApiClient } from "@baireporbo/shared";
import { API_BASE } from "./config";
import { getAnonKey } from "./anon-key";

/**
 * Builds the shared API client with a live Clerk `getToken` and Expo's
 * streaming-capable fetch, then exposes it via context. Recreated only when the
 * Clerk `getToken` identity changes (i.e. across sign-in state).
 */
const ApiContext = createContext<ApiClient | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();

  const client = useMemo(
    () =>
      createApiClient({
        baseUrl: API_BASE,
        // Clerk's session token → `Authorization: Bearer <token>` (the linchpin
        // that lets the native app hit the existing web endpoints).
        getToken: () => getToken(),
        getAnonKey,
        // expo/fetch supports reading a streaming response body (SSE chat).
        fetchImpl: expoFetch as unknown as typeof fetch,
      }),
    [getToken],
  );

  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiClient {
  const client = useContext(ApiContext);
  if (!client) throw new Error("useApi must be used within <ApiProvider>.");
  return client;
}
