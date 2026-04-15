import React from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Ban, Clock, FileText } from 'lucide-react';
import LiveBadge from './LiveBadge';

const ThreatCard = ({ threat, index }) => {
  const getSeverityColor = (score) => {
    if (score < 0.35) return 'border-l-[#00D4AA]';
    if (score < 0.70) return 'border-l-[#FFA502]';
    return 'border-l-[#FF4757]';
  };

  const getPatternIcon = (pattern) => {
    if (pattern?.includes('SQL')) return <FileText className="w-4 h-4 text-[#FF4757]" />;
    if (pattern?.includes('XSS')) return <AlertTriangle className="w-4 h-4 text-[#FFA502]" />;
    return <Shield className="w-4 h-4 text-[#6C63FF]" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`p-4 bg-[#0F0F1A] border border-[#2D2D4E] border-l-4 ${getSeverityColor(threat.threat_score || 0)} rounded-r-xl hover:bg-[#1F1F35] transition-colors`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <LiveBadge action={threat.action} size="sm" />
            <span className="text-xs text-[#8888AA] px-2 py-0.5 bg-[#1A1A2E] rounded-full">
              {threat.attack_type?.toUpperCase()}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-[#8888AA]">IP: </span>
              <span className="font-mono">{threat.ip}</span>
            </div>
            <div>
              <span className="text-[#8888AA]">Score: </span>
              <span className={`font-semibold ${
                (threat.threat_score || 0) > 0.7 ? 'text-[#FF4757]' :
                (threat.threat_score || 0) > 0.35 ? 'text-[#FFA502]' :
                'text-[#00D4AA]'
              }`}>
                {((threat.threat_score || 0) * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="mt-2 text-xs text-[#8888AA]">
            {threat.method} {threat.endpoint}
          </div>

          {threat.pattern_detected && (
            <div className="flex items-center gap-2 mt-2 text-xs">
              {getPatternIcon(threat.pattern_detected)}
              <span className="text-[#666688]">{threat.pattern_detected}</span>
            </div>
          )}
        </div>

        <div className="text-right">
          <p className="text-xs text-[#666688]">
            {new Date(threat.timestamp).toLocaleTimeString()}
          </p>
          {threat.recommendation && (
            <p className="text-xs text-[#6C63FF] mt-1 max-w-[150px]">
              {threat.recommendation}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ThreatCard;
