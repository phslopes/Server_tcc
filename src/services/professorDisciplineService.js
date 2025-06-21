// backend/services/professorDisciplineService.js
import pool from '../config/db.js';

// Função para obter todas as associações professor-disciplina com nomes
const getAllProfessorDisciplineAssociations = async () => {
    const [rows] = await pool.execute(`
        SELECT
            pd.id_professor,
            p.nome AS professor_nome,          -- Alias para o nome do professor
            pd.nome AS disciplina_nome,        -- Alias para o nome da disciplina (já estava correto)
            pd.turno AS disciplina_turno,      -- Alias para o turno da disciplina (já estava correto)
            pd.ano,
            pd.semestre_alocacao,
            pd.dia_semana,
            pd.hora_inicio
        FROM professor_disciplina pd
        JOIN professor p ON pd.id_professor = p.id_professor
    `);
    return rows;
};

// As outras funções (create, getByCompositeKey, update, delete) não precisam de alterações aqui
// pois elas manipulam os dados brutos ou por PK, e não para exibição com nomes juntos.
const createProfessorDisciplineAssociation = async (id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio) => { // RN008
    const [result] = await pool.execute(
        'INSERT INTO professor_disciplina (id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio]
    );
    return { id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio };
};

const getProfessorDisciplineAssociationByCompositeKey = async (id_professor, nome, turno, ano, semestre_alocacao) => {
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
    );
    return rows[0];
};

const updateProfessorDisciplineAssociation = async (
    oldIdProfessor, oldNomeDisc, oldTurnoDisc, oldAno, oldSemestreAlocacao,
    newIdProfessor, newNomeDisc, newTurnoDisc, newAno, newSemestreAlocacao,
    newDiaSemana, newHoraInicio
) => {
    const [result] = await pool.execute(
        `UPDATE professor_disciplina
         SET id_professor = ?, nome = ?, turno = ?, ano = ?, semestre_alocacao = ?, dia_semana = ?, hora_inicio = ?
         WHERE id_professor = ? AND nome = ? AND turno = ? AND ano = ? AND semestre_alocacao = ?`,
        [newIdProfessor, newNomeDisc, newTurnoDisc, newAno, newSemestreAlocacao, newDiaSemana, newHoraInicio,
         oldIdProfessor, oldNomeDisc, oldTurnoDisc, oldAno, oldSemestreAlocacao]
    );
    return result.affectedRows > 0;
};

const deleteProfessorDisciplineAssociation = async (id_professor, nome, turno, ano, semestre_alocacao) => {
    const [result] = await pool.execute(
        'DELETE FROM professor_disciplina WHERE id_professor = ? AND nome = ? AND turno = ? AND ano = ? AND semestre_alocacao = ?',
        [id_professor, nome, turno, ano, semestre_alocacao]
    );
    return result.affectedRows > 0;
};

export {
    getAllProfessorDisciplineAssociations,
    createProfessorDisciplineAssociation,
    getProfessorDisciplineAssociationByCompositeKey,
    updateProfessorDisciplineAssociation,
    deleteProfessorDisciplineAssociation
};