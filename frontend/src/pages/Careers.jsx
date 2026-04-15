import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import { Briefcase, MapPin, Clock, ArrowRight, CheckCircle2, Star } from 'lucide-react';
import { toast } from 'react-toastify';

const Careers = () => {
  const [applyingFor, setApplyingFor] = useState(null);

  const jobs = [
    { id: 1, title: 'Senior Frontend Engineer', department: 'Engineering', location: 'San Francisco, CA (Hybrid)', type: 'Full-time', exp: '5+ years' },
    { id: 2, title: 'Product Manager', department: 'Product', location: 'Remote', type: 'Full-time', exp: '3+ years' },
    { id: 3, title: 'UX/UI Designer', department: 'Design', location: 'New York, NY', type: 'Full-time', exp: '2+ years' },
    { id: 4, title: 'Customer Success Specialist', department: 'Support', location: 'Remote', type: 'Full-time', exp: '1+ year' }
  ];

  const benefits = [
    "Competitive salary and equity packages",
    "100% covered health, dental, and vision insurance",
    "Unlimited PTO and flexible working hours",
    "Annual learning & development stipend ($2,000)",
    "Home office setup allowance",
    "Quarterly team retreats"
  ];

  const handleApplyClick = (e, jobTitle) => {
    e.preventDefault();
    setApplyingFor(jobTitle);
    toast.info(`Application workflow for ${jobTitle} would open here.`);
    setTimeout(() => setApplyingFor(null), 3000);
  };

  return (
    <div className="bg-page min-h-screen pb-16 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full filter blur-3xl opacity-60 z-0 animate-blob"></div>
      <PageHeader 
        title="Join Our Team" 
        description="Help us build the future of e-commerce. We're always looking for passionate people to join our growing family."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 md:-mt-10 relative z-10">
        
        {/* Why work with us */}
        <div className="glass-card rounded-[2rem] p-8 md:p-12 mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-extrabold mb-6 tracking-tight" style={{ color: 'var(--text-primary)' }}>Why work at LuxeCart?</h2>
              <p className="text-lg leading-relaxed mb-6" style={{ color: 'var(--text-muted)' }}>
                We believe that to build exceptional products, we need an exceptional environment. We foster a culture of autonomy, rapid iteration, and direct feedback. 
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 size={24} className="text-emerald-500 flex-shrink-0" />
                    <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80" alt="Team" className="w-full h-48 object-cover rounded-2xl shadow-sm" />
                <img src="https://images.unsplash.com/photo-1552581234-26160f608093?w=400&q=80" alt="Office" className="w-full h-64 object-cover rounded-2xl shadow-sm" />
              </div>
              <div className="space-y-4 pt-8">
                <img src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&q=80" alt="Meeting" className="w-full h-64 object-cover rounded-2xl shadow-sm" />
                <div className="bg-primary-50 rounded-2xl h-48 p-6 flex flex-col justify-center items-center text-center">
                   <Star size={40} className="text-primary-600 mb-2" />
                   <p className="font-bold text-gray-900">Rated exactly<br/>4.9/5 on Glassdoor</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Open Positions */}
        <div>
          <div className="mb-8 flex justify-between items-end border-b pb-4" style={{ borderColor: 'var(--border-default)' }}>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Open Positions</h2>
              <p className="mt-2" style={{ color: 'var(--text-muted)' }}>Find your perfect role below.</p>
            </div>
          </div>

          <div className="space-y-6">
            {jobs.map(job => (
              <Card key={job.id} hoverEffect={true} className="flex flex-col md:flex-row md:items-center justify-between p-6 sm:p-8">
                <div className="mb-6 md:mb-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>{job.department}</span>
                    <span className="bg-indigo-500/10 text-indigo-500 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><Clock size={12}/> {job.type}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{job.title}</h3>
                  <div className="flex flex-wrap text-sm gap-4 font-medium" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1"><MapPin size={16} /> {job.location}</span>
                    <span className="flex items-center gap-1"><Briefcase size={16} /> Experience: {job.exp}</span>
                  </div>
                </div>
                
                <button 
                  onClick={(e) => handleApplyClick(e, job.title)}
                  className="btn-gradient px-8 py-3 w-full sm:w-auto flex justify-center items-center gap-2 group text-white border-transparent"
                >
                  {applyingFor === job.title ? 'Opening Form...' : 'Apply Now'} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center p-8 rounded-[2rem] border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-default)' }}>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Don't see a fit?</h3>
            <p className="mb-6" style={{ color: 'var(--text-muted)' }}>We're always looking for talented people. Send us your resume and we'll keep it on file.</p>
            <button className="px-6 py-3 rounded-full font-bold transition-all shadow-sm border text-indigo-500 hover:border-indigo-500" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
              Submit General Application
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Careers;
