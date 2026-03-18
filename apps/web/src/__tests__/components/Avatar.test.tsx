import React from 'react';
import { render, screen } from '@testing-library/react';
import { Avatar } from '@mega/ui';

describe('Avatar', () => {
  it('renders fallback initials when no src', () => {
    render(<Avatar fallback="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders image when src provided', () => {
    render(<Avatar src="https://example.com/avatar.jpg" alt="User avatar" />);
    const img = screen.getByAltText('User avatar');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders single letter for single word name', () => {
    render(<Avatar fallback="Alice" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders ? when no fallback', () => {
    render(<Avatar />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('applies size variants', () => {
    const { container } = render(<Avatar size="xl" fallback="Test" />);
    expect(container.firstChild).toHaveClass('h-24', 'w-24');
  });
});
