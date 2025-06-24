import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// Test database connection
pool
  .getConnection()
  .then(connection => {
    console.log('Successfully connected to the database.')
    connection.release()
  })
  .catch(err => {
    console.error('Database connection failed:', err.stack)
    process.exit(1) // Exit process if database connection fails
  })

export default pool
