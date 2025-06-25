import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import professorRoutes from './routes/professors.js';
import disciplineRoutes from './routes/disciplines.js';
import roomRoutes from './routes/rooms.js';
import allocationRoutes from './routes/allocations.js';
import professorDisciplinesRoutes from './routes/professorDisciplines.js'; // Importa a nova rota
import errorHandler from './middleware/errorHandler.js';
import pool from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/professors', professorRoutes);
app.use('/api/disciplines', disciplineRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/professor-disciplines', professorDisciplinesRoutes); // Adiciona a nova rota

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});