import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { render } from "../test/render";
import TrailerButton from "./TrailerButton";

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

test.each(["movie", "tv"])(
  "%s trailer opens on demand, prefers official trailers and stops on close",
  async (mediaType) => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { site: "YouTube", type: "Trailer", key: "abcdefghijk" },
          {
            site: "YouTube",
            type: "Trailer",
            key: "ABCDEFGHIJK",
            official: true,
          },
        ],
      }),
    });
    render(<TrailerButton mediaType={mediaType} id={42} title="Example" />);
    expect(global.fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Play trailer/ }));
    const frame = await screen.findByTitle("Example trailer");
    expect(frame).toHaveAttribute(
      "referrerpolicy",
      "strict-origin-when-cross-origin",
    );
    expect(frame).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/ABCDEFGHIJK?autoplay=1",
    );
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/tmdb/${mediaType}/42/videos`,
      expect.anything(),
    );
    expect(screen.getByRole("dialog")).toHaveAccessibleName(
      "Example — Trailer",
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() =>
      expect(screen.queryByTitle("Example trailer")).toBeNull(),
    );
  },
);

test("a failed trailer request can be retried and missing trailers are explained", async () => {
  global.fetch = vi
    .fn()
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });
  render(<TrailerButton mediaType="movie" id={42} title="Example" />);
  fireEvent.click(screen.getByRole("button", { name: /Play trailer/ }));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(
    await screen.findByText("No trailer is available for this title."),
  ).toBeInTheDocument();
});
