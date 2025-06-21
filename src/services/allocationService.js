// backend/services/allocationService.js
import pool from '../config/db.js'

// Alteração: checkRoomAvailability agora precisa de nome e turno da disciplina para pegar o tempo
const checkRoomAvailability = async (
  numero_sala,
  tipo_sala,
  id_professor_aloc,
  nome_disc_aloc,
  turno_disc_aloc,
  ano_aloc,
  semestre_aloc,
  allocationToExcludePK = {}
) => {
  // RN007
  // RN007: Duas disciplinas não podem estar na mesma sala no mesmo horário.
  // Esta verificação é crucial e mais complexa devido à estrutura atual do DB.
  // Precisamos unir a alocacao com professor_disciplina para obter as informações de dia e hora.

  // Primeiro, obtenha o dia_semana e hora_inicio/hora_fim da disciplina/professor em professor_disciplina
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
      'Associação professor-disciplina programada não encontrada para a alocação. Verifique se o agendamento existe.'
    )
  }

  const { dia_semana, hora_inicio } = scheduledClass[0]

  // O banco de dados não tem hora_fim na professor_disciplina, então teremos que inferir ou obter da disciplina se ela tivesse duração.
  // Para a RN007, é CRÍTICO ter a duração.
  // Se a `disciplina` tem uma `carga` horária, podemos inferir uma hora_fim.
  // Por simplicidade, para o check, vamos assumir uma duração padrão (ex: 1 hora) ou que hora_inicio é o ponto de conflito.
  // A implementação mais robusta de RN007 exigiria 'hora_fim' explícita na professor_disciplina ou disciplina.
  // Por agora, vou assumir uma duração fixa de 1 hora para o check de conflito, o que pode não ser ideal.
  // IDEAL: add hora_fim to professor_disciplina table.

  // Para um check mais robusto, precisaríamos da duração. Vamos assumir 1 hora para hora_fim temporariamente para o check.
  const tempHoraFim = `${parseInt(hora_inicio.split(':')[0]) + 1}:00:00` // Ex: '08:00:00' -> '09:00:00'

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
    hora_inicio, // For first overlap check
    hora_inicio,
    tempHoraFim // For second overlap check
  ]

  // Se estiver atualizando uma alocação, exclua-a da verificação de conflito
  if (Object.keys(allocationToExcludePK).length > 0) {
    query += ` AND NOT (al.numero_sala = ? AND al.tipo_sala = ? AND al.id_professor = ? AND al.nome = ? AND al.turno = ? AND al.ano = ? AND al.semestre_alocacao = ?)`
    queryParams.push(
      allocationToExcludePK.numero_sala,
      allocationToExcludePK.tipo_sala,
      allocationToExcludePK.id_professor,
      allocationToExcludePK.nome,
      allocationToExcludePK.turno,
      allocationToExcludePK.ano,
      allocationToExcludePK.semestre_alocacao
    )
  }

  const [rows] = await pool.execute(query, queryParams)
  return rows.length === 0 // Se nenhuma linha, a sala está disponível
}

// Alteração: createAllocation usa nova chave composta e FK para professor_disciplina
const createAllocation = async (
  numero_sala,
  tipo_sala,
  id_professor,
  nome,
  turno,
  ano,
  semestre_alocacao,
  tipo_alocacao
) => {
  // RN006
  // RN006: Professores podem solicitar salas... apenas para salas que estão disponíveis no horário informado atual.
  // A verificação de disponibilidade (RN007) já está dentro de checkRoomAvailability
  // Precisamos obter o dia_semana e hora_inicio de professor_disciplina para o check
  const [scheduledClass] = await pool.execute(
    'SELECT dia_semana, hora_inicio FROM professor_disciplina WHERE id_professor = ? AND nome = ? AND turno = ? AND ano = ? AND semestre_alocacao = ?',
    [id_professor, nome, turno, ano, semestre_alocacao]
  )

  if (!scheduledClass || scheduledClass.length === 0) {
    throw new Error(
      'Associação professor-disciplina programada não encontrada para a alocação. Verifique se o agendamento existe.'
    )
  }

  const isAvailable = await checkRoomAvailability(
    numero_sala,
    tipo_sala,
    id_professor,
    nome,
    turno,
    ano,
    semestre_alocacao
  )
  if (!isAvailable) {
    throw new Error('Sala já ocupada neste horário ou conflito de agendamento.') // RN006, RN007
  }

  const status = 'pendente' // Default status for new requests (lowercase ENUM)
  const [result] = await pool.execute(
    'INSERT INTO alocacao (numero_sala, tipo_sala, id_professor, nome, turno, ano, semestre_alocacao, tipo_alocacao, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      numero_sala,
      tipo_sala,
      id_professor,
      nome,
      turno,
      ano,
      semestre_alocacao,
      tipo_alocacao,
      status
    ]
  )
  // Não retorna insertId, pois a PK é composta
  return {
    numero_sala,
    tipo_sala,
    id_professor,
    nome,
    turno,
    ano,
    semestre_alocacao,
    tipo_alocacao,
    status
  }
}

// Alteração: getAllAllocations com JOINS e FILTROS para obter detalhes de tempo
const getAllAllocations = async (filters = {}) => {
  // Adicionar parâmetro filters
  let query = `
        SELECT
            al.numero_sala,
            al.tipo_sala,
            al.tipo_alocacao,
            al.status AS alocacao_status,
            pd.dia_semana,
            pd.hora_inicio,
            p.nome AS professor_nome,
            d.nome AS disciplina_nome,
            d.turno AS disciplina_turno,
            al.ano,
            al.semestre_alocacao,
            al.id_professor -- Incluir id_professor para uso no frontend (edição/deleção)
        FROM alocacao al
        JOIN sala s ON al.numero_sala = s.numero_sala AND al.tipo_sala = s.tipo_sala
        JOIN professor_disciplina pd ON
            al.id_professor = pd.id_professor AND
            al.nome = pd.nome AND
            al.turno = pd.turno AND
            al.ano = pd.ano AND
            al.semestre_alocacao = pd.semestre_alocacao
        JOIN professor p ON al.id_professor = p.id_professor
        JOIN disciplina d ON al.nome = d.nome AND al.turno = d.turno
    `
  const conditions = []
  const params = []

  // Adicionar condições de filtro (similar ao professorDisciplineService)
  if (filters.numeroSala) {
    conditions.push(`al.numero_sala = ?`)
    params.push(parseInt(filters.numeroSala))
  }
  if (filters.tipoSala) {
    conditions.push(`al.tipo_sala = ?`)
    params.push(filters.tipoSala.toLowerCase())
  }
  if (filters.idProfessor) {
    // Para uso em getAllocationsByProfessor ou filtro global
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
  // Filtros de disciplina (curso, semestre_curso) também podem ser adicionados se necessário
  if (filters.curso) {
    conditions.push(`d.curso = ?`)
    params.push(filters.curso)
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

// Alteração: getAllocationsByProfessor chamará getAllAllocations com filtro de ID
// Remova a implementação duplicada e chame a função genérica
const getAllocationsByProfessor = async id_professor => {
  return getAllAllocations({ idProfessor: id_professor }) // Reutiliza a função com filtro
}

// Alteração: updateAllocationStatus usa a nova chave composta da alocação
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
    `UPDATE alocacao SET status = ?
         WHERE numero_sala = ? AND tipo_sala = ? AND id_professor = ? AND nome = ? AND turno = ? AND ano = ? AND semestre_alocacao = ?`,
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
  return result.affectedRows > 0
}

// Alteração: deleteAllocation usa a nova chave composta da alocação
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
    `DELETE FROM alocacao
         WHERE numero_sala = ? AND tipo_sala = ? AND id_professor = ? AND nome = ? AND turno = ? AND ano = ? AND semestre_alocacao = ?`,
    [numero_sala, tipo_sala, id_professor, nome, turno, ano, semestre_alocacao]
  )
  return result.affectedRows > 0
}

export {
  createAllocation,
  getAllAllocations,
  updateAllocationStatus,
  deleteAllocation
}
