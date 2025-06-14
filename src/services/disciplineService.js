// backend/services/disciplineService.js
import pool from '../config/db.js';

const getAllDisciplines = async () => {
    const [rows] = await pool.execute('SELECT nome, turno, carga, semestre_curso, curso FROM disciplina');
    return rows;
};

// Alteração: Get por chave composta (nome, turno)
const getDisciplineByCompositeKey = async (nome, turno) => {
    const [rows] = await pool.execute('SELECT nome, turno, carga, semestre_curso, curso FROM disciplina WHERE nome = ? AND turno = ?', [nome, turno]);
    return rows[0];
};

const createDiscipline = async (nome, turno, carga, semestre_curso, curso) => { // RN003
    const [result] = await pool.execute(
        'INSERT INTO disciplina (nome, turno, carga, semestre_curso, curso) VALUES (?, ?, ?, ?, ?)',
        [nome, turno, carga, semestre_curso, curso]
    );
    // Não retorna insertId, pois a PK é composta e já conhecida (nome, turno)
    return { nome, turno, carga, semestre_curso, curso };
};

// Alteração: Update por chave composta (nome, turno)
const updateDiscipline = async (oldNome, oldTurno, newNome, newTurno, carga, semestre_curso, curso) => {
    // Se nome ou turno mudarem, na prática é uma nova disciplina ou uma atualização da PK
    // Para simplificar, assumimos que nome e turno são a identificação única e se houver mudança neles,
    // o frontend deve tratar como delete + create.
    // Aqui, estamos atualizando *outros campos* ou o próprio nome/turno do registro existente.
    // A query abaixo atualiza todos os campos, incluindo a PK se ela for passada no newNome/newTurno.
    const [result] = await pool.execute(
        'UPDATE disciplina SET nome = ?, turno = ?, carga = ?, semestre_curso = ?, curso = ? WHERE nome = ? AND turno = ?',
        [newNome, newTurno, carga, semestre_curso, curso, oldNome, oldTurno]
    );
    return result.affectedRows > 0;
};

// Alteração: Delete por chave composta (nome, turno)
const deleteDiscipline = async (nome, turno) => {
    const [result] = await pool.execute('DELETE FROM disciplina WHERE nome = ? AND turno = ?', [nome, turno]);
    return result.affectedRows > 0;
};

export {
    getAllDisciplines,
    getDisciplineByCompositeKey, // Nova função para GET by PK
    createDiscipline,
    updateDiscipline,
    deleteDiscipline
};