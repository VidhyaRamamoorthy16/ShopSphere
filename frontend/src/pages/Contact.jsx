import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { toast } from '../components/Toast'

export default function Contact() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields')
      return
    }
    setSending(true)
    await new Promise(r => setTimeout(r, 1500))
    setSent(true)
    toast.success('Message sent! We will get back to you within 24 hours.')
    setSending(false)
  }

  const inp = { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#111827', outline: 'none', fontFamily: "'Inter',sans-serif", background: '#fff', transition: 'border-color 0.2s' }
    }, 1500);
  };

  return (
    <div className="bg-page min-h-screen pb-16 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full filter blur-3xl opacity-60 z-0 animate-blob"></div>
      <PageHeader 
        title="Get in Touch" 
        description="Have a question or just want to say hi? We'd love to hear from you."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 md:-mt-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Contact Info Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
              <h3 className="text-2xl font-bold mb-8">Contact Information</h3>
              
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="bg-gray-800 p-3 rounded-full text-primary-400">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Our Headquarters</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      123 Innovation Drive<br/>
                      Tech District, MS 94103<br/>
                      San Francisco, CA
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-gray-800 p-3 rounded-full text-primary-400">
                    <Phone size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Call Us</h4>
                    <p className="text-gray-400 text-sm">
                      +1 (800) 123-4567<br/>
                      Mon-Fri, 9am - 6pm PST
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-gray-800 p-3 rounded-full text-primary-400">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Email Us</h4>
                    <p className="text-gray-400 text-sm">
                      support@luxecart.com<br/>
                      press@luxecart.com
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Google Maps Placeholder */}
            <div className="glass-card p-2 rounded-[2rem] overflow-hidden aspect-video relative group flex items-center justify-center">
               <div className="absolute inset-0 bg-gray-200">
                 {/* Fake map image for presentation */}
                 <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80" alt="Map View" className="w-full h-full object-cover filter brightness-75 contrast-125 saturate-50" />
               </div>
               <div className="relative z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-full font-bold text-gray-900 shadow-lg text-sm flex items-center gap-2">
                 <MapPin size={16} className="text-primary-600" /> View on Google Maps
               </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2 glass-card rounded-[2rem] p-8 md:p-12 relative z-10">
            <h2 className="text-3xl font-extrabold mb-2" style={{ color: 'var(--text-primary)' }}>Send us a message</h2>
            <p className="mb-8" style={{ color: 'var(--text-muted)' }}>Fill out the form below and our team will get back to you within 24 hours.</p>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <FormInput
                  label="First & Last Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required={true}
                />
                <FormInput
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  required={true}
                  icon={Mail}
                />
              </div>

              <FormInput
                label="Subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="How can we help?"
                required={true}
              />

              <FormInput
                label="Message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Write your message here..."
                required={true}
                textarea={true}
                rows={6}
                icon={MessageSquare}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full md:w-auto mt-4 flex items-center justify-center gap-2 btn-gradient px-10 py-4 lg:px-12 disabled:opacity-75 disabled:cursor-not-allowed text-lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div> Sending...
                  </span>
                ) : (
                  <>
                    Send Message <Send size={20} />
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Contact;
