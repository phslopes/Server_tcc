// backend/routes/disciplines.js
import express from 'express';
import {
    getAllDisciplines,
    getDisciplineById,
    createDiscipline,
    updateDiscipline,
    deleteDiscipline
} from '../services/disciplineService.js';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all disciplines (Accessible by all roles for viewing)
router.get('/', authenticateToken, authorizeRole(['admin', 'professor', 'aluno']), async (req, res, next) => {
    try {
        const disciplines = await getAllDisciplines();
        res.json(disciplines);
    } catch (error) {
        next(error);
    }
});

// Get discipline by ID
router.get('/:id', authenticateToken, authorizeRole(['admin', 'professor', 'aluno']), async (req, res, next) => {
    try {
        const discipline = await getDisciplineById(req.params.id);
        if (!discipline) {
            return res.status(404).json({ message: 'Disciplina não encontrada' });
        }
        res.json(discipline);
    } catch (error) {
        next(error);
    }
});

// Add a new discipline (RN003 - Admin only)
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const { nome, turno, carga, semestre_curso, curso } = req.body;
        // RN003: validation
        if (!nome || !turno || !carga || !semestre_curso || !curso) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios para o cadastro da disciplina.' });
        }
        const newDiscipline = await createDiscipline(nome, turno, carga, semestre_curso, curso);
        res.status(201).json(newDiscipline);
    } catch (error) {
        // If you have a unique constraint on (nome, turno) in your DB, handle it here
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Já existe uma disciplina com este nome e turno.' });
        }
        next(error);
    }
});

// Update a discipline (Admin only)
router.put('/:id', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const { nome, turno, carga, semestre_curso, curso } = req.body;
        if (!nome || !turno || !carga || !semestre_curso || !curso) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios para atualização da disciplina.' });
        }
        const updated = await updateDiscipline(req.params.id, nome, turno, carga, semestre_curso, curso);
        if (!updated) {
            return res.status(404).json({ message: 'Disciplina não encontrada.' });
        }
        res.json({ message: 'Disciplina atualizada com sucesso.' });
    } catch (error) {
        // If you have a unique constraint on (nome, turno) in your DB, handle it here
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Já existe outra disciplina com este nome e turno.' });
        }
        next(error);
    }
});

// Delete a discipline (Admin only)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const deleted = await deleteDiscipline(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Disciplina não encontrada.' });
        }
        res.json({ message: 'Disciplina deletada com sucesso.' });
    } catch (error) {
        next(error);
    }
});

export default router;