-- Supabase Schema for Threat Detection System
-- Conference Paper Implementation

-- Main threat logs table
CREATE TABLE IF NOT EXISTS threat_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Request metadata
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  
  -- Threat detection results
  threat_score FLOAT NOT NULL CHECK (threat_score >= 0 AND threat_score <= 1),
  attack_type TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('SAFE', 'FLAGGED', 'BLOCKED')),
  detection_method TEXT NOT NULL,
  
  -- Detailed detection info
  matched_patterns TEXT[] DEFAULT '{}',
  payload_preview TEXT,
  inference_time_ms INTEGER,
  risk_tier TEXT,
  
  -- Request details
  user_agent TEXT,
  headers JSONB,
  query_params TEXT,
  body_preview TEXT,
  
  -- ML model info
  model_version TEXT,
  features_triggered JSONB,
  
  -- False positive tracking
  is_false_positive BOOLEAN DEFAULT FALSE,
  false_positive_reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  
  -- Performance metrics
  processing_time_ms INTEGER,
  redis_lookup_time_ms INTEGER,
  feature_extraction_time_ms INTEGER,
  model_inference_time_ms INTEGER
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_threat_logs_ip ON threat_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_threat_logs_created_at ON threat_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threat_logs_attack_type ON threat_logs(attack_type);
CREATE INDEX IF NOT EXISTS idx_threat_logs_action ON threat_logs(action);
CREATE INDEX IF NOT EXISTS idx_threat_logs_false_positive ON threat_logs(is_false_positive) WHERE is_false_positive = TRUE;
CREATE INDEX IF NOT EXISTS idx_threat_logs_threat_score ON threat_logs(threat_score);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_threat_logs_ip_created ON threat_logs(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threat_logs_type_action ON threat_logs(attack_type, action);

-- Rate limit logs table (for adaptive rate limiting)
CREATE TABLE IF NOT EXISTS rate_limit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('allowed', 'warned', 'blocked', 'rate_limited')),
  
  requests_made INTEGER NOT NULL,
  limit_max INTEGER NOT NULL,
  remaining INTEGER NOT NULL,
  
  user_id TEXT,
  user_tier TEXT,
  blocked_until TIMESTAMPTZ,
  
  threat_score FLOAT DEFAULT 0,
  risk_score FLOAT DEFAULT 0,
  
  user_agent TEXT,
  headers JSONB,
  
  -- Rate limiting metadata
  rate_limit_strategy TEXT,
  window_seconds INTEGER,
  retry_after INTEGER
);

-- Indexes for rate limit logs
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_ip ON rate_limit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_created_at ON rate_limit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_action ON rate_limit_logs(action);

-- IP reputation table (aggregated statistics)
CREATE TABLE IF NOT EXISTS ip_reputation (
  ip_address TEXT PRIMARY KEY,
  
  -- Statistics
  total_requests BIGINT DEFAULT 0,
  total_threats BIGINT DEFAULT 0,
  total_blocks BIGINT DEFAULT 0,
  
  -- Risk assessment
  current_risk_score FLOAT DEFAULT 0,
  current_tier TEXT DEFAULT 'normal',
  
  -- Threat breakdown
  sqli_count BIGINT DEFAULT 0,
  xss_count BIGINT DEFAULT 0,
  brute_force_count BIGINT DEFAULT 0,
  path_traversal_count BIGINT DEFAULT 0,
  
  -- Timestamps
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  last_threat_at TIMESTAMPTZ,
  last_block_at TIMESTAMPTZ,
  
  -- Status
  is_blocked BOOLEAN DEFAULT FALSE,
  is_whitelisted BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  blocked_until TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for IP reputation
CREATE INDEX IF NOT EXISTS idx_ip_reputation_risk ON ip_reputation(current_risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_ip_reputation_blocked ON ip_reputation(is_blocked) WHERE is_blocked = TRUE;
CREATE INDEX IF NOT EXISTS idx_ip_reputation_tier ON ip_reputation(current_tier);
CREATE INDEX IF NOT EXISTS idx_ip_reputation_last_seen ON ip_reputation(last_seen DESC);

-- Model performance tracking table
CREATE TABLE IF NOT EXISTS model_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Model info
  model_type TEXT NOT NULL,
  model_version TEXT NOT NULL,
  
  -- Performance metrics
  total_predictions BIGINT DEFAULT 0,
  true_positives BIGINT DEFAULT 0,
  false_positives BIGINT DEFAULT 0,
  true_negatives BIGINT DEFAULT 0,
  false_negatives BIGINT DEFAULT 0,
  
  -- Calculated metrics
  accuracy FLOAT,
  precision FLOAT,
  recall FLOAT,
  f1_score FLOAT,
  false_positive_rate FLOAT,
  
  -- Timing
  avg_inference_time_ms FLOAT,
  p95_inference_time_ms FLOAT,
  p99_inference_time_ms FLOAT,
  
  -- Dataset info
  training_samples BIGINT,
  validation_samples BIGINT,
  test_samples BIGINT,
  
  -- Additional metrics
  confusion_matrix JSONB,
  feature_importance JSONB
);

-- Indexes for model performance
CREATE INDEX IF NOT EXISTS idx_model_performance_type ON model_performance(model_type);
CREATE INDEX IF NOT EXISTS idx_model_performance_recorded ON model_performance(recorded_at DESC);

-- Security alerts table (for high-priority threats)
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  ip_address TEXT,
  endpoint TEXT,
  
  threat_score FLOAT,
  attack_type TEXT,
  
  -- Alert status
  status TEXT DEFAULT 'NEW' CHECK (status IN ('NEW', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  
  -- Related data
  related_threat_ids UUID[],
  metadata JSONB,
  
  -- Notifications
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ
);

-- Indexes for security alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created ON security_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_ip ON security_alerts(ip_address);

-- Admin actions audit log
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  admin_email TEXT NOT NULL,
  
  action_type TEXT NOT NULL,
  action_details JSONB NOT NULL,
  
  ip_address TEXT,
  affected_ip TEXT,
  
  -- For undo/revert capability
  previous_state JSONB,
  can_revert BOOLEAN DEFAULT FALSE,
  reverted_at TIMESTAMPTZ,
  reverted_by UUID REFERENCES auth.users(id)
);

-- Indexes for admin actions
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON admin_actions(action_type);

-- Enable Row Level Security (RLS)
ALTER TABLE threat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for threat_logs
CREATE POLICY "Allow admin read access" ON threat_logs
  FOR SELECT USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow service role insert" ON threat_logs
  FOR INSERT WITH CHECK (true);

-- RLS Policies for rate_limit_logs
CREATE POLICY "Allow admin read access" ON rate_limit_logs
  FOR SELECT USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow service role insert" ON rate_limit_logs
  FOR INSERT WITH CHECK (true);

-- RLS Policies for ip_reputation
CREATE POLICY "Allow admin full access" ON ip_reputation
  FOR ALL USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow service role all" ON ip_reputation
  FOR ALL USING (true);

-- RLS Policies for model_performance
CREATE POLICY "Allow admin read access" ON model_performance
  FOR SELECT USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow service role insert" ON model_performance
  FOR INSERT WITH CHECK (true);

-- RLS Policies for security_alerts
CREATE POLICY "Allow admin full access" ON security_alerts
  FOR ALL USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for admin_actions
CREATE POLICY "Allow admin read access" ON admin_actions
  FOR SELECT USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow admin insert own actions" ON admin_actions
  FOR INSERT WITH CHECK (auth.uid() = admin_id);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for ip_reputation
CREATE TRIGGER update_ip_reputation_updated_at
  BEFORE UPDATE ON ip_reputation
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to aggregate IP statistics
CREATE OR REPLACE FUNCTION aggregate_ip_stats(target_ip TEXT)
RETURNS TABLE (
  total_requests BIGINT,
  total_threats BIGINT,
  total_blocks BIGINT,
  last_threat_at TIMESTAMPTZ,
  last_block_at TIMESTAMPTZ,
  top_attack_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE action = 'BLOCKED' OR action = 'FLAGGED')::BIGINT as total_threats,
    COUNT(*) FILTER (WHERE action = 'BLOCKED')::BIGINT as total_blocks,
    MAX(created_at) FILTER (WHERE action = 'BLOCKED' OR action = 'FLAGGED') as last_threat_at,
    MAX(created_at) FILTER (WHERE action = 'BLOCKED') as last_block_at,
    MODE() WITHIN GROUP (ORDER BY attack_type) as top_attack_type
  FROM threat_logs
  WHERE ip_address = target_ip;
END;
$$ LANGUAGE plpgsql;

-- Enable Realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE threat_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE security_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE ip_reputation;

-- Create view for threat summary dashboard
CREATE OR REPLACE VIEW threat_summary_today AS
SELECT
  COUNT(*) as total_threats_today,
  COUNT(*) FILTER (WHERE action = 'BLOCKED') as blocked_today,
  COUNT(*) FILTER (WHERE action = 'FLAGGED') as flagged_today,
  COUNT(*) FILTER (WHERE attack_type = 'sqli') as sqli_today,
  COUNT(*) FILTER (WHERE attack_type = 'xss') as xss_today,
  COUNT(*) FILTER (WHERE attack_type = 'brute_force') as brute_force_today,
  AVG(threat_score) as avg_threat_score,
  MAX(threat_score) as max_threat_score
FROM threat_logs
WHERE created_at >= CURRENT_DATE;

-- Create view for top attacking IPs
CREATE OR REPLACE VIEW top_attacking_ips AS
SELECT
  ip_address,
  COUNT(*) as total_threats,
  COUNT(*) FILTER (WHERE action = 'BLOCKED') as blocked_count,
  MAX(threat_score) as max_threat_score,
  AVG(threat_score) as avg_threat_score,
  MAX(created_at) as last_seen
FROM threat_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY ip_address
ORDER BY total_threats DESC;

-- Create materialized view for performance (refresh every hour)
CREATE MATERIALIZED VIEW IF NOT EXISTS threat_hourly_summary AS
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  attack_type,
  action,
  COUNT(*) as count,
  AVG(threat_score) as avg_threat_score
FROM threat_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('hour', created_at), attack_type, action
ORDER BY hour DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_threat_hourly_hour ON threat_hourly_summary(hour);
CREATE INDEX IF NOT EXISTS idx_threat_hourly_type ON threat_hourly_summary(attack_type);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_threat_hourly_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW threat_hourly_summary;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE threat_logs IS 'Stores all threat detection events';
COMMENT ON TABLE rate_limit_logs IS 'Stores rate limiting decisions and metrics';
COMMENT ON TABLE ip_reputation IS 'Aggregated IP reputation scores and statistics';
COMMENT ON TABLE model_performance IS 'ML model performance tracking';
COMMENT ON TABLE security_alerts IS 'High-priority security alerts requiring admin attention';
COMMENT ON TABLE admin_actions IS 'Audit log of all admin actions';

-- Grant permissions
GRANT ALL ON threat_logs TO service_role;
GRANT ALL ON rate_limit_logs TO service_role;
GRANT ALL ON ip_reputation TO service_role;
GRANT ALL ON model_performance TO service_role;
GRANT ALL ON security_alerts TO service_role;
GRANT ALL ON admin_actions TO service_role;

GRANT SELECT ON threat_logs TO authenticated;
GRANT SELECT ON rate_limit_logs TO authenticated;
GRANT SELECT ON ip_reputation TO authenticated;
GRANT SELECT ON model_performance TO authenticated;
GRANT SELECT ON security_alerts TO authenticated;
GRANT SELECT ON admin_actions TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
