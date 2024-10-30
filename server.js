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

const { bullMasterApp } = require('./api/survey/controller'); // Destructure to get bullMasterApp




// Load configuration
const { HOST, PORT, SESS_SECRET } = require("./config/config");

const app = express();
const { dbConnection } = require("./lib/utils/connection.js");

// View engine setup
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

app.use('/admin/queues', bullMasterApp)

// Initialize Apitally
useApitally(app, {
    clientId: "579ffc9c-b5f6-4464-b0d9-e896ab97a4d0",
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

// Create server
const server = require("http").createServer(app);

// Start listening
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});


