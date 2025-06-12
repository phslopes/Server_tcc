// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import professorRoutes from './routes/professors.js';
import disciplineRoutes from './routes/disciplines.js';
import roomRoutes from './routes/rooms.js';
import allocationRoutes from './routes/allocations.js';
import errorHandler from './middleware/errorHandler.js';
import pool from './config/db.js'; // Import pool to ensure connection is established on start

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON request bodies

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/professors', professorRoutes);
app.use('/api/disciplines', disciplineRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/allocations', allocationRoutes);

// Centralized error handling middleware
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});