import pool from '../config/db.js'
import { updateRoomStatus, getRoomByCompositeKey } from './roomService.js'

const checkRoomAvailability = async (
  numero_sala,
  tipo_sala,
  id_professor_aloc,
  nome_disc_aloc,
  turno_disc_aloc,
  ano_aloc,
  semestre_aloc
) => {
  const [scheduledClass] = await pool.execute(
    'SELECT dia_semana, hora_inicio FROM professor_disciplina WHERE id_professor = ? AND nome = ? AND turno = ? AND ano = ? AND semestre_alocacao = ?',
    [
      id_professor_aloc,
      nome_disc_aloc,
      turno_disc_aloc,
      ano_aloc,
      semestre_aloc
    ]
  )

  if (!scheduledClass || scheduledClass.length === 0) {
    throw new Error(
      'Associação professor-disciplina não encontrada para a alocação.'
    )
  }
  const { dia_semana, hora_inicio } = scheduledClass[0]

  const tempHoraFim = `${parseInt(hora_inicio.split(':')[0]) + 1}:00:00`
  let query = `
          SELECT
            al.numero_sala, al.tipo_sala, pd.dia_semana, pd.hora_inicio
        FROM alocacao al
        JOIN professor_disciplina pd ON
            al.id_professor = pd.id_professor AND
            al.nome = pd.nome AND
            al.turno = pd.turno AND
            al.ano = pd.ano AND
            al.semestre_alocacao = pd.semestre_alocacao
        WHERE
            al.numero_sala = ? AND al.tipo_sala = ? AND pd.dia_semana = ?
            AND al.status IN ('confirmada', 'pendente')
            AND (
                (pd.hora_inicio < ? AND ADDTIME(pd.hora_inicio, '01:00:00') > ?) OR 
                (pd.hora_inicio >= ? AND pd.hora_inicio < ?)                     
            )
    `
  const queryParams = [
    numero_sala,
    tipo_sala,
    dia_semana,
    tempHoraFim,
    hora_inicio,
    hora_inicio,
    tempHoraFim
  ]
  const [rows] = await pool.execute(query, queryParams)
  return rows.length === 0
}

const createAllocation = async (
  numero_sala,
  tipo_sala,
  id_professor,
  nome,
  turno,
  ano,
  semestre_alocacao,
  tipo_alocacao,
  dia_semana,
  hora_inicio,
  userRole
) => {
  const isAvailable = await checkRoomAvailabilityForSpecificTime(
    numero_sala,
    tipo_sala,
    dia_semana,
    hora_inicio
  )
  if (!isAvailable) {
    throw new Error(
      'Conflito de agendamento: outra disciplina já está alocada para esta sala neste horário.'
    )
  }

  const status = userRole === 'admin' ? 'confirmada' : 'pendente'

  const [result] = await pool.execute(
    'INSERT INTO alocacao (numero_sala, tipo_sala, id_professor, nome, turno, ano, semestre_alocacao, tipo_alocacao, status, dia_semana, hora_inicio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      numero_sala,
      tipo_sala,
      id_professor,
      nome,
      turno,
      ano,
      semestre_alocacao,
      tipo_alocacao,
      status,
      dia_semana,
      hora_inicio
    ]
  )

  if (status === 'confirmada') {
    await updateRoomStatus(numero_sala, tipo_sala, 'ocupada')
  }

  return {
    numero_sala,
    tipo_sala,
    id_professor,
    nome,
    turno,
    ano,
    semestre_alocacao,
    tipo_alocacao,
    status,
    dia_semana,
    hora_inicio
  }
}

const checkRoomAvailabilityForSpecificTime = async (
  numero_sala,
  tipo_sala,
  dia_semana,
  hora_inicio
) => {
  const [conflicts] = await pool.execute(`
    SELECT 1
    FROM alocacao al
    WHERE al.numero_sala = ? 
    AND al.tipo_sala = ?
    AND al.dia_semana = ?
    AND al.hora_inicio = ?
    AND al.status IN ('confirmada', 'pendente')
  `, [numero_sala, tipo_sala, dia_semana, hora_inicio])

  return conflicts.length === 0 // Se nenhum conflito, a sala está disponível
}

const changeAllocationRoom = async (oldAllocationPK, newRoom) => {
  const {
    numeroSala,
    tipoSala,
    idProfessor,
    nomeDisc,
    turnoDisc,
    ano,
    semestreAlocacao
  } = oldAllocationPK
  const { new_numero_sala, new_tipo_sala } = newRoom

  const newRoomStatus = await getRoomByCompositeKey(
    new_numero_sala,
    new_tipo_sala
  )
  if (!newRoomStatus) throw new Error('A nova sala selecionada não existe.')
  if (newRoomStatus.status === 'ocupada')
    throw new Error('A nova sala já está marcada como ocupada.')

  const [vinculo] = await pool.execute(
    'SELECT dia_semana, hora_inicio FROM professor_disciplina WHERE id_professor = ? AND nome = ? AND turno = ? AND ano = ? AND semestre_alocacao = ?',
    [idProfessor, nomeDisc, turnoDisc, ano, semestreAlocacao]
  )

  if (!vinculo || vinculo.length === 0) {
    throw new Error('Vínculo professor-disciplina não encontrado.')
  }

  const { dia_semana, hora_inicio } = vinculo[0]

  const isAvailable = await checkRoomAvailabilityForSpecificTime(
    new_numero_sala,
    new_tipo_sala,
    dia_semana,
    hora_inicio
  )
  if (!isAvailable) {
    throw new Error('Conflito de agendamento: outra disciplina já está alocada para esta sala neste horário.')
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    await connection.execute(
      `DELETE FROM alocacao WHERE numero_sala = ? AND tipo_sala = ? AND id_professor = ? AND nome = ? AND turno = ? AND ano = ? AND semestre_alocacao = ?`,
      [
        numeroSala,
        tipoSala,
        idProfessor,
        nomeDisc,
        turnoDisc,
        ano,
        semestreAlocacao
      ]
    )

    await connection.execute(
      `UPDATE sala SET status = 'livre' WHERE numero_sala = ? AND tipo_sala = ?`,
      [numeroSala, tipoSala]
    )

    await connection.execute(
      'INSERT INTO alocacao (numero_sala, tipo_sala, id_professor, nome, turno, ano, semestre_alocacao, tipo_alocacao, status, dia_semana, hora_inicio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        new_numero_sala,
        new_tipo_sala,
        idProfessor,
        nomeDisc,
        turnoDisc,
        ano,
        semestreAlocacao,
        'fixo',
        'confirmada',
        dia_semana,
        hora_inicio
      ]
    )

    await connection.execute(
      `UPDATE sala SET status = 'ocupada' WHERE numero_sala = ? AND tipo_sala = ?`,
      [new_numero_sala, new_tipo_sala]
    )

    await connection.commit()
    return { success: true }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

const getAllAllocations = async (filters = {}) => {
  let query = `
          SELECT
            al.numero_sala,
            al.tipo_sala,
            al.tipo_alocacao,
            al.status AS alocacao_status,
            al.dia_semana,
            al.hora_inicio,
            p.nome AS professor_nome,
            d.nome AS disciplina_nome,
            d.turno AS disciplina_turno,
            al.ano,
            al.semestre_alocacao,
            al.id_professor -- Incluir id_professor para uso no frontend (edição/deleção)
        FROM alocacao al
        JOIN sala s ON al.numero_sala = s.numero_sala AND al.tipo_sala = s.tipo_sala
        JOIN professor p ON al.id_professor = p.id_professor
        JOIN disciplina d ON al.nome = d.nome AND al.turno = d.turno
    `
  const conditions = []
  const params = []
  if (filters.curso) {
    conditions.push(`d.curso = ?`)
    params.push(filters.curso)
  }
  if (filters.numeroSala) {
    conditions.push(`al.numero_sala = ?`)
    params.push(parseInt(filters.numeroSala))
  }
  if (filters.tipoSala) {
    conditions.push(`al.tipo_sala = ?`)
    params.push(filters.tipoSala.toLowerCase())
  }
  if (filters.idProfessor) {
    conditions.push(`al.id_professor = ?`)
    params.push(parseInt(filters.idProfessor))
  }
  if (filters.disciplinaNome) {
    conditions.push(`al.nome = ?`)
    params.push(filters.disciplinaNome)
  }
  if (filters.disciplinaTurno) {
    conditions.push(`al.turno = ?`)
    params.push(filters.disciplinaTurno)
  }
  if (filters.ano) {
    conditions.push(`al.ano = ?`)
    params.push(parseInt(filters.ano))
  }
  if (filters.semestreAlocacao) {
    conditions.push(`al.semestre_alocacao = ?`)
    params.push(parseInt(filters.semestreAlocacao))
  }
  if (filters.tipoAlocacao) {
    conditions.push(`al.tipo_alocacao = ?`)
    params.push(filters.tipoAlocacao.toLowerCase())
  }
  if (filters.status) {
    conditions.push(`al.status = ?`)
    params.push(filters.status.toLowerCase())
  }
  if (filters.semestreCurso) {
    conditions.push(`d.semestre_curso = ?`)
    params.push(parseInt(filters.semestreCurso))
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ')
  }
  const [rows] = await pool.execute(query, params)
  return rows
}

const updateAllocationStatusById = async (
  numero_sala,
  tipo_sala,
  id_professor,
  nome,
  turno,
  ano,
  semestre_alocacao,
  dia_semana,
  hora_inicio,
  status
) => {
  const [result] = await pool.execute(
    `UPDATE alocacao SET status = ?
         WHERE numero_sala = ? AND tipo_sala = ? AND id_professor = ? AND nome = ? AND turno = ? AND ano = ? AND semestre_alocacao = ? AND dia_semana = ? AND hora_inicio = ?`,
    [
      status,
      numero_sala,
      tipo_sala,
      id_professor,
      nome,
      turno,
      ano,
      semestre_alocacao,
      dia_semana,
      hora_inicio
    ]
  )
  return result.affectedRows > 0
}

const updateAllocationStatus = async (
  numero_sala,
  tipo_sala,
  id_professor,
  nome,
  turno,
  ano,
  semestre_alocacao,
  status
) => {
  const [result] = await pool.execute(
    `UPDATE alocacao SET status = ? WHERE numero_sala = ? AND tipo_sala = ? AND id_professor = ? AND nome = ? AND turno = ? AND ano = ? AND semestre_alocacao = ?`,
    [
      status,
      numero_sala,
      tipo_sala,
      id_professor,
      nome,
      turno,
      ano,
      semestre_alocacao
    ]
  )
  if (result.affectedRows > 0) {
    await updateRoomStatus(
      numero_sala,
      tipo_sala,
      status.toLowerCase() === 'confirmada' ? 'ocupada' : 'livre'
    )
  }
  return result.affectedRows > 0
}

const deleteAllocation = async (
  numero_sala,
  tipo_sala,
  id_professor,
  nome,
  turno,
  ano,
  semestre_alocacao
) => {
  const [result] = await pool.execute(
    `DELETE FROM alocacao WHERE numero_sala = ? AND tipo_sala = ? AND id_professor = ? AND nome = ? AND turno = ? AND ano = ? AND semestre_alocacao = ?`,
    [numero_sala, tipo_sala, id_professor, nome, turno, ano, semestre_alocacao]
  )
  if (result.affectedRows > 0) {
    await updateRoomStatus(numero_sala, tipo_sala, 'livre')
  }
  return result.affectedRows > 0
}

const checkRoomAvailabilityForReservation = async (
  id_professor,
  nome,
  turno,
  ano,
  semestre_alocacao,
  dia_semana,
  hora_inicio
) => {
  const [professorDisciplina] = await pool.execute(
    'SELECT dia_semana, hora_inicio FROM professor_disciplina WHERE id_professor = ? AND nome = ? AND turno = ? AND ano = ? AND semestre_alocacao = ? AND dia_semana = ? AND hora_inicio = ?',
    [id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio]
  )

  if (!professorDisciplina || professorDisciplina.length === 0) {
    throw new Error('Horário não encontrado na programação do professor para esta disciplina.')
  }

  const [availableRooms] = await pool.execute(`
    SELECT DISTINCT s.numero_sala, s.tipo_sala
    FROM sala s
    WHERE s.status = 'livre'
    AND NOT EXISTS (
      SELECT 1
      FROM alocacao al
      JOIN professor_disciplina pd ON
          al.id_professor = pd.id_professor AND
          al.nome = pd.nome AND
          al.turno = pd.turno AND
          al.ano = pd.ano AND
          al.semestre_alocacao = pd.semestre_alocacao
      WHERE al.numero_sala = s.numero_sala 
      AND al.tipo_sala = s.tipo_sala
      AND pd.dia_semana = ?
      AND pd.hora_inicio = ?
      AND al.status IN ('confirmada', 'pendente')
    )
  `, [dia_semana, hora_inicio])

  return availableRooms
}

const checkProfessorSchedule = async (
  id_professor,
  nome,
  turno,
  ano,
  semestre_alocacao,
  dia_semana,
  hora_inicio
) => {
  const [professorDisciplina] = await pool.execute(
    'SELECT dia_semana, hora_inicio FROM professor_disciplina WHERE id_professor = ? AND nome = ? AND turno = ? AND ano = ? AND semestre_alocacao = ? AND dia_semana = ? AND hora_inicio = ?',
    [id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio]
  )

  return professorDisciplina.length > 0
}

const checkRoomAvailabilityOnly = async (
  dia_semana,
  hora_inicio
) => {
  const [availableRooms] = await pool.execute(`
    SELECT DISTINCT s.numero_sala, s.tipo_sala
    FROM sala s
    WHERE NOT EXISTS (
      SELECT 1
      FROM alocacao al
      WHERE al.numero_sala = s.numero_sala 
      AND al.tipo_sala = s.tipo_sala
      AND al.dia_semana = ?
      AND al.hora_inicio = ?
      AND al.status IN ('confirmada', 'pendente')
    )
  `, [dia_semana, hora_inicio])

  return availableRooms
}

export {
  createAllocation,
  getAllAllocations,
  updateAllocationStatus,
  deleteAllocation,
  changeAllocationRoom,
  checkRoomAvailabilityForReservation,
  checkProfessorSchedule,
  checkRoomAvailabilityOnly,
  checkRoomAvailabilityForSpecificTime,
  updateAllocationStatusById
}
