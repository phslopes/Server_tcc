// backend/services/roomService.js
import pool from '../config/db.js';

const getAllRooms = async () => {
    const [rows] = await pool.execute('SELECT * FROM sala');
    return rows;
};

const getRoomById = async (id) => {
    const [rows] = await pool.execute('SELECT * FROM sala WHERE id_sala = ?', [id]);
    return rows[0];
};

const createRoom = async (numero_sala, tipo_sala) => { // RN005
    // RN005: Uma sala sempre é cadastrada como livre.
    const status = 'Livre';
    const [result] = await pool.execute(
        'INSERT INTO sala (numero_sala, tipo_sala, status) VALUES (?, ?, ?)',
        [numero_sala, tipo_sala, status]
    );
    return { id_sala: result.insertId, numero_sala, tipo_sala, status };
};

const updateRoom = async (id, numero_sala, tipo_sala, status) => {
    const [result] = await pool.execute(
        'UPDATE sala SET numero_sala = ?, tipo_sala = ?, status = ? WHERE id_sala = ?',
        [numero_sala, tipo_sala, status, id]
    );
    return result.affectedRows > 0;
};

const deleteRoom = async (id) => {
    const [result] = await pool.execute('DELETE FROM sala WHERE id_sala = ?', [id]);
    return result.affectedRows > 0;
};

export {
    getAllRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom
};