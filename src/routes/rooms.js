// backend/routes/rooms.js
import express from 'express';
import {
    getAllRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom
} from '../services/roomService.js';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all rooms (Accessible by all roles for viewing)
router.get('/', authenticateToken, authorizeRole(['admin', 'professor', 'aluno']), async (req, res, next) => {
    try {
        const rooms = await getAllRooms();
        res.json(rooms);
    } catch (error) {
        next(error);
    }
});

// Get room by ID
router.get('/:id', authenticateToken, authorizeRole(['admin', 'professor', 'aluno']), async (req, res, next) => {
    try {
        const room = await getRoomById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: 'Sala não encontrada' });
        }
        res.json(room);
    } catch (error) {
        next(error);
    }
});

// Add a new room (RN005 - Admin only)
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const { numero_sala, tipo_sala } = req.body;
        if (!numero_sala || !tipo_sala) {
            return res.status(400).json({ message: 'Número da sala e tipo são obrigatórios.' });
        }
        if (!['Sala', 'Laboratório'].includes(tipo_sala)) {
            return res.status(400).json({ message: 'Tipo de sala inválido. Deve ser "Sala" ou "Laboratório".' });
        }
        // RN005: status is set to 'Livre' by default in the service
        const newRoom = await createRoom(numero_sala, tipo_sala);
        res.status(201).json(newRoom);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('numero_sala')) {
            return res.status(409).json({ message: 'Já existe uma sala com este número.' });
        }
        next(error);
    }
});

// Update a room (Admin only)
router.put('/:id', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const { numero_sala, tipo_sala, status } = req.body;
        if (!numero_sala || !tipo_sala || !status) {
            return res.status(400).json({ message: 'Número da sala, tipo e status são obrigatórios para atualização.' });
        }
        if (!['Sala', 'Laboratório'].includes(tipo_sala)) {
            return res.status(400).json({ message: 'Tipo de sala inválido. Deve ser "Sala" ou "Laboratório".' });
        }
        if (!['Livre', 'Ocupada'].includes(status)) {
            return res.status(400).json({ message: 'Status inválido. Deve ser "Livre" ou "Ocupada".' });
        }
        const updated = await updateRoom(req.params.id, numero_sala, tipo_sala, status);
        if (!updated) {
            return res.status(404).json({ message: 'Sala não encontrada.' });
        }
        res.json({ message: 'Sala atualizada com sucesso.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('numero_sala')) {
            return res.status(409).json({ message: 'Já existe outra sala com este número.' });
        }
        next(error);
    }
});

// Delete a room (Admin only)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const deleted = await deleteRoom(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Sala não encontrada.' });
        }
        res.json({ message: 'Sala deletada com sucesso.' });
    } catch (error) {
        next(error);
    }
});

export default router;