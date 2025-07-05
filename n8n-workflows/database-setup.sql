-- Database setup for NocoDB and Listmonk
-- Run this in your PostgreSQL instance

-- Create databases
CREATE DATABASE IF NOT EXISTS nocodb;
CREATE DATABASE IF NOT EXISTS listmonk;

-- Connect to nocodb database
\c nocodb;

-- Create lead_magnets table structure (NocoDB will manage this, but here's the schema)
-- NocoDB will automatically create tables, this is just for reference
/*
Table: lead_magnets
- id (primary key, auto-increment)
- title (varchar 255)
- subject (varchar 255)
- campaign (varchar 100)
- category (varchar 50)
- workflow (varchar 10)
- content (text)
- value (varchar 50)
- status (varchar 20)
- created_at (timestamp)
- sent_count (integer default 0)
- landing_page_url (varchar 255)
*/

-- Connect to listmonk database
\c listmonk;

-- Listmonk will handle its own schema, but we need to ensure lists exist
-- These will be created through the API after Listmonk initializes