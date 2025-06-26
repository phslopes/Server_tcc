import express from 'express';
import { loginUser, registerUser } from '../services/authService.js';
import { authorizeRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const { token, role } = await loginUser(username, password);
        res.json({ token, role });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post('/register', async (req, res, next) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password || !role) {
            return res.status(400).json({ message: 'Username, password, and role are required.' });
        }
        if (!['admin', 'professor', 'aluno'].includes(role)) { // RN001
            return res.status(400).json({ message: 'Invalid role. Must be admin, professor, or aluno.' });
        }
        const newUser = await registerUser(username, password, role);
        res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Username already exists.' });
        }
        next(error);
    }
});

export default router;