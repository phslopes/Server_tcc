// backend/services/roomService.js
import pool from '../config/db.js';

const getAllRooms = async () => {
    const [rows] = await pool.execute('SELECT numero_sala, tipo_sala, status FROM sala');
    return rows;
};

// Alteração: Get por chave composta (numero_sala, tipo_sala)
const getRoomByCompositeKey = async (numero_sala, tipo_sala) => {
    const [rows] = await pool.execute('SELECT numero_sala, tipo_sala, status FROM sala WHERE numero_sala = ? AND tipo_sala = ?', [numero_sala, tipo_sala]);
    return rows[0];
};

const createRoom = async (numero_sala, tipo_sala) => { // RN005
    // RN005: Uma sala sempre é cadastrada como livre. ENUM status em lowercase
    const status = 'livre';
    const [result] = await pool.execute(
        'INSERT INTO sala (numero_sala, tipo_sala, status) VALUES (?, ?, ?)',
        [numero_sala, tipo_sala, status]
    );
    // Não retorna insertId, pois a PK é composta e já conhecida
    return { numero_sala, tipo_sala, status };
};

// Alteração: Update por chave composta (numero_sala, tipo_sala)
const updateRoom = async (oldNumeroSala, oldTipoSala, newNumeroSala, newTipoSala, status) => {
    // Assumimos que numero_sala e tipo_sala são a identificação única.
    // A query abaixo permite mudar a PK ou outros campos.
    const [result] = await pool.execute(
        'UPDATE sala SET numero_sala = ?, tipo_sala = ?, status = ? WHERE numero_sala = ? AND tipo_sala = ?',
        [newNumeroSala, newTipoSala, status, oldNumeroSala, oldTipoSala]
    );
    return result.affectedRows > 0;
};

// Alteração: Delete por chave composta (numero_sala, tipo_sala)
const deleteRoom = async (numero_sala, tipo_sala) => {
    const [result] = await pool.execute('DELETE FROM sala WHERE numero_sala = ? AND tipo_sala = ?', [numero_sala, tipo_sala]);
    return result.affectedRows > 0;
};

export {
    getAllRooms,
    getRoomByCompositeKey, // Nova função para GET by PK
    createRoom,
    updateRoom,
    deleteRoom
};