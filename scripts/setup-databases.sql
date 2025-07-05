-- PostgreSQL Database Setup for NocoDB and Listmonk
-- Run this as postgres superuser

-- Create databases
CREATE DATABASE nocodb;
CREATE DATABASE listmonk;

-- Connect to nocodb database to verify
\c nocodb;
SELECT 'NocoDB database created successfully' as message;

-- Connect to listmonk database to verify  
\c listmonk;
SELECT 'Listmonk database created successfully' as message;

-- Back to default database
\c postgres;

-- Grant permissions (adjust user as needed)
GRANT ALL PRIVILEGES ON DATABASE nocodb TO postgres;
GRANT ALL PRIVILEGES ON DATABASE listmonk TO postgres;

SELECT 'Database setup completed successfully!' as status;