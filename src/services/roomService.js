// backend/services/roomService.js
import pool from '../config/db.js'

const getAllRooms = async () => {
  const [rows] = await pool.execute(
    'SELECT numero_sala, tipo_sala, status FROM sala'
  )
  return rows
}

const getRoomByCompositeKey = async (numero_sala, tipo_sala) => {
  const [rows] = await pool.execute(
    'SELECT numero_sala, tipo_sala, status FROM sala WHERE numero_sala = ? AND tipo_sala = ?',
    [numero_sala, tipo_sala]
  )
  return rows[0]
}

const createRoom = async (numero_sala, tipo_sala) => {
  // RN005
  const status = 'livre'
  const [result] = await pool.execute(
    'INSERT INTO sala (numero_sala, tipo_sala, status) VALUES (?, ?, ?)',
    [numero_sala, tipo_sala, status]
  )
  return { numero_sala, tipo_sala, status }
}

const updateRoom = async (
  oldNumeroSala,
  oldTipoSala,
  newNumeroSala,
  newTipoSala,
  status
) => {
  const [result] = await pool.execute(
    'UPDATE sala SET numero_sala = ?, tipo_sala = ?, status = ? WHERE numero_sala = ? AND tipo_sala = ?',
    [newNumeroSala, newTipoSala, status, oldNumeroSala, oldTipoSala]
  )
  return result.affectedRows > 0
}

const deleteRoom = async (numero_sala, tipo_sala) => {
  const [result] = await pool.execute(
    'DELETE FROM sala WHERE numero_sala = ? AND tipo_sala = ?',
    [numero_sala, tipo_sala]
  )
  return result.affectedRows > 0
}

const updateRoomStatus = async (numero_sala, tipo_sala, status) => {
  if (!['livre', 'ocupada'].includes(status.toLowerCase())) {
    throw new Error('Status inválido. Deve ser "livre" ou "ocupada".')
  }
  const [result] = await pool.execute(
    'UPDATE sala SET status = ? WHERE numero_sala = ? AND tipo_sala = ?',
    [status.toLowerCase(), numero_sala, tipo_sala]
  )
  return result.affectedRows > 0
}

export {
  getAllRooms,
  getRoomByCompositeKey,
  createRoom,
  updateRoom,
  deleteRoom,
  updateRoomStatus
}
