import pool from '../config/db.js';

const getAllProfessors = async () => {
    const [rows] = await pool.execute('SELECT * FROM professor');
    return rows;
};

const getProfessorById = async (id) => {
    const [rows] = await pool.execute('SELECT * FROM professor WHERE id_professor = ?', [id]);
    return rows[0];
};

const createProfessor = async (nome, email, telefone) => { // RN004
    const [result] = await pool.execute(
        'INSERT INTO professor (nome, email, telefone) VALUES (?, ?, ?)',
        [nome, email, telefone]
    );
    return { id_professor: result.insertId, nome, email, telefone };
};

const updateProfessor = async (id, nome, email, telefone) => {
    const [result] = await pool.execute(
        'UPDATE professor SET nome = ?, email = ?, telefone = ? WHERE id_professor = ?',
        [nome, email, telefone, id]
    );
    return result.affectedRows > 0;
};

const deleteProfessor = async (id) => {
    const [result] = await pool.execute('DELETE FROM professor WHERE id_professor = ?', [id]);
    return result.affectedRows > 0;
};

export {
    getAllProfessors,
    getProfessorById,
    createProfessor,
    updateProfessor,
    deleteProfessor
};