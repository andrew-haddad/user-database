// database services, accessible through DbService methods.

const mysql = require('mysql');
const dotenv = require('dotenv');
dotenv.config(); // read from .env file

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
     console.log('db ' + connection.state); // to see if the DB is connected or not
});

// Columns returned by every search. password_hash is deliberately NOT included.
// Dates are formatted in SQL so the browser never shifts a day because of time zones.
const SAFE_COLUMNS = `
    username, firstname, lastname, salary, age,
    DATE_FORMAT(registerday, '%Y-%m-%d') AS registerday,
    DATE_FORMAT(signintime, '%Y-%m-%d %H:%i:%s') AS signintime
`;

// Runs a query with bound parameters ("?") and returns a promise of the rows.
// User input is never concatenated into the SQL text, which is what prevents SQL injection.
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

class DbService {
    static getDbServiceInstance() { // only one instance is sufficient
        if (!instance) instance = new DbService();
        return instance;
    }

    // ---- 1. registration / 2. sign-in -------------------------------------------------

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

    // ---- 3. search by first and/or last name -------------------------------------------
    // A blank field is passed as null and ignored by the (? IS NULL OR ...) test.
    searchByName(firstname, lastname) {
        const sql = `
            SELECT ${SAFE_COLUMNS} FROM Users
            WHERE (? IS NULL OR firstname = ?)
              AND (? IS NULL OR lastname = ?)
            ORDER BY lastname, firstname
        `;
        return runQuery(sql, [firstname, firstname, lastname, lastname]);
    }

    // ---- 4. search by userid -----------------------------------------------------------
    searchByUsername(username) {
        const sql = `SELECT ${SAFE_COLUMNS} FROM Users WHERE username = ?`;
        return runQuery(sql, [username]);
    }

    // ---- 5. salary between X and Y (a blank bound means "no limit") ---------------------
    searchBySalaryRange(min, max) {
        const sql = `
            SELECT ${SAFE_COLUMNS} FROM Users
            WHERE (? IS NULL OR salary >= ?)
              AND (? IS NULL OR salary <= ?)
            ORDER BY salary
        `;
        return runQuery(sql, [min, min, max, max]);
    }

    // ---- 6. age between X and Y --------------------------------------------------------
    searchByAgeRange(min, max) {
        const sql = `
            SELECT ${SAFE_COLUMNS} FROM Users
            WHERE (? IS NULL OR age >= ?)
              AND (? IS NULL OR age <= ?)
            ORDER BY age
        `;
        return runQuery(sql, [min, min, max, max]);
    }

    // ---- 7. registered after <username> registered -------------------------------------
    searchRegisteredAfter(username) {
        const sql = `
            SELECT ${SAFE_COLUMNS} FROM Users
            WHERE registerday > (SELECT registerday FROM Users WHERE username = ?)
            ORDER BY registerday, username
        `;
        return runQuery(sql, [username]);
    }

    // ---- 8. never signed in ------------------------------------------------------------
    searchNeverSignedIn() {
        const sql = `
            SELECT ${SAFE_COLUMNS} FROM Users
            WHERE signintime IS NULL
            ORDER BY username
        `;
        return runQuery(sql);
    }

    // ---- 9. registered on the same day as <username> (not counting that user) ----------
    searchSameDay(username) {
        const sql = `
            SELECT ${SAFE_COLUMNS} FROM Users
            WHERE registerday = (SELECT registerday FROM Users WHERE username = ?)
              AND username <> ?
            ORDER BY username
        `;
        return runQuery(sql, [username, username]);
    }

    // ---- 10. registered today ----------------------------------------------------------
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
