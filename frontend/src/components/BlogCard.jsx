import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';

const BlogCard = ({ post }) => {
  return (
    <article
      className="group rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full border"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--border-default)',
      }}
    >
      <Link to={`/blog/${post.id}`} className="block relative aspect-[16/9] overflow-hidden" style={{ backgroundColor: 'var(--bg-muted)' }}>
        <img
          src={post.image}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-indigo-600 uppercase tracking-wide shadow-sm">
          {post.category}
        </div>
      </Link>

      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center gap-4 text-xs mb-3 font-medium" style={{ color: 'var(--text-faint)' }}>
          <span className="flex items-center gap-1.5"><Clock size={14} /> {post.date}</span>
          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--border-strong)' }}></span>
          <span>{post.readTime} min read</span>
        </div>

        <h3 className="text-xl font-bold mb-3 group-hover:text-indigo-500 transition-colors line-clamp-2" style={{ color: 'var(--text-primary)' }}>
          <Link to={`/blog/${post.id}`}>{post.title}</Link>
        </h3>

        <p className="mb-6 line-clamp-3 flex-grow text-sm" style={{ color: 'var(--text-muted)' }}>
          {post.excerpt}
        </p>

        <div className="mt-auto border-t pt-5 flex items-center justify-between" style={{ borderColor: 'var(--border-default)' }}>
          <div className="flex items-center gap-3">
            <img src={post.authorAvatar} alt={post.author} className="w-8 h-8 rounded-full" style={{ backgroundColor: 'var(--bg-muted)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{post.author}</span>
          </div>

          <Link
            to={`/blog/${post.id}`}
            className="text-indigo-500 hover:text-white bg-indigo-500/10 p-2 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-all"
          >
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default BlogCard;
