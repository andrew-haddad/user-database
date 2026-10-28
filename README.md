# User Database Project

This is a web app in which users can register, log in, and search for user information stored in a MySQL database. This project was built using JavaScript, HTML, CSS, Node.js, Express, and MySQL.


## Features

* Register a new user with a username, first name, last name, password, age, and salary
* Passwords are hashed with bcrypt
* Sign in and out of an account
* Search users by first and/or last name
* Search users by username
* Search all users whose salary is between X and Y
* Search all users whose ages are between X and Y
* Search users who registered after a chosen username
* Search users who never signed in
* Search users who registered on the same day that a chosen username registered
* Show the users who registered today

## Setup

1. Install Node.js, MySQL, and XAMPP
2. Open XAMPP and click start on Apache and MySQL
3. Click Admin on the MySQL row in XAMPP to open phpmyadmin
4. Create a new database in phpmyadmin and name it web_app
5. Run the contents of schema.sql as a SQL query in the web_app database to create the Users table
6. Open a terminal in the Backend folder and run 'npm install' (this only has to be done once for the initial project setup)
7. Create a .env file inside the Backend folder. You can copy and paste the contents of the file 'dotenv.example', but make sure the set the value of SESSION_SECRET a long random string.
8. In terminal, navigate to the Backend folder and run 'npm start'. This starts the Backend server.
9. Now, go to the following url in your browser: http://localhost/project1/Frontend/index.html. This is where you can access the web app and its functionalities.

## SQL Queries
The sql.txt file contains the SQL statements used for the web app.

## Authors

Harshil Kunjadiya and Andrew Haddad
