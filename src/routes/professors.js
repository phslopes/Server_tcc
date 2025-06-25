import express from 'express';
import {
    getAllProfessors,
    getProfessorById,
    createProfessor,
    updateProfessor,
    deleteProfessor
} from '../services/professorService.js';
import { getAllProfessorDisciplineAssociations } from '../services/professorDisciplineService.js';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, authorizeRole(['admin', 'professor', 'aluno']), async (req, res, next) => {
    try {
        const professors = await getAllProfessors();
        res.json(professors);
    } catch (error) {
        next(error);
    }
});

router.get('/:id', authenticateToken, authorizeRole(['admin', 'professor', 'aluno']), async (req, res, next) => {
    try {
        const professor = await getProfessorById(req.params.id);
        if (!professor) {
            return res.status(404).json({ message: 'Professor not found' });
        }
        res.json(professor);
    } catch (error) {
        next(error);
    }
});

// professor (RN004 - Admin)
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const { nome, email, telefone } = req.body;
        if (!nome || !email || !telefone) { // Basic validation as per RN004
            return res.status(400).json({ message: 'Nome, email e telefone são obrigatórios.' });
        }
        const newProfessor = await createProfessor(nome, email, telefone);
        res.status(201).json(newProfessor);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('email')) {
            return res.status(409).json({ message: 'Email já cadastrado.' });
        }
        next(error);
    }
});

// professor (Admin)
router.put('/:id', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const { nome, email, telefone } = req.body;
        if (!nome || !email || !telefone) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios para atualização.' });
        }
        const updated = await updateProfessor(req.params.id, nome, email, telefone);
        if (!updated) {
            return res.status(404).json({ message: 'Professor não encontrado.' });
        }
        res.json({ message: 'Professor atualizado com sucesso.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('email')) {
            return res.status(409).json({ message: 'Email já cadastrado.' });
        }
        next(error);
    }
});

// Deleta professor (Admin)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const deleted = await deleteProfessor(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Professor não encontrado.' });
        }
        res.json({ message: 'Professor deletado com sucesso.' });
    } catch (error) {
        next(error);
    }
});

// professor disciplina
router.get('/:id/disciplines', authenticateToken, authorizeRole(['admin', 'professor', 'aluno']), async (req, res, next) => {
    try {
        const professorId = parseInt(req.params.id);
        const filters = { idProfessor: professorId };
        const disciplines = await getAllProfessorDisciplineAssociations(filters);
        res.json(disciplines);
    } catch (error) {
        next(error);
    }
});

export default router;