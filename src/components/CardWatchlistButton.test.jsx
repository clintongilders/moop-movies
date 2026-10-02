import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { render } from "../test/render";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import MediaCard from "./MediaCard";
import { useAuth } from "./AuthContext";
vi.mock("./AuthContext", () => ({ useAuth: vi.fn() }));
const originalFetch = global.fetch;
beforeEach(() => {
  global.fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ ids: [] }) });
});
afterEach(() => {
  global.fetch = originalFetch;
});
test("card plus saves without opening details and confirms success", async () => {
  const mutate = vi.fn().mockResolvedValue({ success: true });
  useAuth.mockReturnValue({ account: { id: 7 }, loading: false, mutate });
  render(
    <MemoryRouter>
      <MediaCard item={{ id: 42, title: "Example" }} mediaType="movie" />
    </MemoryRouter>,
  );
  const button = await screen.findByRole("button", {
    name: "Add Example to watchlist",
  });
  expect(button.closest("a")).toBeNull();
  fireEvent.click(button);
  await screen.findByRole("status");
  expect(mutate).toHaveBeenCalledWith("/api/account/watchlist", {
    media_type: "movie",
    media_id: 42,
    enabled: true,
  });
  expect(
    screen.getByRole("button", { name: "Example added to watchlist" }),
  ).toBeDisabled();
});
test("signed out users go to account", () => {
  useAuth.mockReturnValue({ account: null, loading: false });
  render(
    <MemoryRouter>
      <Routes>
        <Route
          path="/"
          element={<MediaCard item={{ id: 42, name: "Show" }} mediaType="tv" />}
        />
        <Route path="/account" element={<p>Connect account</p>} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Sign in to add Show to watchlist" }),
  );
  expect(screen.getByText("Connect account")).toBeTruthy();
  expect(global.fetch).not.toHaveBeenCalled();
});

test.each(["movie", "tv"])(
  "previously saved %s cards show a green check on load",
  async (mediaType) => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ids: [42] }),
    });
    const mutate = vi.fn();
    useAuth.mockReturnValue({ account: { id: 7 }, loading: false, mutate });
    render(
      <MemoryRouter>
        <MediaCard
          item={{ id: 42, title: "Saved title" }}
          mediaType={mediaType}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("button", {
        name: "Loading watchlist status for Saved title",
      }),
    ).toBeDisabled();
    const button = await screen.findByRole("button", {
      name: "Saved title added to watchlist",
    });
    expect(button).toHaveClass("is-saved");
    expect(button).toHaveTextContent("✓");
    expect(button).toBeDisabled();
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/account/watchlist-ids/${mediaType}`,
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(mutate).not.toHaveBeenCalled();
  },
);

test("failed status checks can be retried without adding the title", async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ ids: [42] }) });
  const mutate = vi.fn();
  useAuth.mockReturnValue({ account: { id: 7 }, loading: false, mutate });
  render(
    <MemoryRouter>
      <MediaCard item={{ id: 42, title: "Example" }} mediaType="movie" />
    </MemoryRouter>,
  );
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Retry watchlist status for Example",
    }),
  );
  expect(
    await screen.findByRole("button", { name: "Example added to watchlist" }),
  ).toHaveClass("is-saved");
  expect(mutate).not.toHaveBeenCalled();
});

test("a page of cards shares one watchlist request", async () => {
  useAuth.mockReturnValue({
    account: { id: 7 },
    loading: false,
    mutate: vi.fn(),
  });
  render(
    <MemoryRouter>
      {Array.from({ length: 20 }, (_, index) => (
        <MediaCard
          key={index}
          item={{ id: index + 1, title: `Title ${index}` }}
          mediaType="movie"
        />
      ))}
    </MemoryRouter>,
  );
  await screen.findByRole("button", { name: "Add Title 19 to watchlist" });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch.mock.calls[0][0]).toBe(
    "/api/account/watchlist-ids/movie",
  );
});
