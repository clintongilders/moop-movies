import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MediaCard from './MediaCard';
import { useAuth } from './AuthContext';
jest.mock('./AuthContext', () => ({ useAuth: jest.fn() }));
test('card plus saves without opening details and confirms success', async () => {
  const mutate = jest.fn().mockResolvedValue({ success: true });
  useAuth.mockReturnValue({ account: { id: 7 }, loading: false, mutate });
  render(<MemoryRouter><MediaCard item={{ id: 42, title: 'Example' }} mediaType="movie" /></MemoryRouter>);
  const button = screen.getByRole('button', { name: 'Add Example to watchlist' });
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
});
