const express = require('express')
const cors = require ('cors')
const dotenv = require('dotenv')
const bcrypt = require('bcrypt');
const session = require('express-session');
dotenv.config()

if (!process.env.SESSION_SECRET) {
    console.error('Missing SESSION_SECRET. Copy dotenv.example to .env and fill it in.');
    process.exit(1);
}

const app = express();

const dbService = require('./dbService');


app.use(cors({
    origin: 'http://localhost',
    credentials: true
}));
app.use(express.json())
app.use(express.urlencoded({extended: false}));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax'
    }
}));

app.post('/register', async (request, response) => {
    try {
        const { username, password, firstname, lastname, salary, age } = request.body;

        if (
            typeof username !== 'string' ||
            username.trim() === '' ||
            typeof password !== 'string' ||
            password === '' ||
            typeof firstname !== 'string' ||
            firstname.trim() === '' ||
            typeof lastname !== 'string' ||
            lastname.trim() === ''
        ) {
            return response.status(400).json({
                success: false,
                message: 'Please fill out all the required fields.'
            });
        }

        if (
            typeof salary !== 'number' ||
            !Number.isFinite(salary) ||
            salary < 0 ||
            typeof age !== 'number' ||
            !Number.isInteger(age) ||
            age < 0
        ) {
            return response.status(400).json({
                success: false,
                message: 'Please enter a valid salary and age.'
            });
        }

        if (
            username.length > 50 ||
            firstname.length > 50 ||
            lastname.length > 50 ||
            salary >= 100000000
        ) {
            return response.status(400).json({
                success: false,
                message: 'One or more of the fields surpass the maximum limit.'
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const db = dbService.getDbServiceInstance();

        await db.registerUser(username, passwordHash, firstname, lastname, salary, age);

        return response.status(201).json({
            success: true,
            message: 'User registered successfully!'
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return response.status(409).json({
                success: false,
                message: 'Username already exists.'
            });
        }

        console.error(error);

        return response.status(500).json({
            success: false,
            message: 'Registration failed.'
        });
    }
});

app.post('/login', async (request, response) => {
    try {
        const { username, password } = request.body;

        if (
            typeof username !== 'string' ||
            username.trim() === '' ||
            typeof password !== 'string' ||
            password === ''
        ) {
            return response.status(400).json({
                success: false,
                message: 'Please enter a username and password.'
            });
        }

        const db = dbService.getDbServiceInstance();
        const user = await db.getUserByUsername(username);

        if (!user) {
            return response.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return response.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        await db.updateSignInTime(username);
        request.session.username = username;

        return response.status(200).json({
            success: true,
            message: 'Login successful!'
        });

    } catch (error) {
        console.error(error);

        return response.status(500).json({
            success: false,
            message: 'Login failed.'
        });
    }
});

app.get('/session', (request, response) => {
    if (request.session.username) {
        return response.json({
            authenticated: true,
            username: request.session.username
        });
    } else {
        return response.json({
            authenticated: false
        });
    }
});

app.post('/logout', (request, response) => {
    request.session.destroy((error) => {
        if (error) {
            console.error(error);
            return response.status(500).json({
                success: false,
                message: 'Logout failed.'
            });
        }

        response.clearCookie('connect.sid');

        return response.json({
            success: true,
            message: 'Logged out successfully.'
        });
    });
});

// Search routes

function requireAuth(request, response, next) {
    if (!request.session.username) {
        return response.status(401).json({
            success: false,
            message: 'Please sign in first.'
        });
    }
    next();
}


function handler(fn) {
    return async (request, response) => {
        try {
            const data = await fn(request, response);
            // avoids sending second error response if one was already sent
            if (!response.headersSent) {
                response.json({ success: true, data: data });
            }
        } catch (error) {
            console.error(error);
            response.status(500).json({ success: false, message: 'Search failed.' });
        }
    };
}

// return null for missing inputs
function textOrNull(value) {
    if (typeof value !== 'string' || value.trim() === '') return null;
    return value.trim();
}

// convert input to number and check validity
function numberOrNull(value) {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function badRequest(response, message) {
    response.status(400).json({ success: false, message: message });
}

const db = () => dbService.getDbServiceInstance();

// search by first and/or last name
app.get('/search/name', requireAuth, handler(async (request, response) => {
    const firstname = textOrNull(request.query.firstname);
    const lastname = textOrNull(request.query.lastname);
    if (firstname === null && lastname === null) {
        return badRequest(response, 'Enter a first name, a last name, or both.');
    }
    return db().searchByName(firstname, lastname);
}));

// search by username
app.get('/search/username', requireAuth, handler(async (request, response) => {
    const username = textOrNull(request.query.username);
    if (username === null) return badRequest(response, 'Enter a username.');
    return db().searchByUsername(username);
}));

// search salary between X and Y
app.get('/search/salary', requireAuth, handler(async (request, response) => {
    const min = numberOrNull(request.query.min);
    const max = numberOrNull(request.query.max);
    if (min === undefined || max === undefined) {
        return badRequest(response, 'Salary must be a non-negative number.');
    }
    if (min === null && max === null) return badRequest(response, 'Enter a minimum, a maximum, or both.');
    if (min !== null && max !== null && min > max) {
        return badRequest(response, 'Minimum salary cannot be greater than the maximum.');
    }
    return db().searchBySalaryRange(min, max);
}));

// search age between X and Y
app.get('/search/age', requireAuth, handler(async (request, response) => {
    const min = numberOrNull(request.query.min);
    const max = numberOrNull(request.query.max);
    if (min === undefined || max === undefined) {
        return badRequest(response, 'Age must be a non-negative number.');
    }
    if (min === null && max === null) return badRequest(response, 'Enter a minimum, a maximum, or both.');
    if (min !== null && max !== null && min > max) {
        return badRequest(response, 'Minimum age cannot be greater than the maximum.');
    }
    return db().searchByAgeRange(min, max);
}));

// search users who registered after <username> registered
app.get('/search/registered-after', requireAuth, handler(async (request, response) => {
    const username = textOrNull(request.query.username);
    if (username === null) return badRequest(response, 'Enter a username.');
    if (!(await db().getUserByUsername(username))) {
        return response.status(404).json({ success: false, message: `User "${username}" does not exist.` });
    }
    return db().searchRegisteredAfter(username);
}));

// search users who never signed in
app.get('/search/never-signed-in', requireAuth, handler(async () => {
    return db().searchNeverSignedIn();
}));

// search users who registered on the same day as <username>
app.get('/search/same-day', requireAuth, handler(async (request, response) => {
    const username = textOrNull(request.query.username);
    if (username === null) return badRequest(response, 'Enter a username.');
    if (!(await db().getUserByUsername(username))) {
        return response.status(404).json({ success: false, message: `User "${username}" does not exist.` });
    }
    return db().searchSameDay(username);
}));

// search users who registered today
app.get('/search/today', requireAuth, handler(async () => {
    return db().searchRegisteredToday();
}));


app.listen(process.env.PORT || 5050,
    () => {
        console.log("I am listening on port " + (process.env.PORT || 5050));
    }
);
