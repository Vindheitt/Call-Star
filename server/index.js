const express = require('express');
const cors = require('cors');

// Подключаем базу данных
const db = require('./db/database');

const studentsRouter = require('./routes/students');
const attendanceRouter = require('./routes/attendance');

const app = express();
const PORT = 3001;

// Подключаем middleware
app.use(cors());
app.use(express.json());
// Маршруты студентов
app.use('/api/students', studentsRouter);

// Маршруты посещаемости
app.use('/api/attendance', attendanceRouter);

// Проверочный маршрут
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'CallStar API is running'
  });
});

// Обработка неизвестных маршрутов
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Общая обработка ошибок
app.use((err, req, res, next) => {
  console.error('Server error:', err);

  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log('================================');
  console.log('CallStar Backend started');
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log('================================');
});
