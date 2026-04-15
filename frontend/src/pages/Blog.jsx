import React from 'react';
import PageHeader from '../components/PageHeader';
import BlogCard from '../components/BlogCard';
import { blogs } from '../data/blogs';

const Blog = () => {
  return (
    <div className="bg-page min-h-screen pb-16 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full filter blur-3xl opacity-60 z-0 animate-blob"></div>
      <PageHeader 
        title="The LuxeCart Journal" 
        description="Insights, guides, and engineering deep-dives from our team."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 md:-mt-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map(post => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Blog;
