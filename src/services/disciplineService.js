import pool from '../config/db.js'

const getAllDisciplines = async () => {
  const [rows] = await pool.execute(
    'SELECT nome, turno, carga, semestre_curso, curso FROM disciplina'
  )
  return rows
}

// Alteração: Get por chave composta (nome, turno)
const getDisciplineByCompositeKey = async (nome, turno) => {
  const [rows] = await pool.execute(
    'SELECT nome, turno, carga, semestre_curso, curso FROM disciplina WHERE nome = ? AND turno = ?',
    [nome, turno]
  )
  return rows[0]
}

const createDiscipline = async (nome, turno, carga, semestre_curso, curso) => {
  // RN003
  const [result] = await pool.execute(
    'INSERT INTO disciplina (nome, turno, carga, semestre_curso, curso) VALUES (?, ?, ?, ?, ?)',
    [nome, turno, carga, semestre_curso, curso]
  )
  // Não retorna insertId, pois a PK é composta e já conhecida (nome, turno)
  return { nome, turno, carga, semestre_curso, curso }
}

const updateDiscipline = async (
  oldNome,
  oldTurno,
  newNome,
  newTurno,
  carga,
  semestre_curso,
  curso
) => {
  const [result] = await pool.execute(
    'UPDATE disciplina SET nome = ?, turno = ?, carga = ?, semestre_curso = ?, curso = ? WHERE nome = ? AND turno = ?',
    [newNome, newTurno, carga, semestre_curso, curso, oldNome, oldTurno]
  )
  return result.affectedRows > 0
}

// Alteração: Delete por chave composta (nome, turno)
const deleteDiscipline = async (nome, turno) => {
  const [result] = await pool.execute(
    'DELETE FROM disciplina WHERE nome = ? AND turno = ?',
    [nome, turno]
  )
  return result.affectedRows > 0
}

export {
  getAllDisciplines,
  getDisciplineByCompositeKey,
  createDiscipline,
  updateDiscipline,
  deleteDiscipline
}
