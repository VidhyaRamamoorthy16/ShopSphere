import React from 'react';

const Card = ({ children, className = "", hoverEffect = true }) => {
  return (
    <div
      className={`rounded-2xl p-6 shadow-sm transition-all duration-300 border ${
        hoverEffect ? 'hover:shadow-xl hover:-translate-y-1' : ''
      } ${className}`}
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--border-default)',
      }}
    >
      {children}
    </div>
  );
};

export default Card;
