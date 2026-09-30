import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MediaCard from './MediaCard';
import { useAuth } from './AuthContext';
jest.mock('./AuthContext', () => ({ useAuth: jest.fn() }));
const originalFetch = global.fetch;
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ watchlist: false }) });
});
afterEach(() => { global.fetch = originalFetch; });
test('card plus saves without opening details and confirms success', async () => {
  const mutate = jest.fn().mockResolvedValue({ success: true });
  useAuth.mockReturnValue({ account: { id: 7 }, loading: false, mutate });
  render(<MemoryRouter><MediaCard item={{ id: 42, title: 'Example' }} mediaType="movie" /></MemoryRouter>);
  const button = await screen.findByRole('button', { name: 'Add Example to watchlist' });
  expect(button.closest('a')).toBeNull();
  fireEvent.click(button);
  await screen.findByRole('status');
  expect(mutate).toHaveBeenCalledWith('/api/account/watchlist', { media_type: 'movie', media_id: 42, enabled: true });
  expect(screen.getByRole('button', { name: 'Example added to watchlist' })).toBeDisabled();
});
test('signed out users go to account', () => {
  useAuth.mockReturnValue({ account: null, loading: false });
  render(<MemoryRouter><Routes><Route path="/" element={<MediaCard item={{ id: 42, name: 'Show' }} mediaType="tv" />} /><Route path="/account" element={<p>Connect account</p>} /></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Sign in to add Show to watchlist' }));
  expect(screen.getByText('Connect account')).toBeTruthy();
  expect(global.fetch).not.toHaveBeenCalled();
});

test.each(['movie', 'tv'])('previously saved %s cards show a green check on load', async mediaType => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ watchlist: true }) });
  const mutate = jest.fn();
  useAuth.mockReturnValue({ account: { id: 7 }, loading: false, mutate });
  render(<MemoryRouter><MediaCard item={{ id: 42, title: 'Saved title' }} mediaType={mediaType} /></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Loading watchlist status for Saved title' })).toBeDisabled();
  const button = await screen.findByRole('button', { name: 'Saved title added to watchlist' });
  expect(button).toHaveClass('is-saved');
  expect(button).toHaveTextContent('✓');
  expect(button).toBeDisabled();
  expect(global.fetch).toHaveBeenCalledWith(`/api/account/states/${mediaType}/42`, expect.objectContaining({ signal: expect.anything() }));
  expect(mutate).not.toHaveBeenCalled();
});

test('failed status checks can be retried without adding the title', async () => {
  global.fetch.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, json: async () => ({ watchlist: true }) });
  const mutate = jest.fn();
  useAuth.mockReturnValue({ account: { id: 7 }, loading: false, mutate });
  render(<MemoryRouter><MediaCard item={{ id: 42, title: 'Example' }} mediaType="movie" /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Retry watchlist status for Example' }));
  expect(await screen.findByRole('button', { name: 'Example added to watchlist' })).toHaveClass('is-saved');
  expect(mutate).not.toHaveBeenCalled();
});
