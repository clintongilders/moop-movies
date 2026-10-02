import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { render } from "../test/render";
import { MemoryRouter } from "react-router-dom";
import AccountActions from "./AccountActions";
import { useAuth } from "./AuthContext";
vi.mock("./AuthContext", () => ({ useAuth: vi.fn() }));
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});
test("signed-out users get a connect link", () => {
  useAuth.mockReturnValue({ account: null, loading: false });
  render(
    <MemoryRouter>
      <AccountActions mediaType="movie" id="42" />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("link", { name: "Sign in with TMDB" }),
  ).toHaveAttribute("href", "/account");
});
test("saved state controls add/remove actions and failures do not change state", async () => {
  const mutate = vi
    .fn()
    .mockResolvedValueOnce({ success: true })
    .mockRejectedValueOnce(new Error("Try again later"));
  useAuth.mockReturnValue({ account: { id: 7 }, loading: false, mutate });
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ watchlist: false, favorite: true }),
  });
  render(
    <MemoryRouter>
      <AccountActions mediaType="tv" id="42" />
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Add to watchlist" }),
    ).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Add to watchlist" }));
  await screen.findByRole("button", { name: "Remove from watchlist" });
  expect(mutate).toHaveBeenCalledWith("/api/account/watchlist", {
    media_type: "tv",
    media_id: 42,
    enabled: true,
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Remove from favourites" }),
  );
  await screen.findByRole("alert");
  expect(
    screen.getByRole("button", { name: "Remove from favourites" }),
  ).toBeTruthy();
});
