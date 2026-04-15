import React from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Ban, Clock } from 'lucide-react';

const LiveBadge = ({ action, size = 'md' }) => {
  const variants = {
    SAFE: {
      icon: Shield,
      bg: 'bg-[#00D4AA]/20',
      text: 'text-[#00D4AA]',
      border: 'border-[#00D4AA]/30',
      label: 'SAFE'
    },
    FLAGGED: {
      icon: AlertTriangle,
      bg: 'bg-[#FFA502]/20',
      text: 'text-[#FFA502]',
      border: 'border-[#FFA502]/30',
      label: 'FLAGGED'
    },
    BLOCKED: {
      icon: Ban,
      bg: 'bg-[#FF4757]/20',
      text: 'text-[#FF4757]',
      border: 'border-[#FF4757]/30',
      label: 'BLOCKED'
    },
    RATE_LIMITED: {
      icon: Clock,
      bg: 'bg-[#FFA502]/20',
      text: 'text-[#FFA502]',
      border: 'border-[#FFA502]/30',
      label: 'RATE LIMITED'
    },
    default: {
      icon: Shield,
      bg: 'bg-[#6C63FF]/20',
      text: 'text-[#6C63FF]',
      border: 'border-[#6C63FF]/30',
      label: 'UNKNOWN'
    }
  };

  const variant = variants[action] || variants.default;
  const Icon = variant.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${variant.bg} ${variant.text} ${variant.border} ${sizeClasses[size]}`}
    >
      <Icon className={`${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'}`} />
      {variant.label}
    </motion.span>
  );
};

export default LiveBadge;
