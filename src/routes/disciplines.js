import express from 'express';
import {
    getAllDisciplines,
    getDisciplineByCompositeKey,
    createDiscipline,
    updateDiscipline,
    deleteDiscipline
} from '../services/disciplineService.js';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, authorizeRole(['admin', 'professor', 'aluno']), async (req, res, next) => {
    try {
        const disciplines = await getAllDisciplines();
        res.json(disciplines);
    } catch (error) {
        next(error);
    }
});

router.get('/:nome/:turno', authenticateToken, authorizeRole(['admin', 'professor', 'aluno']), async (req, res, next) => {
    try {
        const { nome, turno } = req.params;
        const discipline = await getDisciplineByCompositeKey(nome, turno);
        if (!discipline) {
            return res.status(404).json({ message: 'Disciplina não encontrada' });
        }
        res.json(discipline);
    } catch (error) {
        next(error);
    }
});

//(RN003 - Admin)
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const { nome, turno, carga, semestre_curso, curso } = req.body;
        if (!nome || !turno || !carga || !semestre_curso || !curso) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios para o cadastro da disciplina.' });
        }
        const newDiscipline = await createDiscipline(nome, turno, carga, semestre_curso, curso);
        res.status(201).json(newDiscipline);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('PRIMARY')) {
            return res.status(409).json({ message: 'Já existe uma disciplina com este nome e turno.' });
        }
        next(error);
    }
});

// Alteração:(Admin)
router.put('/:oldNome/:oldTurno', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const { oldNome, oldTurno } = req.params; // Parâmetros da URL para identificar o registro
        const { nome, turno, carga, semestre_curso, curso } = req.body; // Novos dados da disciplina (podem incluir novo nome/turno)

        if (!nome || !turno || !carga || !semestre_curso || !curso) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios para atualização da disciplina.' });
        }

        const updated = await updateDiscipline(oldNome, oldTurno, nome, turno, carga, semestre_curso, curso);

        if (!updated) {
            return res.status(404).json({ message: 'Disciplina não encontrada ou dados idênticos.' });
        }
        res.json({ message: 'Disciplina atualizada com sucesso.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('PRIMARY')) {
            return res.status(409).json({ message: 'Já existe outra disciplina com este nome e turno após a atualização.' });
        }
        next(error);
    }
});

// Alteração (Admin)
router.delete('/:nome/:turno', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const { nome, turno } = req.params;
        const deleted = await deleteDiscipline(nome, turno);
        if (!deleted) {
            return res.status(404).json({ message: 'Disciplina não encontrada.' });
        }
        res.json({ message: 'Disciplina deletada com sucesso.' });
    } catch (error) {
        next(error);
    }
});

export default router;