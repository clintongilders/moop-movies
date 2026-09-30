import React from "react";
import { render, screen } from "@testing-library/react";
import ProviderDetails from "./ProviderDetails";

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

test.each(['movie', 'tv'])('loads Canadian providers for %s', async mediaType => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ results: {
    CA: { flatrate: [{ provider_id: 8, provider_name: 'Netflix' }], rent: [{ provider_id: 2, provider_name: 'Apple TV' }], link: 'https://www.themoviedb.org/movie/42/watch?locale=CA' },
    US: { flatrate: [{ provider_id: 9, provider_name: 'US only' }] },
  } }) });
  render(<ProviderDetails movieId="42" mediaType={mediaType} />);
  expect(screen.getByRole('status')).toBeTruthy();
  await screen.findByRole('link', { name: 'Open Netflix' });
  expect(screen.queryByText('Apple TV')).toBeNull();
  expect(screen.getByRole('link', { name: 'Open Netflix' })).toHaveAttribute('href', 'https://www.netflix.com/ca/');
  expect(screen.getByRole('link', { name: 'Open Apple TV' })).toHaveAttribute('href', 'https://tv.apple.com/ca');
  expect(screen.queryByText('US only')).toBeNull();
  expect(global.fetch.mock.calls[0][0]).toBe(`/api/tmdb/${mediaType}/42/watch/providers`);
  expect(screen.getByRole('link', { name: 'JustWatch' })).toBeTruthy();
});

test('shows an empty state when Canada has no availability', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ results: {} }) });
  render(<ProviderDetails movieId="42" />);
  await screen.findByText('No watch providers are currently listed for Canada.');
});

test('distinguishes request failures from missing providers', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false });
  render(<ProviderDetails movieId="42" />);
  expect((await screen.findByRole('alert')).textContent).toContain('Unable to load watch providers');
  expect(screen.queryByText('No watch providers are currently listed for Canada.')).toBeNull();
});

test('unmapped providers use the title watch page instead of guessing a URL', async () => {
  const link = 'https://www.themoviedb.org/tv/42/watch?locale=CA';
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ results: { CA: {
    link, flatrate: [{ provider_id: 12345, provider_name: 'Example Channel' }],
  } } }) });
  render(<ProviderDetails movieId="42" mediaType="tv" />);
  expect(await screen.findByRole('link', { name: 'Find Example Channel watch options on TMDB' })).toHaveAttribute('href', link);
});
