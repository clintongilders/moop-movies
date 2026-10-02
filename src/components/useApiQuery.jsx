import { useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useQuery } from "@tanstack/react-query";
export async function apiGet(url, signal, message) {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const error = new Error(
      response.status === 404 ? "Title not found." : message,
    );
    error.status = response.status;
    throw error;
  }
  return response.json();
}
export default function useApiQuery(url, message, options = {}) {
  const { refresh } = useAuth();
  const query = useQuery({
    queryKey: ["api", url],
    queryFn: ({ signal }) => apiGet(url, signal, message),
    staleTime: 60000,
    ...options,
  });
  useEffect(() => {
    if (query.error?.status === 401) refresh?.();
  }, [query.error, refresh]);
  return query;
}
