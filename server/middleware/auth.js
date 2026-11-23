
const jwt = require('jsonwebtoken');

// Секретный ключ для подписи JWT-токенов.
// В дальнейшем вынесем его в переменные окружения.
const JWT_SECRET = process.env.JWT_SECRET || 'callstar-development-secret-change-me';

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    // Проверяем наличие токена
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            status: 'error',
            message: 'Требуется авторизация'
        });
    }

    const token = authHeader.split(' ')[1];

    // Проверяем подлинность и срок действия токена
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                status: 'error',
                message: 'Недействительный или просроченный токен'
            });
        }

        req.user = user;
        next();
    });
}

module.exports = {
    authenticateToken,
    JWT_SECRET
};
