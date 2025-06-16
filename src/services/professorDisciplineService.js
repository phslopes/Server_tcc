// backend/services/professorDisciplineService.js
import pool from '../config/db.js';

// Função para obter todas as associações professor-disciplina
const getAllProfessorDisciplineAssociations = async () => {
    const [rows] = await pool.execute(`
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
    `);
    return rows;
};

// Função para criar uma nova associação professor-disciplina (agora com ano, semestre, dia, hora)
const createProfessorDisciplineAssociation = async (id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio) => { // RN008
    // RN008: Professores podem estar associados a diferentes disciplinas em semestres diferentes.
    // Esta tabela agora define uma 'instância' de professor ensinando uma disciplina em um certo ano/semestre.
    // A chave composta da tabela já garante a unicidade por (id_professor, nome, turno, ano, semestre_alocacao).
    // dia_semana e hora_inicio são atributos adicionais para esta associação.
    const [result] = await pool.execute(
        'INSERT INTO professor_disciplina (id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio]
    );
    return { id_professor, nome, turno, ano, semestre_alocacao, dia_semana, hora_inicio };
};

// Função para obter uma associação específica por sua chave composta
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

// Função para atualizar uma associação professor-disciplina
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

// Função para deletar uma associação específica por sua chave composta
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