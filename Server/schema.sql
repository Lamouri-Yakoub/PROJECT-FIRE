CREATE DATABASE IF NOT EXISTS project_fire;
USE project_fire;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    language VARCHAR(10) DEFAULT 'fr',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fires (
    id INT AUTO_INCREMENT PRIMARY KEY,
    forest_name VARCHAR(255) NOT NULL,
    daira VARCHAR(255),
    commune VARCHAR(255),
    latitude DOUBLE,
    longitude DOUBLE,
    fire_date DATE NOT NULL,
    surface_burned DOUBLE DEFAULT 0,
    cause VARCHAR(255),
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
