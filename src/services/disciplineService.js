// backend/services/disciplineService.js
import pool from '../config/db.js';

const getAllDisciplines = async () => {
    const [rows] = await pool.execute('SELECT * FROM disciplina');
    return rows;
};

const getDisciplineById = async (id) => {
    const [rows] = await pool.execute('SELECT * FROM disciplina WHERE id_disciplina = ?', [id]);
    return rows[0];
};

const createDiscipline = async (nome, turno, carga, semestre_curso, curso) => { // RN003
    const [result] = await pool.execute(
        'INSERT INTO disciplina (nome, turno, carga, semestre_curso, curso) VALUES (?, ?, ?, ?, ?)',
        [nome, turno, carga, semestre_curso, curso]
    );
    return { id_disciplina: result.insertId, nome, turno, carga, semestre_curso, curso };
};

const updateDiscipline = async (id, nome, turno, carga, semestre_curso, curso) => {
    const [result] = await pool.execute(
        'UPDATE disciplina SET nome = ?, turno = ?, carga = ?, semestre_curso = ?, curso = ? WHERE id_disciplina = ?',
        [nome, turno, carga, semestre_curso, curso, id]
    );
    return result.affectedRows > 0;
};

const deleteDiscipline = async (id) => {
    const [result] = await pool.execute('DELETE FROM disciplina WHERE id_disciplina = ?', [id]);
    return result.affectedRows > 0;
};

export {
    getAllDisciplines,
    getDisciplineById,
    createDiscipline,
    updateDiscipline,
    deleteDiscipline
};