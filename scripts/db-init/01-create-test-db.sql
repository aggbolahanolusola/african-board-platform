-- Runs once on first container start (MySQL docker-entrypoint-initdb.d).
-- Creates the test database alongside the dev database and grants the app user access.
CREATE DATABASE IF NOT EXISTS nurtgov_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON nurtgov_test.* TO 'nurtgov'@'%';
FLUSH PRIVILEGES;
