import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const StatCard = ({ icon: Icon, value, label, trend, trendValue, color }) => {
  const colorClasses = {
    purple: 'from-[#6C63FF] to-[#9C88FF]',
    teal: 'from-[#00D4AA] to-[#00F5CC]',
    green: 'from-[#00D4AA] to-[#00F5CC]',
    red: 'from-[#FF4757] to-[#FF6B81]',
    orange: 'from-[#FFA502] to-[#FFC107]'
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-[#00D4AA]' : trend === 'down' ? 'text-[#FF4757]' : 'text-[#8888AA]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-gradient-to-br from-[#1A1A2E] to-[#1F1F35] border border-[#2D2D4E] rounded-2xl hover:border-[#6C63FF] transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#8888AA] text-sm mb-1">{label}</p>
          <h3 className="text-3xl font-bold text-[#EAEAF5]">{value}</h3>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
