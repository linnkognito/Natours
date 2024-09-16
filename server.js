const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Uncaught exceptions:
process.on('uncaughtException', (err) => {
  console.log('❌ UNCAUGHT EXCEPTION ❌ Shutting down...');
  // Mine
  console.error(err.name, err.message);
  console.error(err.stack);

  process.exit(1);
});

// Reads variables from file and saves them as environmental:
dotenv.config({ path: './config.env' });

// Now the app has access to the env vars:
const app = require('./app');

// Gets connection string and replaces the password placeholder
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

// Connecting
mongoose
  .connect(DB)
  .then(() => {
    console.log('DB connection successful');
  })
  .catch((err) => {
    //mine
    console.error('DB connection error:', err);
  });

const port = process.env.PORT || 10000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}`);
});

// Unhandled promise rejections:
process.on('unhandledRejection', (err) => {
  console.log('❌ UNHANDLED REJECTION ❌ Shutting down...');
  console.log(err.name, err.message);

  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully.');
  server.close(() => {
    console.log('❌ Process terminated!');
  });
});
