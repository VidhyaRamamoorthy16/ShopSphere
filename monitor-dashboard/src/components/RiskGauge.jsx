import React from 'react';
import { motion } from 'framer-motion';

const RiskGauge = ({ score, size = 'md' }) => {
  // Score is 0-100
  const normalizedScore = Math.min(Math.max(score, 0), 100);
  
  const getColor = (value) => {
    if (value < 30) return '#00D4AA';
    if (value < 70) return '#FFA502';
    return '#FF4757';
  };

  const getLabel = (value) => {
    if (value < 30) return 'LOW';
    if (value < 70) return 'MEDIUM';
    return 'HIGH';
  };

  const sizeConfig = {
    sm: { width: 60, height: 30, stroke: 6, font: '10px' },
    md: { width: 100, height: 50, stroke: 8, font: '12px' },
    lg: { width: 140, height: 70, stroke: 10, font: '14px' }
  };

  const config = sizeConfig[size];
  const color = getColor(normalizedScore);
  const label = getLabel(normalizedScore);

  // Calculate arc path
  const radius = (config.width - config.stroke) / 2;
  const centerX = config.width / 2;
  const centerY = config.height - config.stroke / 2;
  const startAngle = Math.PI;
  const endAngle = Math.PI + (normalizedScore / 100) * Math.PI;

  const arcPath = `
    M ${centerX - radius} ${centerY}
    A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}
  `;

  const valuePath = `
    M ${centerX - radius} ${centerY}
    A ${radius} ${radius} 0 0 1 ${centerX + radius * Math.cos(endAngle - Math.PI)} ${centerY + radius * Math.sin(endAngle - Math.PI)}
  `;

  return (
    <div className="inline-flex flex-col items-center">
      <svg width={config.width} height={config.height}>
        {/* Background arc */}
        <path
          d={arcPath}
          fill="none"
          stroke="#2D2D4E"
          strokeWidth={config.stroke}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <motion.path
          d={valuePath}
          fill="none"
          stroke={color}
          strokeWidth={config.stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: normalizedScore / 100 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        {/* Needle */}
        <motion.line
          x1={centerX}
          y1={centerY}
          x2={centerX + radius * 0.8 * Math.cos(endAngle - Math.PI)}
          y2={centerY + radius * 0.8 * Math.sin(endAngle - Math.PI)}
          stroke={color}
          strokeWidth={config.stroke / 2}
          strokeLinecap="round"
          initial={{ x2: centerX - radius * 0.8, y2: centerY }}
          animate={{ 
            x2: centerX + radius * 0.8 * Math.cos(endAngle - Math.PI),
            y2: centerY + radius * 0.8 * Math.sin(endAngle - Math.PI)
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        {/* Center dot */}
        <circle
          cx={centerX}
          cy={centerY}
          r={config.stroke / 2}
          fill="#EAEAF5"
        />
      </svg>
      <div className="text-center mt-1">
        <span 
          className="font-bold"
          style={{ color, fontSize: config.font }}
        >
          {label}
        </span>
      </div>
    </div>
  );
};

export default RiskGauge;
