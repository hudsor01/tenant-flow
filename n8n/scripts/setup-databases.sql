-- Database initialization script for n8n stack
-- This script creates all required databases and users

-- Create databases
CREATE DATABASE IF NOT EXISTS n8n;
CREATE DATABASE IF NOT EXISTS nocodb;  
CREATE DATABASE IF NOT EXISTS listmonk;
CREATE DATABASE IF NOT EXISTS penpot;
CREATE DATABASE IF NOT EXISTS temporal;

-- Create n8n user with access to n8n database
CREATE USER IF NOT EXISTS n8n WITH PASSWORD 'n8n-password';
GRANT ALL PRIVILEGES ON DATABASE n8n TO n8n;
GRANT ALL PRIVILEGES ON DATABASE n8n TO postgres;

-- Grant permissions for other databases to postgres user
GRANT ALL PRIVILEGES ON DATABASE nocodb TO postgres;
GRANT ALL PRIVILEGES ON DATABASE listmonk TO postgres;
GRANT ALL PRIVILEGES ON DATABASE penpot TO postgres;
GRANT ALL PRIVILEGES ON DATABASE temporal TO postgres;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;