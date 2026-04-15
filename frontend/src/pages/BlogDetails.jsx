import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { blogs } from '../data/blogs';
import { Clock, ArrowLeft, Share2 } from 'lucide-react';
import Loader from '../components/Loader';

const BlogDetails = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch delay
    setLoading(true);
    setTimeout(() => {
      const foundPost = blogs.find(b => b.id === id);
      setPost(foundPost || blogs[0]);
      setLoading(false);
      window.scrollTo(0, 0);
    }, 400);
  }, [id]);

  if (loading) return <Loader />;

  return (
    <div className="bg-[#fdfdfd] min-h-screen pb-20 relative">
      
      {/* Hero Image */}
      <div className="h-[40vh] md:h-[60vh] w-full relative">
        <img 
          src={post.image} 
          alt={post.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gray-900/60 mix-blend-multiply"></div>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="inline-block btn-gradient px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider mb-6 text-white border-transparent">
              {post.category}
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-8">
              {post.title}
            </h1>
            
            <div className="flex items-center justify-center gap-6 text-gray-200 font-medium">
              <div className="flex items-center gap-3">
                <img src={post.authorAvatar} alt={post.author} className="w-10 h-10 rounded-full border-2 border-white/20" />
                <span>{post.author}</span>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
              <span className="flex items-center gap-2"><Clock size={16} /> {post.date} &middot; {post.readTime} min read</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
        <div className="glass-card rounded-[2rem] p-8 md:p-12 prose prose-lg prose-indigo max-w-none">
          <p className="text-xl text-gray-500 leading-relaxed mb-8 font-medium">
            {post.excerpt}
          </p>
          
          <div className="text-gray-800 leading-relaxed space-y-6">
            <p>{post.content}</p>
            {/* Adding fake lengthy paragraphs for demo */}
            <p>We've found that consistency is key. By standardizing our approach, we drastically cut down on friction. The results speak for themselves when you look at the engagement metrics. Beyond just numbers, the qualitative feedback from our community underscores the importance of this methodology. It’s not just about doing it right; it’s about doing it sustainably.</p>
            <blockquote>
              "Quality is not an act, it is a habit. What we do repeatedly defines us, making excellence the standard, not an exception."
            </blockquote>
            <p>Moving forward, the industry must adapt. We are no longer in an era where 'good enough' suffices. The bar has been raised, and those who fail to meet it will unfortunately be left behind. For our team, this is an exciting challenge rather than a daunting obstacle. We thrive at the intersection of complex problems and elegant solutions.</p>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 mt-12 pt-8">
            <Link to="/blog" className="flex items-center gap-2 text-primary-600 font-bold hover:text-primary-700 transition-colors">
              <ArrowLeft size={20} /> Back to Blog
            </Link>
            
            <button className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors bg-white/50 hover:bg-indigo-50 px-4 py-2 rounded-xl font-medium border border-gray-100">
              <Share2 size={18} /> Share Article
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogDetails;
