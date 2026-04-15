import React from 'react';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import { Target, Lightbulb, Users, ShopCheck, HeartPulse, Globe } from 'lucide-react';

const About = () => {
  const team = [
    { name: 'Sarah Jenkins', role: 'CEO & Founder', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80' },
    { name: 'David Chen', role: 'Chief Technology Officer', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80' },
    { name: 'Elena Rodriguez', role: 'Head of Design', image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80' },
    { name: 'Marcus Johnson', role: 'VP of Operations', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80' }
  ];

  const values = [
    { icon: <ShopCheck size={28} />, title: "Quality First", desc: "We never compromise on the quality of our products or our code." },
    { icon: <HeartPulse size={28} />, title: "Customer Centric", desc: "Every decision is made with our end-users in mind." },
    { icon: <Globe size={28} />, title: "Sustainability", desc: "Committed to reducing our carbon footprint and sustainable practices." }
  ];

  return (
    <div className="bg-page min-h-screen pb-16">
      <PageHeader
        title="About LuxeCart"
        description="We're on a mission to redefine online shopping by blending premium quality with seamless digital experiences."
        imagePlaceholder={true}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <Card className="flex flex-col items-center text-center p-10">
            <div className="bg-indigo-500/10 text-indigo-500 p-4 rounded-full mb-6">
              <Target size={40} />
            </div>
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Our Mission</h2>
            <p className="leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              To democratize access to premium, high-quality products while delivering an unparalleled, seamless digital shopping experience that respects the user's time and intelligence.
            </p>
          </Card>

          <Card className="flex flex-col items-center text-center p-10">
            <div className="bg-emerald-500/10 text-emerald-500 p-4 rounded-full mb-6">
              <Lightbulb size={40} />
            </div>
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Our Vision</h2>
            <p className="leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              To become the world's most trusted digital storefront, recognized not just for what we sell, but for how we engineer the experience of buying it.
            </p>
          </Card>
        </div>

        {/* Story Section */}
        <div className="glass-card rounded-[2rem] p-8 md:p-12 mb-16 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-extrabold mb-6 tracking-tight" style={{ color: 'var(--text-primary)' }}>The LuxeCart Journey</h2>
              <div className="space-y-4 text-lg leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                <p>
                  Founded in 2023 in a small garage in San Francisco, LuxeCart began with a simple observation: buying premium goods online often felt surprisingly cheap. The interfaces were cluttered, the performance was sluggish, and the trust was missing.
                </p>
                <p>
                  Our founders, a mix of seasoned software engineers and retail veterans, decided to build a platform that matched the quality of the products it sold.
                </p>
                <p>
                  Today, we serve millions of customers globally, but we still operate with that same Day 1 startup mentality—iterating fast, listening to feedback, and obsessing over every pixel.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square md:aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500" style={{ backgroundColor: 'var(--bg-muted)' }}>
                <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80" alt="Team collaborating" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-6 -left-6 p-6 rounded-2xl shadow-xl flex items-center gap-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
                <Users size={32} className="text-indigo-500" />
                <div>
                  <p className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>2M+</p>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Happy Customers</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4" style={{ color: 'var(--text-primary)' }}>Our Core Values</h2>
            <p className="max-w-2xl mx-auto" style={{ color: 'var(--text-muted)' }}>The principles that guide every decision we make.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((v, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white mb-6 shadow-xl transform hover:scale-110 transition-transform">
                  {v.icon}
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{v.title}</h3>
                <p style={{ color: 'var(--text-muted)' }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team Section */}
        <div>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4" style={{ color: 'var(--text-primary)' }}>Meet the Leadership</h2>
            <p className="max-w-2xl mx-auto" style={{ color: 'var(--text-muted)' }}>The people driving our vision forward.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, idx) => (
              <Card key={idx} className="p-0 overflow-hidden text-center group">
                <div className="aspect-square overflow-hidden" style={{ backgroundColor: 'var(--bg-muted)' }}>
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500" />
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>{member.name}</h3>
                  <p className="text-sm font-medium text-indigo-500">{member.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default About;
