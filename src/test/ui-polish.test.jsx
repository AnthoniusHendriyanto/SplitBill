import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import BottomTabBar from '../components/BottomTabBar';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import useBillStore from '../store/useBillStore';

describe('polished navigation and UI primitives', () => {
  it('keeps five mobile destinations and opens More instead of navigating to a seventh tab', () => {
    const previous = useBillStore.getState().ui;
    useBillStore.setState({ ui: { ...previous, activeTab: 'groups', step: 1 } });
    const onMoreOpen = vi.fn();
    try {
      render(<BottomTabBar onMoreOpen={onMoreOpen} />);
      const nav = screen.getByRole('navigation', { name: 'Bottom navigation' });
      expect(within(nav).getAllByRole('button')).toHaveLength(5);
      expect(screen.getByRole('button', { name: 'Groups' })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current');
      fireEvent.click(screen.getByRole('button', { name: 'More' }));
      expect(onMoreOpen).toHaveBeenCalledTimes(1);
    } finally {
      useBillStore.setState({ ui: previous });
    }
  });

  it('renders a page header with a single accessible action area', () => {
    render(
      <PageHeader
        eyebrow="Shared spaces"
        title="Groups"
        description="Keep trips together."
        actions={<button type="button">Create group</button>}
      />
    );
    expect(screen.getByRole('heading', { name: 'Groups' })).toBeInTheDocument();
    expect(screen.getByText('Shared spaces')).toBeInTheDocument();
    expect(screen.getByText('Keep trips together.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create group' })).toBeInTheDocument();
  });

  it('maps status tones to visible badge variants', () => {
    const { rerender } = render(<StatusBadge tone="warning">Paused</StatusBadge>);
    expect(screen.getByText('Paused')).toHaveClass('status-badge-warning');
    rerender(<StatusBadge tone="success">Active</StatusBadge>);
    expect(screen.getByText('Active')).toHaveClass('status-badge-success');
  });
});
