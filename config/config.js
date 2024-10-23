require("dotenv").config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  HOST: process.env.HOST,
  DB_URI: process.env.DB_URI,
  SESS_SECRET: process.env.SESS_SECRET,
  COOKIE_NAME: process.env.COOKIE_NAME,
  TOKEN_SECRET: process.env.TOKEN_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
};
