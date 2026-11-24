
const express = require('express');
const cors = require('cors');

// Подключаем базу данных
const db = require('./db/database');

// Подключаем маршруты
const authRouter = require('./routes/auth');
const studentsRouter = require('./routes/students');
const attendanceRouter = require('./routes/attendance');
const eventsRouter = require('./routes/events');

// Подключаем middleware авторизации
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Открытые маршруты
app.use('/api/auth', authRouter);

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'CallStar API is running'
    });
});

// Защищённые маршруты
app.use('/api/students', authenticateToken, studentsRouter);
app.use('/api/attendance', authenticateToken, attendanceRouter);
app.use('/api/events', authenticateToken, eventsRouter);

// Обработка несуществующих маршрутов
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found'
    });
});

// Обработка ошибок сервера
app.use((err, req, res, next) => {
    console.error('Server error:', err);

    res.status(500).json({
        status: 'error',
        message: 'Internal server error'
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`CallStar API running at http://localhost:${PORT}`);
});
