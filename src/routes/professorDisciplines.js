// backend/routes/professorDisciplines.js
import express from 'express';
import {
    getAllProfessorDisciplineAssociations,
    createProfessorDisciplineAssociation,
    getProfessorDisciplineAssociationByCompositeKey,
    updateProfessorDisciplineAssociation,
    deleteProfessorDisciplineAssociation
} from '../services/professorDisciplineService.js';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Obter todas as associações (Admin pode ver tudo, Professor só as suas)
router.get('/', authenticateToken, authorizeRole(['admin', 'professor']), async (req, res, next) => {
    try {
        if (req.user.role === 'admin') {
            const associations = await getAllProfessorDisciplineAssociations();
            return res.json(associations);
        } else if (req.user.role === 'professor') {
            // Se for professor, filtra pelas suas próprias associações (RN002)
            const associations = (await getAllProfessorDisciplineAssociations()).filter(
                (assoc) => assoc.id_professor === req.user.id
            );
            return res.json(associations);
        }
        res.status(403).json({ message: 'Acesso negado.' });
    } catch (error) {
        next(error);
    }
});

// Criar uma nova associação (Admin only)
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const { id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio } = req.body;
        if (!id_professor || !nome || !turno || !ano || !semestre_alocacao) {
            return res.status(400).json({ message: 'Campos essenciais para associação professor-disciplina são obrigatórios.' });
        }
        const newAssociation = await createProfessorDisciplineAssociation(id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio);
        res.status(201).json(newAssociation);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('PRIMARY')) {
            return res.status(409).json({ message: 'Associação professor-disciplina já existe para este ano/semestre.' });
        }
        next(error);
    }
});

// Obter associação específica por chave composta (Admin, Professor)
router.get('/:idProfessor/:nomeDisc/:turnoDisc/:ano/:semestreAlocacao', authenticateToken, authorizeRole(['admin', 'professor']), async (req, res, next) => {
    try {
        const { idProfessor, nomeDisc, turnoDisc, ano, semestreAlocacao } = req.params;
        const association = await getProfessorDisciplineAssociationByCompositeKey(
            parseInt(idProfessor), nomeDisc, turnoDisc, parseInt(ano), parseInt(semestreAlocacao)
        );
        if (!association) {
            return res.status(404).json({ message: 'Associação não encontrada.' });
        }
        // RN002: Professores só podem ver suas próprias associações
        if (req.user.role === 'professor' && association.id_professor !== req.user.id) {
             return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para ver esta associação.' });
        }
        res.json(association);
    } catch (error) {
        next(error);
    }
});


// Atualizar associação (Admin only)
router.put('/:oldIdProfessor/:oldNomeDisc/:oldTurnoDisc/:oldAno/:oldSemestreAlocacao', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const { oldIdProfessor, oldNomeDisc, oldTurnoDisc, oldAno, oldSemestreAlocacao } = req.params;
        const { id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio } = req.body; // Novas informações
        if (!id_professor || !nome || !turno || !ano || !semestre_alocacao) {
             return res.status(400).json({ message: 'Campos essenciais para atualização da associação são obrigatórios.' });
        }
        const updated = await updateProfessorDisciplineAssociation(
            parseInt(oldIdProfessor), oldNomeDisc, oldTurnoDisc, parseInt(oldAno), parseInt(oldSemestreAlocacao),
            parseInt(id_professor), nome, turno, parseInt(ano), parseInt(semestre_alocacao),
            dia_semana, hora_inicio
        );
        if (!updated) {
            return res.status(404).json({ message: 'Associação não encontrada ou dados idênticos.' });
        }
        res.json({ message: 'Associação atualizada com sucesso.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('PRIMARY')) {
            return res.status(409).json({ message: 'A nova associação já existe.' });
        }
        next(error);
    }
});

// Deletar associação (Admin only)
router.delete('/:idProfessor/:nomeDisc/:turnoDisc/:ano/:semestreAlocacao', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const { idProfessor, nomeDisc, turnoDisc, ano, semestreAlocacao } = req.params;
        const deleted = await deleteProfessorDisciplineAssociation(
            parseInt(idProfessor), nomeDisc, turnoDisc, parseInt(ano), parseInt(semestreAlocacao)
        );
        if (!deleted) {
            return res.status(404).json({ message: 'Associação não encontrada.' });
        }
        res.json({ message: 'Associação deletada com sucesso.' });
    } catch (error) {
        next(error);
    }
});

export default router;