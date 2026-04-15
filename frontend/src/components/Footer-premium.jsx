import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-[#172337] text-white">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-4">About</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/about" className="hover:underline">About Us</Link></li>
              <li><Link to="/careers" className="hover:underline">Careers</Link></li>
              <li><Link to="/press" className="hover:underline">Press</Link></li>
              <li><Link to="/blog" className="hover:underline">Blog</Link></li>
              <li><Link to="/sustainability" className="hover:underline">Sustainability</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-4">Help</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/contact" className="hover:underline">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:underline">FAQs</Link></li>
              <li><Link to="/shipping" className="hover:underline">Shipping Info</Link></li>
              <li><Link to="/returns" className="hover:underline">Returns & Cancellations</Link></li>
              <li><Link to="/order-tracking" className="hover:underline">Order Tracking</Link></li>
            </ul>
          </div>

          {/* Consumer Policy */}
          <div>
            <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-4">Consumer Policy</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/privacy" className="hover:underline">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:underline">Terms of Use</Link></li>
              <li><Link to="/security" className="hover:underline">Security</Link></li>
              <li><Link to="/sitemap" className="hover:underline">Sitemap</Link></li>
              <li><Link to="/grievance" className="hover:underline">Grievance Redressal</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 text-[#2874F0]" />
                <span>123 Commerce Street, Business District, Mumbai 400001</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#2874F0]" />
                <span>+91 1800 123 4567</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#2874F0]" />
                <span>support@shopsphere.com</span>
              </li>
            </ul>
            
            {/* Social Links */}
            <div className="flex items-center gap-4 mt-6">
              <a href="#" className="w-8 h-8 bg-white/10 rounded flex items-center justify-center hover:bg-[#2874F0] transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-white/10 rounded flex items-center justify-center hover:bg-[#2874F0] transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-white/10 rounded flex items-center justify-center hover:bg-[#2874F0] transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-white/10 rounded flex items-center justify-center hover:bg-[#2874F0] transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <p className="text-gray-400">© 2024 ShopSphere. All Rights Reserved.</p>
            <div className="flex items-center gap-6">
              <span className="text-gray-400">We accept:</span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-5 bg-white rounded"></div>
                <div className="w-8 h-5 bg-white rounded"></div>
                <div className="w-8 h-5 bg-white rounded"></div>
                <div className="w-8 h-5 bg-white rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
