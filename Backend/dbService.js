const mysql = require('mysql');
const dotenv = require('dotenv');
dotenv.config();

let instance = null;

const connection = mysql.createConnection({
     host: process.env.HOST,
     user: process.env.DB_USER,
     password: process.env.PASSWORD,
     database: process.env.DATABASE,
     port: process.env.DB_PORT
});

connection.connect((err) => {
     if (err) {
        console.log(err.message);
     }
     console.log('db ' + connection.state);
});

// columns used in search results, excluding passwords
// formatted dates to avoid timezone issues
const SAFE_COLUMNS = `
    username, firstname, lastname, salary, age,
    DATE_FORMAT(registerday, '%Y-%m-%d') AS registerday,
    DATE_FORMAT(signintime, '%Y-%m-%d %H:%i:%s') AS signintime
`;

// runs sql queries with parameters
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

class DbService {
    static getDbServiceInstance() {
        if (!instance) instance = new DbService();
        return instance;
    }

    // registration and login

    registerUser(username, passwordHash, firstname, lastname, salary, age) {
        const sql = `
            INSERT INTO Users
            (username, password_hash, firstname, lastname, salary, age, registerday, signintime)
            VALUES (?, ?, ?, ?, ?, ?, CURDATE(), NULL)
        `;
        return runQuery(sql, [username, passwordHash, firstname, lastname, salary, age]);
    }

    async getUserByUsername(username) {
        const rows = await runQuery('SELECT * FROM Users WHERE username = ?', [username]);
        return rows[0];
    }

    updateSignInTime(username) {
        return runQuery('UPDATE Users SET signintime = NOW() WHERE username = ?', [username]);
    }

    // search by first and/or last name
    // null values are ignored in search filters
    searchByName(firstname, lastname) {
        const sql = `
            SELECT ${SAFE_COLUMNS} FROM Users
            WHERE (? IS NULL OR firstname = ?)
              AND (? IS NULL OR lastname = ?)
            ORDER BY lastname, firstname
        `;
        return runQuery(sql, [firstname, firstname, lastname, lastname]);
    }

    // search by username
    searchByUsername(username) {
        const sql = `SELECT ${SAFE_COLUMNS} FROM Users WHERE username = ?`;
        return runQuery(sql, [username]);
    }

    // search by salary range
    searchBySalaryRange(min, max) {
        const sql = `
            SELECT ${SAFE_COLUMNS} FROM Users
            WHERE (? IS NULL OR salary >= ?)
              AND (? IS NULL OR salary <= ?)
            ORDER BY salary
        `;
        return runQuery(sql, [min, min, max, max]);
    }

    // search by age range
    searchByAgeRange(min, max) {
        const sql = `
            SELECT ${SAFE_COLUMNS} FROM Users
            WHERE (? IS NULL OR age >= ?)
              AND (? IS NULL OR age <= ?)
            ORDER BY age
        `;
        return runQuery(sql, [min, min, max, max]);
    }

    // search users who registered after another user
    searchRegisteredAfter(username) {
        const sql = `
            SELECT ${SAFE_COLUMNS} FROM Users
            WHERE registerday > (SELECT registerday FROM Users WHERE username = ?)
            ORDER BY registerday, username
        `;
        return runQuery(sql, [username]);
    }

    // search users who never signed in
    searchNeverSignedIn() {
        const sql = `
            SELECT ${SAFE_COLUMNS} FROM Users
            WHERE signintime IS NULL
            ORDER BY username
        `;
        return runQuery(sql);
    }

    // search users who registered on the same day as another user
    searchSameDay(username) {
        const sql = `
            SELECT ${SAFE_COLUMNS} FROM Users
            WHERE registerday = (SELECT registerday FROM Users WHERE username = ?)
              AND username <> ?
            ORDER BY username
        `;
        return runQuery(sql, [username, username]);
    }

    // search users who registered today
    searchRegisteredToday() {
        const sql = `
            SELECT ${SAFE_COLUMNS} FROM Users
            WHERE registerday = CURDATE()
            ORDER BY username
        `;
        return runQuery(sql);
    }
}

module.exports = DbService;
