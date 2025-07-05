-- Clean Security: Each service gets user/password/database with same name
-- This runs automatically when PostgreSQL starts

-- Create dedicated database users (name = password = database)
CREATE USER n8n WITH PASSWORD 'n8n';
CREATE USER nocodb WITH PASSWORD 'nocodb'; 
CREATE USER listmonk WITH PASSWORD 'listmonk';
CREATE USER penpot WITH PASSWORD 'penpot';
CREATE USER temporal WITH PASSWORD 'temporal';

-- Create databases with matching names
CREATE DATABASE n8n OWNER n8n;
CREATE DATABASE nocodb OWNER nocodb;
CREATE DATABASE listmonk OWNER listmonk;
CREATE DATABASE penpot OWNER penpot;
CREATE DATABASE temporal OWNER temporal;

-- Grant only necessary permissions to each service
GRANT ALL PRIVILEGES ON DATABASE n8n TO n8n;
GRANT ALL PRIVILEGES ON DATABASE nocodb TO nocodb;
GRANT ALL PRIVILEGES ON DATABASE listmonk TO listmonk;
GRANT ALL PRIVILEGES ON DATABASE penpot TO penpot;
GRANT ALL PRIVILEGES ON DATABASE temporal TO temporal;

-- Ensure users can only access their own databases
REVOKE ALL ON DATABASE postgres FROM PUBLIC;
REVOKE ALL ON DATABASE n8n FROM PUBLIC;
REVOKE ALL ON DATABASE nocodb FROM PUBLIC;
REVOKE ALL ON DATABASE listmonk FROM PUBLIC;
REVOKE ALL ON DATABASE penpot FROM PUBLIC;
REVOKE ALL ON DATABASE temporal FROM PUBLIC;