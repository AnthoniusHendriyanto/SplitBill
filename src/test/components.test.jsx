import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Icon from '../components/Icon';
import Skeleton from '../components/Skeleton';
import ConfirmDialog from '../components/ConfirmDialog';

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
