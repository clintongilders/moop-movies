import { render, screen } from '@testing-library/react';
import App from './App';

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

test('opens Trending with movie results and keeps search hidden', async () => {
  global.fetch = jest.fn(url => Promise.resolve({ ok: true, json: async () => url === '/api/auth/me'
    ? { account: null, csrf: 'test-csrf' }
    : { results: [{ id: 42, title: 'Example movie' }], total_pages: 1 } }));
  render(<App />);
  expect(screen.getByText('Trending Today')).toBeInTheDocument();
  expect(await screen.findByRole('link', { name: 'View details for Example movie' })).toHaveAttribute('href', '/movie/42');
  expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/account');
  expect(screen.queryByRole('link', { name: 'Search' })).toBeNull();
});
