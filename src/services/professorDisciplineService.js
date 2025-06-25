import pool from '../config/db.js'

const _checkProfessorScheduleConflict = async (
  id_professor,
  ano,
  semestre_alocacao,
  dia_semana,
  turno,
  newStartTime,
  newCarga,
  associationToExclude = null
) => {
  let query = `
        SELECT pd.nome, pd.turno, pd.hora_inicio, d.carga
        FROM professor_disciplina pd
        JOIN disciplina d ON pd.nome = d.nome AND pd.turno = d.turno
        WHERE pd.id_professor = ? AND pd.ano = ? AND pd.semestre_alocacao = ? AND pd.dia_semana = ?`
  const params = [id_professor, ano, semestre_alocacao, dia_semana]

  if (associationToExclude) {
    query += ` AND NOT (pd.nome = ? AND pd.turno = ?)`
    params.push(associationToExclude.nome, associationToExclude.turno)
  }

  const [existingAssociations] = await pool.execute(query, params)

  const horariosPorTurno = {
    Manhã: [
      '08:00:00',
      '08:50:00',
      '09:40:00',
      '10:00:00',
      '10:40:00',
      '11:30:00'
    ],
    Tarde: [
      '13:00:00',
      '13:50:00',
      '15:00:00',
      '15:50:00',
      '16:50:00',
      '17:40:00'
    ],
    Noite: ['19:00:00', '19:50:00', '21:00:00', '21:50:00']
  }
  const turnoTimeSlots = horariosPorTurno[turno]
  if (!turnoTimeSlots) throw new Error(`Turno '${turno}' é inválido.`)
  const newStartIndex = turnoTimeSlots.indexOf(newStartTime)
  if (newStartIndex === -1)
    throw new Error(
      `Horário de início '${newStartTime}' não é válido para o turno.`
    )
  const newOccupiedSlots = new Set()
  for (let i = 0; i < newCarga; i++) {
    if (newStartIndex + i < turnoTimeSlots.length)
      newOccupiedSlots.add(turnoTimeSlots[newStartIndex + i])
  }
  for (const assoc of existingAssociations) {
    const existingStartIndex = turnoTimeSlots.indexOf(assoc.hora_inicio)
    if (existingStartIndex > -1) {
      for (let i = 0; i < assoc.carga; i++) {
        if (newOccupiedSlots.has(turnoTimeSlots[existingStartIndex + i]))
          throw new Error(
            `Conflito de horário para o professor: já existe um compromisso neste horário.`
          )
      }
    }
  }
}

const _checkStudentScheduleConflict = async (
  curso,
  semestre_curso,
  ano,
  semestre_alocacao,
  dia_semana,
  turno,
  newStartTime,
  newCarga,
  associationToExclude = null
) => {
  let query = `
        SELECT pd.nome, pd.turno, pd.hora_inicio, d.carga
        FROM professor_disciplina pd
        JOIN disciplina d ON pd.nome = d.nome AND pd.turno = d.turno
        WHERE d.curso = ? AND d.semestre_curso = ? AND pd.ano = ? AND pd.semestre_alocacao = ? AND pd.dia_semana = ?`
  const params = [curso, semestre_curso, ano, semestre_alocacao, dia_semana]

  if (associationToExclude) {
    query += ` AND NOT (pd.nome = ? AND pd.turno = ?)`
    params.push(associationToExclude.nome, associationToExclude.turno)
  }

  const [existingAssociations] = await pool.execute(query, params)

  const horariosPorTurno = {
    Manhã: [
      '08:00:00',
      '08:50:00',
      '09:40:00',
      '10:00:00',
      '10:40:00',
      '11:30:00'
    ],
    Tarde: [
      '13:00:00',
      '13:50:00',
      '15:00:00',
      '15:50:00',
      '16:50:00',
      '17:40:00'
    ],
    Noite: ['19:00:00', '19:50:00', '21:00:00', '21:50:00']
  }
  const turnoTimeSlots = horariosPorTurno[turno]
  if (!turnoTimeSlots) throw new Error(`Turno '${turno}' é inválido.`)
  const newStartIndex = turnoTimeSlots.indexOf(newStartTime)
  if (newStartIndex === -1)
    throw new Error(
      `Horário de início '${newStartTime}' não é válido para o turno.`
    )
  const newOccupiedSlots = new Set()
  for (let i = 0; i < newCarga; i++) {
    if (newStartIndex + i < turnoTimeSlots.length)
      newOccupiedSlots.add(turnoTimeSlots[newStartIndex + i])
  }
  for (const assoc of existingAssociations) {
    const existingStartIndex = turnoTimeSlots.indexOf(assoc.hora_inicio)
    if (existingStartIndex > -1) {
      for (let i = 0; i < assoc.carga; i++) {
        if (newOccupiedSlots.has(turnoTimeSlots[existingStartIndex + i]))
          throw new Error(
            `Conflito de horário para a turma: já existe outra disciplina agendada neste horário para o mesmo curso e semestre.`
          )
      }
    }
  }
}

const getAllProfessorDisciplineAssociations = async (filters = {}) => {
  let query = `
        SELECT
            pd.id_professor,
            p.nome AS professor_nome,
            pd.nome AS disciplina_nome,
            pd.turno AS disciplina_turno,
            d.semestre_curso,
            pd.ano,
            pd.semestre_alocacao,
            pd.dia_semana,
            pd.hora_inicio
        FROM professor_disciplina pd
        JOIN professor p ON pd.id_professor = p.id_professor
        JOIN disciplina d ON pd.nome = d.nome AND pd.turno = d.turno
    `
  const conditions = []
  const params = []

  if (filters.anoSemestre) {
    const ano = parseInt(filters.anoSemestre.substring(0, 4))
    const semestreAlocacao = parseInt(filters.anoSemestre.substring(4, 5))
    conditions.push(`pd.ano = ? AND pd.semestre_alocacao = ?`)
    params.push(ano, semestreAlocacao)
  }
  if (filters.curso) {
    conditions.push(`d.curso = ?`)
    params.push(filters.curso)
  }
  if (filters.turno) {
    conditions.push(`d.turno = ?`)
    params.push(filters.turno)
  }
  if (filters.semestreCurso) {
    conditions.push(`d.semestre_curso = ?`)
    params.push(parseInt(filters.semestreCurso))
  }
  if (filters.idProfessor) {
    conditions.push(`pd.id_professor = ?`)
    params.push(parseInt(filters.idProfessor))
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ')
  }

  const [rows] = await pool.execute(query, params)
  return rows
}

const createProfessorDisciplineAssociation = async (
  id_professor,
  nome,
  turno,
  ano,
  semestre_alocacao,
  dia_semana,
  hora_inicio
) => {
  const [existingForDiscipline] = await pool.execute(
    'SELECT * FROM professor_disciplina WHERE nome = ? AND turno = ? AND ano = ? AND semestre_alocacao = ?',
    [nome, turno, ano, semestre_alocacao]
  )
  if (existingForDiscipline.length > 0) {
    throw new Error(
      'Esta disciplina já está associada a outro professor neste turno e semestre.'
    )
  }

  const [newDisciplineInfo] = await pool.execute(
    'SELECT carga, curso, semestre_curso FROM disciplina WHERE nome = ? AND turno = ?',
    [nome, turno]
  )
  if (!newDisciplineInfo[0])
    throw new Error('Disciplina a ser associada não foi encontrada.')
  const { carga, curso, semestre_curso } = newDisciplineInfo[0]

  await _checkProfessorScheduleConflict(
    id_professor,
    ano,
    semestre_alocacao,
    dia_semana,
    turno,
    hora_inicio + ':00',
    carga
  )

  await _checkStudentScheduleConflict(
    curso,
    semestre_curso,
    ano,
    semestre_alocacao,
    dia_semana,
    turno,
    hora_inicio + ':00',
    carga
  )

  const [result] = await pool.execute(
    'INSERT INTO professor_disciplina (id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio]
  )
  return {
    id_professor,
    nome,
    turno,
    ano,
    semestre_alocacao,
    dia_semana,
    hora_inicio
  }
}

const updateProfessorDisciplineAssociation = async (
  oldIdProfessor,
  oldNomeDisc,
  oldTurnoDisc,
  oldAno,
  oldSemestreAlocacao,
  newIdProfessor,
  newNomeDisc,
  newTurnoDisc,
  newAno,
  newSemestreAlocacao,
  newDiaSemana,
  newHoraInicio
) => {
  const [newDisciplineInfo] = await pool.execute(
    'SELECT carga, curso, semestre_curso FROM disciplina WHERE nome = ? AND turno = ?',
    [newNomeDisc, newTurnoDisc]
  )
  if (!newDisciplineInfo[0])
    throw new Error('Disciplina de destino não foi encontrada.')
  const { carga, curso, semestre_curso } = newDisciplineInfo[0]

  const associationToExclude = { nome: oldNomeDisc, turno: oldTurnoDisc }

  await _checkProfessorScheduleConflict(
    newIdProfessor,
    newAno,
    newSemestreAlocacao,
    newDiaSemana,
    newTurnoDisc,
    newHoraInicio + ':00',
    carga,
    associationToExclude
  )

  await _checkStudentScheduleConflict(
    curso,
    semestre_curso,
    newAno,
    newSemestreAlocacao,
    newDiaSemana,
    newTurnoDisc,
    newHoraInicio + ':00',
    carga,
    associationToExclude
  )

  const [result] = await pool.execute(
    `UPDATE professor_disciplina SET id_professor = ?, nome = ?, turno = ?, ano = ?, semestre_alocacao = ?, dia_semana = ?, hora_inicio = ? WHERE id_professor = ? AND nome = ? AND turno = ? AND ano = ? AND semestre_alocacao = ?`,
    [
      newIdProfessor,
      newNomeDisc,
      newTurnoDisc,
      newAno,
      newSemestreAlocacao,
      newDiaSemana,
      newHoraInicio,
      oldIdProfessor,
      oldNomeDisc,
      oldTurnoDisc,
      oldAno,
      oldSemestreAlocacao
    ]
  )
  return result.affectedRows > 0
}

const getProfessorDisciplineAssociationByCompositeKey = async (
  id_professor,
  nome,
  turno,
  ano,
  semestre_alocacao
) => {
  const [rows] = await pool.execute(
    `SELECT pd.id_professor, p.nome AS professor_nome, pd.nome AS disciplina_nome, pd.turno AS disciplina_turno, pd.ano, pd.semestre_alocacao, pd.dia_semana, pd.hora_inicio FROM professor_disciplina pd JOIN professor p ON pd.id_professor = p.id_professor WHERE pd.id_professor = ? AND pd.nome = ? AND pd.turno = ? AND pd.ano = ? AND pd.semestre_alocacao = ?`,
    [id_professor, nome, turno, ano, semestre_alocacao]
  )
  return rows[0]
}

const deleteProfessorDisciplineAssociation = async (
  id_professor,
  nome,
  turno,
  ano,
  semestre_alocacao
) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.execute(
      'DELETE FROM alocacao WHERE id_professor = ? AND nome = ? AND turno = ? AND ano = ? AND semestre_alocacao = ?',
      [id_professor, nome, turno, ano, semestre_alocacao]
    )
    const [result] = await connection.execute(
      'DELETE FROM professor_disciplina WHERE id_professor = ? AND nome = ? AND turno = ? AND ano = ? AND semestre_alocacao = ?',
      [id_professor, nome, turno, ano, semestre_alocacao]
    )
    await connection.commit()
    return result.affectedRows > 0
  } catch (error) {
    await connection.rollback()
    console.error(
      'Erro na transação de exclusão, revertendo alterações:',
      error
    )
    throw new Error(
      'Falha ao deletar associação. Verifique as dependências e tente novamente.'
    )
  } finally {
    connection.release()
  }
}

const copyProfessorDisciplineAssociations = async (
  sourceAno,
  sourceSemestre,
  targetAno,
  targetSemestre
) => {
  const [sourceAssociations] = await pool.execute(
    `SELECT id_professor, nome, turno, dia_semana, hora_inicio FROM professor_disciplina WHERE ano = ? AND semestre_alocacao = ?`,
    [sourceAno, sourceSemestre]
  )

  let copiedCount = 0
  for (const assoc of sourceAssociations) {
    try {
      const [result] = await pool.execute(
        `INSERT IGNORE INTO professor_disciplina (id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          assoc.id_professor,
          assoc.nome,
          assoc.turno,
          targetAno,
          targetSemestre,
          assoc.dia_semana,
          assoc.hora_inicio
        ]
      )
      if (result.affectedRows > 0) {
        copiedCount++
      }
    } catch (error) {
      console.error('Erro ao copiar associação:', error)
    }
  }
  return copiedCount
}

export {
  getAllProfessorDisciplineAssociations,
  createProfessorDisciplineAssociation,
  getProfessorDisciplineAssociationByCompositeKey,
  updateProfessorDisciplineAssociation,
  deleteProfessorDisciplineAssociation,
  copyProfessorDisciplineAssociations
}
