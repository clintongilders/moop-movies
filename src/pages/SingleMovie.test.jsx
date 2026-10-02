import React from "react";
import { screen } from "@testing-library/react";
import { render } from "../test/render";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SingleMovie from "./SingleMovie";
import MediaCard from "../components/MediaCard";

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

test.each([
  ["movie", "Example Movie"],
  ["tv", "Example Show"],
])("cards link to the correct %s detail route", (type, title) => {
  render(
    <MemoryRouter>
      <MediaCard mediaType={type} item={{ id: 42, name: title }} />
    </MemoryRouter>,
  );
  expect(screen.getByRole("link").getAttribute("href")).toBe(`/${type}/42`);
});

test("TV detail route loads the show overview and season information", async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      name: "Example Show",
      overview: "Full show description.",
      number_of_seasons: 3,
      number_of_episodes: 24,
    }),
  });
  render(
    <MemoryRouter initialEntries={["/tv/42"]}>
      <Routes>
        <Route path="/tv/:id" element={<SingleMovie mediaType="tv" />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByRole("status").textContent).toBe("Loading details...");
  await screen.findByText("Full show description.");
  expect(global.fetch.mock.calls[0][0]).toBe("/api/tmdb/tv/42");
  expect(screen.getByText("Seasons")).toBeTruthy();
  expect(screen.queryByText("Runtime")).toBeNull();
});

test("failed detail requests display a readable error", async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false });
  render(
    <MemoryRouter initialEntries={["/movie/42"]}>
      <Routes>
        <Route path="/movie/:id" element={<SingleMovie mediaType="movie" />} />
      </Routes>
    </MemoryRouter>,
  );
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Unable to load details",
  );
});

test.each(["movie", "tv"])(
  "returns %s details to Trending when opened there",
  async (mediaType) => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: `/${mediaType}/42`, state: { from: "/" } },
        ]}
      >
        <Routes>
          <Route
            path={`/${mediaType}/:id`}
            element={<SingleMovie mediaType={mediaType} />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: "Back to Trending" }),
    ).toHaveAttribute("href", "/");
    await screen.findByRole("alert");
  },
);
