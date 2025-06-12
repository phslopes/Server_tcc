// backend/services/authService.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const registerUser = async (username, password, role) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, hashedPassword, role]
    );
    return { id: result.insertId, username, role };
};

const loginUser = async (username, password) => { // RN001
    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];

    if (!user) {
        throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
        { id: user.id_user, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
    return { token, role: user.role };
};

export { registerUser, loginUser };