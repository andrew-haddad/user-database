-- Run once in phpMyAdmin / mysql, inside the web_app database.
CREATE TABLE IF NOT EXISTS Users(
   username VARCHAR(50) PRIMARY KEY,
   password_hash VARCHAR(255) NOT NULL,  -- bcrypt hash, never the plain password
   firstname VARCHAR(50) NOT NULL,
   lastname VARCHAR(50) NOT NULL,
   salary FLOAT,
   age INTEGER,
   registerday DATE,
   signintime DATETIME NULL              -- NULL = has never signed in
);
