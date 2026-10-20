import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Icon from '../components/Icon';
import Skeleton from '../components/Skeleton';
import ConfirmDialog from '../components/ConfirmDialog';
import Step4Shares from '../components/Step4Shares';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import useBillStore from '../store/useBillStore';
import useAuthStore from '../store/useAuthStore';

it('applies equal assignments from the single Continue action', () => {
  const previous = useBillStore.getState();
  const auth = useAuthStore.getState();
  useAuthStore.setState({ user: { tier: 'free' } });
  useBillStore.setState({ bill: { ...previous.bill, splitType: 'equal', payerId: 'a', persons: [{ id: 'a', name: 'Ari' }, { id: 'b', name: 'Bea' }], items: [{ id: 'food', name: 'Lunch', price: 100000, qty: 1 }] }, assignments: {} });
  try {
    const setStep = vi.fn();
    render(<Step4Shares receiptGrandTotal={100000} setStep={setStep} />);
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(useBillStore.getState().assignments).toEqual({ a: { food: true }, b: { food: true } });
    expect(setStep).toHaveBeenCalledWith(5);
  } finally {
    useBillStore.setState(previous);
    useAuthStore.setState(auth);
  }
});

it('keeps all supplied history rows reachable and identifies empty searches', () => {
  const bills = Array.from({ length: 12 }, (_, i) => ({ id: `bill-${i}`, title: `Lunch ${i}`, status: 'pending' }));
  const { rerender } = render(<ActivityFeed bills={bills} />);
  expect(screen.getAllByRole('button')).toHaveLength(12);
  rerender(<ActivityFeed bills={[]} searching />);
  expect(screen.getByText('No matching splits')).toBeInTheDocument();
});

describe('Icon', () => {
  it('renders with the given name', () => {
    render(<Icon name="home" />);
    expect(screen.getByText('home')).toBeInTheDocument();
  });

  it('applies className', () => {
    render(<Icon name="home" className="text-lg" />);
    expect(screen.getByText('home')).toHaveClass('text-lg');
  });
});

describe('Skeleton', () => {
  it('renders with default variant', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('renders circle variant', () => {
    const { container } = render(<Skeleton variant="circle" />);
    expect(container.firstChild).toHaveClass('rounded-full');
  });
});

describe('ConfirmDialog', () => {
  it('renders when open', () => {
    render(<ConfirmDialog open title="Test" message="Test message" onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ConfirmDialog open={false} title="Test" message="Test message" onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.queryByText('Test')).not.toBeInTheDocument();
  });
});
