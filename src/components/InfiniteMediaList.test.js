import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import InfiniteMediaList from "./InfiniteMediaList";
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
const page = (results, total_pages = 3) => ({ ok: true, json: async () => ({ results, total_pages }) });

test('continues after empty filtered pages, appends and deduplicates titles, then stops', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce(page([]))
    .mockResolvedValueOnce(page([{ id: 1, title: 'First' }]))
    .mockResolvedValueOnce(page([{ id: 1, title: 'First' }, { id: 2, title: 'Second' }]));
  render(<MemoryRouter><InfiniteMediaList endpoint="/api/movies" mediaType="movie" /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Load more' }));
  await screen.findByText('First');
  fireEvent.click(await screen.findByRole('button', { name: 'Load more' }));
  await screen.findByText('Second');
  expect(screen.getAllByText('First')).toHaveLength(1);
  expect(screen.getByText("You've reached the end.")).toBeTruthy();
  expect(global.fetch.mock.calls.map(call => call[0])).toEqual(['/api/movies?page=1', '/api/movies?page=2', '/api/movies?page=3']);
});

test('retries the same page after failure and resets when filters change', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce(page([{ id: 1, title: 'Old title' }]))
    .mockResolvedValueOnce(page([{ id: 2, title: 'New title' }], 1));
  const view = render(<MemoryRouter><InfiniteMediaList key="old" endpoint="/api/movies" mediaType="movie" /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  await screen.findByText('Old title');
  expect(global.fetch.mock.calls[1][0]).toBe('/api/movies?page=1');
  view.rerender(<MemoryRouter><InfiniteMediaList key="new" endpoint="/api/movies?with_genres=18" mediaType="movie" /></MemoryRouter>);
  await screen.findByText('New title');
  expect(screen.queryByText('Old title')).toBeNull();
  await waitFor(() => expect(global.fetch.mock.calls[2][0]).toBe('/api/movies?with_genres=18&page=1'));
});
