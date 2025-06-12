// backend/routes/allocations.js
import express from 'express';
import {
    createAllocation,
    getAllAllocations,
    getAllocationsByProfessor,
    updateAllocationStatus,
    deleteAllocation
} from '../services/allocationService.js';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all allocations (Admin can see all, others only theirs)
router.get('/', authenticateToken, authorizeRole(['admin', 'professor', 'aluno']), async (req, res, next) => {
    try {
        if (req.user.role === 'admin' || req.user.role === 'aluno') {
            const allocations = await getAllAllocations();
            return res.json(allocations);
        } else if (req.user.role === 'professor') {
            // Assuming id_user in JWT matches id_professor in the DB
            const allocations = await getAllocationsByProfessor(req.user.id);
            return res.json(allocations);
        }
    } catch (error) {
        next(error);
    }
});

// Request a new allocation (RN006, RN007 - Professor only)
router.post('/', authenticateToken, authorizeRole(['professor']), async (req, res, next) => {
    try {
        const { id_sala, id_disciplina, ano, semestre_alocacao, dia_semana, hora_inicio, hora_fim, tipo_alocacao } = req.body;
        const id_professor = req.user.id; // Get professor ID from authenticated user

        // Basic validation
        if (!id_sala || !id_disciplina || !ano || !semestre_alocacao || !dia_semana || !hora_inicio || !hora_fim || !tipo_alocacao) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios para a solicitação de alocação.' });
        }
        if (!['esporadico', 'fixo'].includes(tipo_alocacao)) { // RN006
            return res.status(400).json({ message: 'Tipo de alocação inválido. Deve ser "esporadico" ou "fixo".' });
        }

        const newAllocation = await createAllocation(
            id_sala,
            id_professor,
            id_disciplina,
            ano,
            semestre_alocacao,
            dia_semana,
            hora_inicio,
            hora_fim,
            tipo_alocacao
        );
        res.status(201).json(newAllocation);
    } catch (error) {
        res.status(400).json({ message: error.message }); // Send specific error messages like "Sala já ocupada"
    }
});

// Update allocation status (Admin only)
router.put('/:id/status', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!['Confirmada', 'Pendente', 'Cancelada'].includes(status)) {
            return res.status(400).json({ message: 'Status de alocação inválido.' });
        }
        const updated = await updateAllocationStatus(req.params.id, status);
        if (!updated) {
            return res.status(404).json({ message: 'Alocação não encontrada.' });
        }
        res.json({ message: 'Status da alocação atualizado com sucesso.' });
    } catch (error) {
        next(error);
    }
});

// Delete an allocation (Admin only)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const deleted = await deleteAllocation(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Alocação não encontrada.' });
        }
        res.json({ message: 'Alocação deletada com sucesso.' });
    } catch (error) {
        next(error);
    }
});

export default router;