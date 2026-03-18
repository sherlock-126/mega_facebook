import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export default function Button({ variant = 'primary', children, ...props }: ButtonProps) {
  return (
    <button
      className={variant === 'primary' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}
      {...props}
    >
      {children}
    </button>
  );
}
