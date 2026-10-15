import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import Icon from '../Icon';

describe('Icon', () => {
  test('renders with correct name and size props', () => {
    const size = 24;
    const name = 'home';
    render(<Icon name={name} size={size} />);
    
    const element = screen.getByText(name);
    expect(element).toBeInTheDocument();
    expect(element).toHaveAttribute('aria-hidden', 'true');
    expect(element).toHaveClass('material-symbols-outlined');
  });

  test('applies custom className when provided', () => {
    const customClass = 'custom-icon-class';
    render(<Icon name="home" size={24} className={customClass} />);
    
    const element = screen.getByText('home');
    expect(element).toHaveClass(customClass);
  });
});
