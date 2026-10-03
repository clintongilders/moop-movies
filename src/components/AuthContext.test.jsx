import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { render } from "../test/render";
import { AuthProvider, useAuth } from "./AuthContext";
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});
function Probe() {
  const { mutate, loading } = useAuth();
  const [message, setMessage] = React.useState("");
  return (
    <>
      <button
        disabled={loading}
        onClick={() =>
          mutate("/api/account/watchlist").catch((error) =>
            setMessage(error.message),
          )
        }
      >
        Save
      </button>
      <p role="alert">{message}</p>
    </>
  );
}
test("a non-JSON error response becomes a readable message", async () => {
  global.fetch = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ account: null, csrf: "token" }),
    })
    .mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await screen.findByRole("button", { name: "Save" });
  await vi.waitFor(() =>
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByText("Account request failed.")).toBeTruthy();
});
