const express = require("express");
const session = require("express-session");
const passport = require('passport');
const RedisStore = require('connect-redis').default; // Use Redis store for sessions
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const bodyParser = require('body-parser');
require("dotenv").config();

const redisClient = require('./config/redis.js'); // Adjust the path based on your file structure

const { HOST, PORT, SESS_SECRET } = require("./config/config");

const app = express();
let { dbConnection } = require("./lib/utils/connection.js");

app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

// Session middleware with Redis
const sessionStore = new RedisStore({ client: redisClient });

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
  .catch((err) => {
    console.log("Error in connection:", err);
  });

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(morgan("dev"));
app.use(helmet());

const corsOptions = {
  origin: "*",
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.get("/", (req, res) => {
  res.send("API Running");
});

// Import routes
require("./routes")(app);

// Create server
let server = require("http").createServer(app);

// Start listening
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

