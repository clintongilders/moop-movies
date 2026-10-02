import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { render } from "../test/render";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import Movies from "./Movies";
import TV from "./TV";
import SingleMovie from "./SingleMovie";

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});
function BrowserBack() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Browser back</button>;
}

test.each([
  ["movie", "/movies", Movies, "Back to movies"],
  ["tv", "/tv", TV, "Back to TV shows"],
])(
  "%s genre selection survives detail navigation and clearing",
  async (type, path, Listing, backLabel) => {
    global.fetch = vi.fn((url) =>
      Promise.resolve({
        ok: true,
        json: async () => {
          if (url.includes("/genre/"))
            return {
              genres: [
                { id: 28, name: "Action" },
                { id: 35, name: "Comedy" },
              ],
            };
          if (url.startsWith(`/api${path}?`))
            return { results: [{ id: 42, title: "Example" }], total_pages: 1 };
          return { title: "Example", results: {} };
        },
      }),
    );
    render(
      <MemoryRouter initialEntries={[path]}>
        <BrowserBack />
        <Routes>
          <Route path={path} element={<Listing />} />
          <Route
            path={`/${type}/:id`}
            element={<SingleMovie mediaType={type} />}
          />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Action" }));
    fireEvent.click(screen.getByRole("button", { name: "Comedy" }));
    fireEvent.click(
      await screen.findByRole("link", { name: "View details for Example" }),
    );
    expect(screen.getByRole("link", { name: backLabel })).toHaveAttribute(
      "href",
      `${path}?genres=28%7C35`,
    );
    fireEvent.click(screen.getByRole("link", { name: backLabel }));
    expect(
      await screen.findByRole("button", { name: /Action/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Comedy/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(
      await screen.findByRole("link", { name: "View details for Example" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Browser back" }));
    expect(
      await screen.findByRole("button", { name: /Action/ }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Action" })).toHaveAttribute(
        "aria-pressed",
        "false",
      ),
    );
    expect(
      global.fetch.mock.calls.some(
        ([url]) => url === `/api${path}?with_genres=28%7C35&page=1`,
      ),
    ).toBe(true);
  },
);
