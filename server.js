require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import CORS middleware
const sql = require('mssql');

// Initialize Express app
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// SQL Server configuration using .env variables
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true', // Convert string to boolean
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true', // Convert string to boolean
  },
  connectionTimeout: parseInt(process.env.DB_TIMEOUT, 10) || 30000,
};

// Connect to the database
sql.connect(dbConfig, (err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    console.log('Connected to the database');
  }
});

// CORS Preflight Configuration
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// API Endpoint: Get all contacts
app.get('/contacts', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query('SELECT * FROM Contacts');
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching contacts:', err.message);
    res.status(500).send('Error fetching contacts');
  }
});

// API Endpoint: Add a new contact
app.post('/contacts', async (req, res) => {
  const { name, company, position, email, phone, category, lastInteractionDate, notes } = req.body;

  try {
    const pool = await sql.connect(dbConfig);
    const query = `
      INSERT INTO Contacts (Name, Company, Position, Email, Phone, Category, LastInteractionDate, Notes)
      VALUES (@name, @company, @position, @Email, @phone, @category, @lastInteractionDate, @notes)
    `;

    await pool
      .request()
      .input('name', sql.NVarChar, name)
      .input('company', sql.NVarChar, company || null)
      .input('position', sql.NVarChar, position || null)
      .input('email', sql.NVarChar, email)
      .input('phone', sql.NVarChar, phone || null)
      .input('category', sql.NVarChar, category)
      .input('lastInteractionDate', sql.DateTime, lastInteractionDate || null)
      .input('notes', sql.NVarChar, notes || null)
      .query(query);

    res.status(201).send('Contact added successfully!');
  } catch (err) {
    console.error('Error adding contact:', err.message);
    res.status(500).send('Error adding contact');
  }
});

// API Endpoint: Update Reminder Date
app.put('/contacts/:id/reminder', async (req, res) => {
  const { id } = req.params;
  const { reminderDate } = req.body;

  try {
    const pool = await sql.connect(dbConfig);
    await pool
      .request()
      .input('Id', sql.Int, id)
      .input('ReminderDate', sql.DateTime, reminderDate || null)
      .query(`
        UPDATE Contacts
        SET ReminderDate = @ReminderDate
        WHERE Id = @Id
      `);

    res.status(200).send('Reminder date updated successfully');
  } catch (err) {
    console.error('Error updating reminder date:', err.message);
    res.status(500).send('Error updating reminder date');
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
