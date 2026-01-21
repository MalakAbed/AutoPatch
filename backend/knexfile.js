// backend/knexfile.js
const path = require('path');

const common = {
  migrations: {
    directory: './data/migrations',
  },
};

module.exports = {
  development: {
    ...common,
    client: 'sqlite3',
    connection: {
      filename: path.resolve(__dirname, 'database.sqlite'),
    },
    useNullAsDefault: true,
  },

  production: {
    ...common,
    client: 'pg',
    connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    },
    pool: { min: 0, max: 10 },
  },
};