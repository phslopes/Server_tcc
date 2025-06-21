// backend/services/professorDisciplineService.js
import pool from '../config/db.js'

// Função para obter associações professor-disciplina com filtros
const getAllProfessorDisciplineAssociations = async (filters = {}) => {
  let query = `
        SELECT
            pd.id_professor,
            p.nome AS professor_nome,
            pd.nome AS disciplina_nome,
            pd.turno AS disciplina_turno,
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
    // Este 'turno' se refere ao turno da disciplina
    conditions.push(`d.turno = ?`)
    params.push(filters.turno)
  }
  if (filters.semestreCurso) {
    // Este é o semestre da disciplina (1 a 6)
    conditions.push(`d.semestre_curso = ?`)
    params.push(parseInt(filters.semestreCurso))
  }
  if (filters.idProfessor) {
    // Para filtro específico de professor (se o professor logado for ver apenas as suas)
    conditions.push(`pd.id_professor = ?`)
    params.push(parseInt(filters.idProfessor))
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ')
  }

  const [rows] = await pool.execute(query, params)
  return rows
}

// Função para criar uma nova associação professor-disciplina
const createProfessorDisciplineAssociation = async (
  id_professor,
  nome,
  turno,
  ano,
  semestre_alocacao,
  dia_semana,
  hora_inicio
) => {
  //
  const [result] = await pool.execute(
    'INSERT INTO professor_disciplina (id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio]
  )
  // Retorna a associação criada, útil para atualizar o estado no frontend
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

// Função para obter uma associação específica por sua chave composta
const getProfessorDisciplineAssociationByCompositeKey = async (
  id_professor,
  nome,
  turno,
  ano,
  semestre_alocacao
) => {
  //
  const [rows] = await pool.execute(
    `SELECT
            pd.id_professor,
            p.nome AS professor_nome,
            pd.nome AS disciplina_nome,
            pd.turno AS disciplina_turno,
            pd.ano,
            pd.semestre_alocacao,
            pd.dia_semana,
            pd.hora_inicio
        FROM professor_disciplina pd
        JOIN professor p ON pd.id_professor = p.id_professor
        WHERE pd.id_professor = ? AND pd.nome = ? AND pd.turno = ? AND pd.ano = ? AND pd.semestre_alocacao = ?`,
    [id_professor, nome, turno, ano, semestre_alocacao]
  )
  return rows[0]
}

// Função para atualizar uma associação professor-disciplina
const updateProfessorDisciplineAssociation = async (
  //
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
  const [result] = await pool.execute(
    `UPDATE professor_disciplina
         SET id_professor = ?, nome = ?, turno = ?, ano = ?, semestre_alocacao = ?, dia_semana = ?, hora_inicio = ?
         WHERE id_professor = ? AND nome = ? AND turno = ? AND ano = ? AND semestre_alocacao = ?`,
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

// Função para deletar uma associação específica por sua chave composta
const deleteProfessorDisciplineAssociation = async (
  id_professor,
  nome,
  turno,
  ano,
  semestre_alocacao
) => {
  //
  const [result] = await pool.execute(
    'DELETE FROM professor_disciplina WHERE id_professor = ? AND nome = ? AND turno = ? AND ano = ? AND semestre_alocacao = ?',
    [id_professor, nome, turno, ano, semestre_alocacao]
  )
  return result.affectedRows > 0
}

// NOVA FUNÇÃO: Copiar associações de um semestre para outro
const copyProfessorDisciplineAssociations = async (
  sourceAno,
  sourceSemestre,
  targetAno,
  targetSemestre
) => {
  // 1. Selecionar todas as associações do semestre de origem
  const [sourceAssociations] = await pool.execute(
    `SELECT id_professor, nome, turno, dia_semana, hora_inicio
         FROM professor_disciplina
         WHERE ano = ? AND semestre_alocacao = ?`,
    [sourceAno, sourceSemestre]
  )

  let copiedCount = 0
  for (const assoc of sourceAssociations) {
    try {
      // 2. Tentar inserir a nova associação para o semestre de destino
      // INSERT IGNORE para automaticamente pular duplicatas sem erro
      const [result] = await pool.execute(
        `INSERT IGNORE INTO professor_disciplina 
                 (id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
      // affectedRows será 1 se inseriu, 0 se ignorou (duplicata)
      if (result.affectedRows > 0) {
        copiedCount++
      }
    } catch (error) {
      // Se houver qualquer outro erro que não seja duplicata
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
