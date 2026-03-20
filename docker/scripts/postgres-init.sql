-- PostgreSQL initialization script for production
-- This file is executed when the database is first created

-- Set default configuration
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET pg_stat_statements.max = 10000;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Optimize for production workload
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '2MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '2GB';

-- Log configuration for production
ALTER SYSTEM SET log_statement = 'none';
ALTER SYSTEM SET log_duration = 'off';
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries longer than 1 second
ALTER SYSTEM SET log_checkpoints = 'on';
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';
ALTER SYSTEM SET log_lock_waits = 'on';
ALTER SYSTEM SET log_temp_files = 0;

-- Performance schema for monitoring
CREATE SCHEMA IF NOT EXISTS monitor;

-- Function to get table sizes
CREATE OR REPLACE FUNCTION monitor.table_sizes()
RETURNS TABLE(
    table_name text,
    size_pretty text,
    size_bytes bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname||'.'||tablename AS table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size_pretty,
        pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
    FROM pg_tables
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get slow queries
CREATE OR REPLACE FUNCTION monitor.slow_queries(duration_ms integer DEFAULT 1000)
RETURNS TABLE(
    query text,
    calls bigint,
    mean_exec_time numeric,
    total_exec_time numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.query,
        s.calls,
        s.mean_exec_time,
        s.total_exec_time
    FROM pg_stat_statements s
    WHERE s.mean_exec_time > duration_ms
    ORDER BY s.mean_exec_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to the application user
GRANT USAGE ON SCHEMA monitor TO mega;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA monitor TO mega;