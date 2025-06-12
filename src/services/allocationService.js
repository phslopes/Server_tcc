// backend/services/allocationService.js
import pool from '../config/db.js';

const checkRoomAvailability = async (id_sala, dia_semana, hora_inicio, hora_fim, allocationIdToExclude = null) => { // RN007
    // RN007: Duas disciplinas não podem estar na mesma sala no mesmo horário.
    // Check for overlapping times
    const query = `
        SELECT * FROM alocacao
        WHERE id_sala = ? AND dia_semana = ?
        AND (
            (hora_inicio < ? AND hora_fim > ?) OR -- Existing allocation starts before and ends after new one
            (hora_inicio >= ? AND hora_inicio < ?) OR -- Existing allocation starts during new one
            (hora_fim > ? AND hora_fim <= ?) -- Existing allocation ends during new one
        )
        ${allocationIdToExclude ? `AND id_alocacao != ${pool.escape(allocationIdToExclude)}` : ''}
    `;

    const [rows] = await pool.execute(query, [
        id_sala,
        dia_semana,
        hora_fim,
        hora_inicio,
        hora_inicio,
        hora_fim,
        hora_inicio,
        hora_fim
    ]);
    return rows.length === 0; // If no rows, room is available
};

const createAllocation = async (id_sala, id_professor, id_disciplina, ano, semestre_alocacao, dia_semana, hora_inicio, hora_fim, tipo_alocacao) => { // RN006
    // RN006: Professores podem solicitar salas... apenas para salas que estão disponíveis no horário informado atual.
    const isAvailable = await checkRoomAvailability(id_sala, dia_semana, hora_inicio, hora_fim);
    if (!isAvailable) {
        throw new Error('Sala já ocupada neste horário.'); // RN006, RN007
    }

    // Optionally, check if professor is associated with the discipline (RN008)
    const [profDiscRows] = await pool.execute(
        'SELECT * FROM professor_disciplina WHERE id_professor = ? AND id_disciplina = ?',
        [id_professor, id_disciplina]
    );
    if (profDiscRows.length === 0) {
        throw new Error('Professor não está associado a esta disciplina.'); // RN008
    }

    const status = 'Pendente'; // Default status for new requests
    const [result] = await pool.execute(
        'INSERT INTO alocacao (id_sala, id_professor, id_disciplina, ano, semestre_alocacao, dia_semana, hora_inicio, hora_fim, tipo_alocacao, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id_sala, id_professor, id_disciplina, ano, semestre_alocacao, dia_semana, hora_inicio, hora_fim, tipo_alocacao, status]
    );
    return { id_alocacao: result.insertId, id_sala, id_professor, id_disciplina, ano, semestre_alocacao, dia_semana, hora_inicio, hora_fim, tipo_alocacao, status };
};

const getAllAllocations = async () => {
    const [rows] = await pool.execute(`
        SELECT
            a.id_alocacao,
            a.ano,
            a.semestre_alocacao,
            a.dia_semana,
            a.hora_inicio,
            a.hora_fim,
            a.tipo_alocacao,
            a.status AS alocacao_status,
            s.numero_sala,
            s.tipo_sala,
            p.nome AS professor_nome,
            d.nome AS disciplina_nome,
            d.turno AS disciplina_turno
        FROM alocacao a
        JOIN sala s ON a.id_sala = s.id_sala
        JOIN professor p ON a.id_professor = p.id_professor
        JOIN disciplina d ON a.id_disciplina = d.id_disciplina
    `);
    return rows;
};

const getAllocationsByProfessor = async (id_professor) => {
    const [rows] = await pool.execute(`
        SELECT
            a.id_alocacao,
            a.ano,
            a.semestre_alocacao,
            a.dia_semana,
            a.hora_inicio,
            a.hora_fim,
            a.tipo_alocacao,
            a.status AS alocacao_status,
            s.numero_sala,
            s.tipo_sala,
            p.nome AS professor_nome,
            d.nome AS disciplina_nome,
            d.turno AS disciplina_turno
        FROM alocacao a
        JOIN sala s ON a.id_sala = s.id_sala
        JOIN professor p ON a.id_professor = p.id_professor
        JOIN disciplina d ON a.id_disciplina = d.id_disciplina
        WHERE a.id_professor = ?
    `, [id_professor]);
    return rows;
};

const updateAllocationStatus = async (id_alocacao, status) => {
    const [result] = await pool.execute(
        'UPDATE alocacao SET status = ? WHERE id_alocacao = ?',
        [status, id_alocacao]
    );
    return result.affectedRows > 0;
};

const deleteAllocation = async (id) => {
    const [result] = await pool.execute('DELETE FROM alocacao WHERE id_alocacao = ?', [id]);
    return result.affectedRows > 0;
};

export {
    createAllocation,
    getAllAllocations,
    getAllocationsByProfessor,
    updateAllocationStatus,
    deleteAllocation
};