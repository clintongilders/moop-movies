import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Trending from "./Trending";

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

test('switches trending media in place and starts the new list at page one', async () => {
  global.fetch = jest.fn(url => Promise.resolve({ ok: true, json: async () => ({
    total_pages: 1,
    results: [url.includes('/tv/') ? { id: 2, name: 'Trending show' } : { id: 1, title: 'Trending movie' }],
  }) }));
  render(<MemoryRouter><Trending /></MemoryRouter>);
  await screen.findByText('Trending movie');
  fireEvent.click(screen.getByRole('button', { name: 'TV Shows' }));
  await screen.findByText('Trending show');
  expect(screen.queryByText('Trending movie')).toBeNull();
  expect(screen.getByRole('button', { name: 'TV Shows' })).toHaveAttribute('aria-pressed', 'true');
  expect(global.fetch.mock.calls[1][0]).toBe('/api/tmdb/trending/tv/day?page=1');
  fireEvent.click(screen.getByRole('button', { name: 'Movies' }));
  await screen.findByText('Trending movie');
  expect(screen.queryByText('Trending show')).toBeNull();
  expect(global.fetch.mock.calls[2][0]).toBe('/api/tmdb/trending/movie/day?page=1');
});
