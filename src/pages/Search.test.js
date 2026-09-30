import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Search from './Search';
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
test('search waits for submission, displays results, and clears the query', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ total_pages: 1, results: [{ id: 42, media_type: 'tv', name: 'Law & Order' }] }) });
  render(<MemoryRouter><Search /></MemoryRouter>);
  expect(global.fetch).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' Law & Order ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(await screen.findByRole('link', { name: 'View details for Law & Order' })).toHaveAttribute('href', '/tv/42');
  const url = new URL(global.fetch.mock.calls[0][0], 'http://localhost');
  expect(url.searchParams.get('query')).toBe('Law & Order');
  fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
  expect(screen.getByText('Enter a title to start searching.')).toBeTruthy();
  expect(screen.queryByRole('link')).toBeNull();
});
