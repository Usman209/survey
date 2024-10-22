const express = require("express");
const session = require("express-session");
const passport = require('passport');
const MongoDBStore = require("connect-mongodb-session")(session);
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser')



const app = express();
require("dotenv").config();


const { HOST, PORT,SESS_SECRET } = require("./config/config");

// 
let { dbConnection } = require("./lib/utils/connection.js");

app.set('view engine', 'ejs');

app.use(bodyParser.json())
app.use('/uploads', express.static('uploads'));

const MAX_AGE = 1000 * 60 * 60 * 3; // Three hours
//session middleware
app.use(session({
  secret: SESS_SECRET,
  saveUninitialized:true,
  cookie: { maxAge: MAX_AGE },
  resave: false
}));

dbConnection()
  .then(() => 
  .catch((err) => {
    
    // 
  });

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(morgan("dev"));

app.use(helmet());

const corsOptions = {
  origin: "*",
  credentials: true,
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
}

app.use(cors(corsOptions));

app.get("/", (req, res) => {
  
  res.send("Api Running");
});

require("./routes")(app);
let server = require("http").createServer(app);

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
