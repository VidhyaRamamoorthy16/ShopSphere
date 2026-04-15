import React from 'react';

const PageHeader = ({ title, description, imagePlaceholder = false }) => {
  return (
    <div
      className="relative overflow-hidden py-16 sm:py-24 border-b"
      style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border-default)' }}
    >
      {/* Soft pastel/dark gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-pink-500/5"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full filter blur-3xl opacity-60 animate-blob"></div>
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-pink-400/10 rounded-full filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
      </div>

      {imagePlaceholder && (
        <div className="absolute inset-0 z-0 opacity-[0.03]">
          <img
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80"
            alt="Office background"
            className="w-full h-full object-cover filter grayscale"
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <h1
          className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 animate-fade-in-up"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h1>
        {description && (
          <p
            className="text-xl max-w-2xl mx-auto animate-fade-in-up"
            style={{ color: 'var(--text-muted)', animationDelay: '0.1s' }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
