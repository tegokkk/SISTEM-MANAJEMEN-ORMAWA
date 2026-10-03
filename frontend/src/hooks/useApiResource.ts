"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";

interface ResourceState<T, TMeta> {
  requestKey: string | null;
  data: T | null;
  meta?: TMeta;
  error: string | null;
}

export function useApiResource<T, TMeta = unknown>(endpoint: string | null) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<ResourceState<T, TMeta>>({
    requestKey: null,
    data: null,
    error: null,
  });
  const requestKey = endpoint ? `${endpoint}::${version}` : null;

  useEffect(() => {
    if (!endpoint || !requestKey) return;
    let active = true;

    apiClient
      .getEnvelope<T, TMeta>(endpoint)
      .then((response) => {
        if (active) {
          setState({ requestKey, data: response.data, meta: response.meta, error: null });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          const message = error instanceof ApiClientError ? error.message : "Data gagal dimuat";
          setState({ requestKey, data: null, error: message });
        }
      });

    return () => {
      active = false;
    };
  }, [endpoint, requestKey]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return useMemo(
    () => ({
      data: state.requestKey === requestKey ? state.data : null,
      meta: state.requestKey === requestKey ? state.meta : undefined,
      error: state.requestKey === requestKey ? state.error : null,
      isLoading: Boolean(requestKey && state.requestKey !== requestKey),
      reload,
    }),
    [requestKey, state, reload],
  );
}
