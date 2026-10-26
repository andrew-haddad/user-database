// Backend: application services, accessible by URIs


const express = require('express')
const cors = require ('cors')
const dotenv = require('dotenv')
const bcrypt = require('bcrypt');
const session = require('express-session');
dotenv.config()

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

// create
app.post('/insert', (request, response) => {
    console.log("app: insert a row.");
    // console.log(request.body); 

    const {name} = request.body;
    const db = dbService.getDbServiceInstance();

    const result = db.insertNewName(name);
 
    // note that result is a promise
    result 
    .then(data => response.json({data: data})) // return the newly added row to frontend, which will show it
   // .then(data => console.log({data: data})) // debug first before return by response
   .catch(err => console.log(err));
});




// read 
app.get('/getAll', (request, response) => {
    
    const db = dbService.getDbServiceInstance();

    
    const result =  db.getAllData(); // call a DB function

    result
    .then(data => response.json({data: data}))
    .catch(err => console.log(err));
});


app.get('/search/:name', (request, response) => { // we can debug by URL
    
    const {name} = request.params;
    
    console.log(name);

    const db = dbService.getDbServiceInstance();

    let result;
    if(name === "all") // in case we want to search all
       result = db.getAllData()
    else 
       result =  db.searchByName(name); // call a DB function

    result
    .then(data => response.json({data: data}))
    .catch(err => console.log(err));
});


// update
app.patch('/update', 
     (request, response) => {
          console.log("app: update is called");
          //console.log(request.body);
          const{id, name} = request.body;
          console.log(id);
          console.log(name);
          const db = dbService.getDbServiceInstance();

          const result = db.updateNameById(id, name);

          result.then(data => response.json({success: true}))
          .catch(err => console.log(err)); 

     }
);

// delete service
app.delete('/delete/:id', 
     (request, response) => {     
        const {id} = request.params;
        console.log("delete");
        console.log(id);
        const db = dbService.getDbServiceInstance();

        const result = db.deleteRowById(id);

        result.then(data => response.json({success: true}))
        .catch(err => console.log(err));
     }
)   

// debug function, will be deleted later
app.post('/debug', (request, response) => {
    // console.log(request.body); 

    const {debug} = request.body;
    console.log(debug);

    return response.json({success: true});
});   

// debug function: use http://localhost:5050/testdb to try a DB function
// should be deleted finally
app.get('/testdb', (request, response) => {
    
    const db = dbService.getDbServiceInstance();

    
    const result =  db.deleteById("14"); // call a DB function here, change it to the one you want

    result
    .then(data => response.json({data: data}))
    .catch(err => console.log(err));
});


// set up the web server listener
// if we use .env to configure
/*
app.listen(process.env.PORT, 
    () => {
        console.log("I am listening on the configured port " + process.env.PORT)
    }
);
*/

// if we configure here directly
app.listen(5050, 
    () => {
        console.log("I am listening on the fixed port 5050.")
    }
);
