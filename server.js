const express = require("express");
const session = require("express-session");
const passport = require('passport');
const RedisStore = require('connect-redis').default;
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const bodyParser = require('body-parser');
const { useApitally } = require("apitally/express");
const Queue = require('bull');
const redisClient = require('./config/redis.js'); // Adjust the path based on your file structure
require("dotenv").config();

require('./clean.js');

const logger = require('./lib/utils/logger.js');

const { bullMasterApp } = require('./api/survey/controller'); // Destructure to get bullMasterApp




// Load configuration
const { HOST, SESS_SECRET } = require("./config/config");

const app = express();

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true, parameterLimit: 50000}));

app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`); // Log requests
    next();
});


app.use((err, req, res, next) => {
    // Log detailed error information
    logger.error({
        message: err.message,
        status: err.status || 500,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
    }, 'An error occurred');

    // Respond with a generic message
    res.status(err.status || 500).send('Internal Server Error');
});



const { dbConnection } = require("./lib/utils/connection.js");




// View engine setup
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

app.use('/admin/queues', bullMasterApp)

// Initialize Apitally
useApitally(app, {
    clientId: "d898a789-d561-491c-8a66-e960fdb1200d",
    env: "dev",
});




// Set up Redis session store
const sessionStore = new RedisStore({ client: redisClient });

// Session middleware
const MAX_AGE = 1000 * 60 * 60 * 3; // Three hours
app.use(session({
    store: sessionStore,
    secret: SESS_SECRET,
    saveUninitialized: true,
    cookie: { maxAge: MAX_AGE },
    resave: false
}));

// Database connection
dbConnection()
    .then(() => console.log('DB connected'))
    .catch((err) => console.log("Error in connection:", err));

// Middleware setup
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));
app.use(helmet());
app.use(cors({ origin: "*", credentials: true, optionsSuccessStatus: 200 }));

// Routes
app.get("/", (req, res) => {
    res.send("API Running");
});

// Import routes
require("./routes")(app);

// Bull Master for admin interface
// app.use('/admin/queues', bullMasterApp);

const PORT = process.env.PORT || 4000;  // Fallback to 4000 if PORT is not set

const server = require("http").createServer(app);

// Bind to 0.0.0.0 to allow access from other devices on the network
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is listening on port ${PORT}`);
});

