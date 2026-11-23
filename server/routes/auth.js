
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('../db/database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Вход в аккаунт
router.post('/login', (req, res, next) => {
    try {
        const { login, password } = req.body;

        if (
            typeof login !== 'string' ||
            typeof password !== 'string' ||
            !login.trim() ||
            !password
        ) {
            return res.status(400).json({
                status: 'error',
                message: 'Введите логин и пароль'
            });
        }

        // Ищем пользователя по логину или электронной почте
        const user = db.prepare(`
            SELECT id, username, email, password_hash
            FROM users
            WHERE username = ? COLLATE NOCASE
               OR email = ? COLLATE NOCASE
        `).get(login.trim(), login.trim());

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Неверный логин или пароль'
            });
        }

        // Проверяем пароль
        const passwordMatches = bcrypt.compareSync(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                status: 'error',
                message: 'Неверный логин или пароль'
            });
        }

        // Создаём JWT-токен на 8 часов
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                email: user.email
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            status: 'ok',
            message: 'Авторизация успешна',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        next(error);
    }
});

// Проверка действующей авторизации
router.get('/me', authenticateToken, (req, res) => {
    res.json({
        status: 'ok',
        user: req.user
    });
});

module.exports = router;
