import React from "react";
import { render as rtlRender } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
export function render(ui, options) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return rtlRender(ui, { ...options, wrapper: Wrapper });
}
