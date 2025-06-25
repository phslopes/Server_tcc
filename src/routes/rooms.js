import express from 'express';
import {
    getAllRooms,
    getRoomByCompositeKey, // Nova função para GET by PK
    createRoom,
    updateRoom,
    deleteRoom
} from '../services/roomService.js';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware.js';

const router = express.Router();


router.get('/', authenticateToken, authorizeRole(['admin', 'professor', 'aluno']), async (req, res, next) => {
    try {
        const rooms = await getAllRooms();
        res.json(rooms);
    } catch (error) {
        next(error);
    }
});

router.get('/:numeroSala/:tipoSala', authenticateToken, authorizeRole(['admin', 'professor', 'aluno']), async (req, res, next) => {
    try {
        const { numeroSala, tipoSala } = req.params;
        const room = await getRoomByCompositeKey(parseInt(numeroSala), tipoSala); // Converte numeroSala para INT
        if (!room) {
            return res.status(404).json({ message: 'Sala não encontrada' });
        }
        res.json(room);
    } catch (error) {
        next(error);
    }
});

//sala (RN005 - Admin)
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const { numero_sala, tipo_sala } = req.body;
        if (!numero_sala || !tipo_sala) {
            return res.status(400).json({ message: 'Número da sala e tipo são obrigatórios.' });
        }
        // ENUM tipo_sala em lowercase
        if (!['sala', 'laboratorio'].includes(tipo_sala.toLowerCase())) {
            return res.status(400).json({ message: 'Tipo de sala inválido. Deve ser "sala" ou "laboratorio".' });
        }
        // RN005: status é setado para 'livre' por default no serviço
        const newRoom = await createRoom(numero_sala, tipo_sala.toLowerCase());
        res.status(201).json(newRoom);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('PRIMARY')) {
            return res.status(409).json({ message: 'Já existe uma sala com este número e tipo.' });
        }
        next(error);
    }
});

// Alteração: sala (Admin )
router.put('/:oldNumeroSala/:oldTipoSala', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const { oldNumeroSala, oldTipoSala } = req.params;
        const { numero_sala, tipo_sala, status } = req.body; // Novas informações
        if (!numero_sala || !tipo_sala || !status) {
            return res.status(400).json({ message: 'Número da sala, tipo e status são obrigatórios para atualização.' });
        }
        // ENUM tipo_sala e status em lowercase
        if (!['sala', 'laboratorio'].includes(tipo_sala.toLowerCase())) {
            return res.status(400).json({ message: 'Tipo de sala inválido. Deve ser "sala" ou "laboratorio".' });
        }
        if (!['livre', 'ocupada'].includes(status.toLowerCase())) {
            return res.status(400).json({ message: 'Status inválido. Deve ser "livre" ou "ocupada".' });
        }
        const updated = await updateRoom(parseInt(oldNumeroSala), oldTipoSala.toLowerCase(), parseInt(numero_sala), tipo_sala.toLowerCase(), status.toLowerCase());
        if (!updated) {
            return res.status(404).json({ message: 'Sala não encontrada ou dados idênticos.' });
        }
        res.json({ message: 'Sala atualizada com sucesso.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('PRIMARY')) {
            return res.status(409).json({ message: 'Já existe outra sala com este número e tipo após a atualização.' });
        }
        next(error);
    }
});

// Alteração: sala (Admin)
router.delete('/:numeroSala/:tipoSala', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const { numeroSala, tipoSala } = req.params;
        const deleted = await deleteRoom(parseInt(numeroSala), tipoSala.toLowerCase());
        if (!deleted) {
            return res.status(404).json({ message: 'Sala não encontrada.' });
        }
        res.json({ message: 'Sala deletada com sucesso.' });
    } catch (error) {
        next(error);
    }
});

export default router;