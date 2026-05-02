-- Create initial Partitions for audit_logs
DO $$
DECLARE
  start_date DATE := date_trunc('month', NOW());
  next_month DATE := start_date + INTERVAL '1 month';
BEGIN
  -- current month
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs
     FOR VALUES FROM (%L) TO (%L);',
    'audit_logs_' || to_char(start_date, 'YYYY_MM'),
    start_date,
    next_month
  );
  -- next month
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs
     FOR VALUES FROM (%L) TO (%L);',
    'audit_logs_' || to_char(next_month, 'YYYY_MM'),
    next_month,
    next_month + INTERVAL '1 month'
  );
END
$$;