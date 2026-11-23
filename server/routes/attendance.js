
const express = require('express');
const db = require('../db/database');

const router = express.Router();

// Допустимые статусы посещаемости
const VALID_STATUSES = [
  'Присутствует',
  'Отсутствует',
  'Уважительная',
  'Болеет',
  'Опоздал'
];

// Проверка формата и корректности даты YYYY-MM-DD
function isValidDate(date) {
  if (typeof date !== 'string') {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  return !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === date;
}

// GET /api/attendance?date=2026-11-23
// GET /api/attendance?date=2026-11-23&lesson_number=1
// Получение посещаемости за день или отдельную пару
router.get('/', (req, res, next) => {
  try {
    const { date, lesson_number } = req.query;

    if (!isValidDate(date)) {
      return res.status(400).json({
        status: 'error',
        message: 'Укажите корректную дату в формате YYYY-MM-DD'
      });
    }

    let query = `
      SELECT
        attendance.id,
        attendance.student_id,
        students.full_name,
        attendance.date,
        attendance.lesson_number,
        attendance.status,
        attendance.created_at
      FROM attendance
      INNER JOIN students
        ON students.id = attendance.student_id
      WHERE attendance.date = ?
    `;

    const params = [date];

    if (lesson_number !== undefined) {
      const lessonNumber = Number(lesson_number);

      if (!Number.isInteger(lessonNumber) || lessonNumber <= 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректный номер пары'
        });
      }

      query += ' AND attendance.lesson_number = ?';
      params.push(lessonNumber);
    }

    query += `
      ORDER BY attendance.lesson_number ASC,
      students.full_name COLLATE NOCASE ASC
    `;

    const records = db.prepare(query).all(...params);

    res.status(200).json({
      status: 'ok',
      data: records
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/attendance
// Сохранение статуса одного студента
router.post('/', (req, res, next) => {
  try {
    const {
      student_id,
      date,
      lesson_number,
      status
    } = req.body;

    const studentId = Number(student_id);
    const lessonNumber = Number(lesson_number);

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Некорректный ID студента'
      });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        status: 'error',
        message: 'Укажите корректную дату в формате YYYY-MM-DD'
      });
    }

    if (!Number.isInteger(lessonNumber) || lessonNumber <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Некорректный номер пары'
      });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Недопустимый статус посещаемости'
      });
    }

    // Проверяем существование студента
    const student = db.prepare(`
      SELECT id FROM students WHERE id = ?
    `).get(studentId);

    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Студент не найден'
      });
    }

    // Сохраняем запись или обновляем существующую
    db.prepare(`
      INSERT INTO attendance (
        student_id,
        date,
        lesson_number,
        status
      )
      VALUES (?, ?, ?, ?)
      ON CONFLICT(student_id, date, lesson_number)
      DO UPDATE SET status = excluded.status
    `).run(studentId, date, lessonNumber, status);

    // Получаем сохранённую запись
    const record = db.prepare(`
      SELECT
        attendance.id,
        attendance.student_id,
        students.full_name,
        attendance.date,
        attendance.lesson_number,
        attendance.status,
        attendance.created_at
      FROM attendance
      INNER JOIN students
        ON students.id = attendance.student_id
      WHERE attendance.student_id = ?
        AND attendance.date = ?
        AND attendance.lesson_number = ?
    `).get(studentId, date, lessonNumber);

    res.status(200).json({
      status: 'ok',
      message: 'Посещаемость сохранена',
      data: record
    });
  } catch (error) {
    next(error);
  }
});


// POST /api/attendance/bulk
// Массовое сохранение посещаемости группы
router.post('/bulk', (req, res, next) => {
  try {
    const { date, lesson_number, records } = req.body;

    const lessonNumber = Number(lesson_number);

    // Проверяем дату
    if (!isValidDate(date)) {
      return res.status(400).json({
        status: 'error',
        message: 'Укажите корректную дату'
      });
    }

    // Проверяем номер пары
    if (!Number.isInteger(lessonNumber) || lessonNumber <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Некорректный номер пары'
      });
    }

    // Проверяем массив записей
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Необходимо передать список студентов'
      });
    }

    // Проверяем каждую запись до изменения базы
    const studentIds = new Set();

    for (const record of records) {
      const studentId = Number(record.student_id);

      if (!Number.isInteger(studentId) || studentId <= 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректный ID одного из студентов'
        });
      }

      if (studentIds.has(studentId)) {
        return res.status(400).json({
          status: 'error',
          message: 'В запросе обнаружены повторяющиеся студенты'
        });
      }

      studentIds.add(studentId);

      if (!VALID_STATUSES.includes(record.status)) {
        return res.status(400).json({
          status: 'error',
          message: 'Недопустимый статус посещаемости'
        });
      }
    }

    // Проверяем существование всех студентов
    const findStudent = db.prepare(`
      SELECT id FROM students WHERE id = ?
    `);

    for (const studentId of studentIds) {
      if (!findStudent.get(studentId)) {
        return res.status(404).json({
          status: 'error',
          message: `Студент с ID ${studentId} не найден`
        });
      }
    }

    // Подготавливаем SQL-запрос
    const saveAttendance = db.prepare(`
      INSERT INTO attendance (
        student_id,
        date,
        lesson_number,
        status
      )
      VALUES (?, ?, ?, ?)
      ON CONFLICT(student_id, date, lesson_number)
      DO UPDATE SET status = excluded.status
    `);

    // Сохраняем все записи одной транзакцией
    const saveAll = db.transaction((attendanceRecords) => {
      for (const record of attendanceRecords) {
        saveAttendance.run(
          Number(record.student_id),
          date,
          lessonNumber,
          record.status
        );
      }
    });

    saveAll(records);

    // Получаем сохранённые записи
    const savedRecords = db.prepare(`
      SELECT
        attendance.id,
        attendance.student_id,
        students.full_name,
        attendance.date,
        attendance.lesson_number,
        attendance.status,
        attendance.created_at
      FROM attendance
      INNER JOIN students
        ON students.id = attendance.student_id
      WHERE attendance.date = ?
        AND attendance.lesson_number = ?
      ORDER BY students.full_name COLLATE NOCASE ASC
    `).all(date, lessonNumber);

    res.status(200).json({
      status: 'ok',
      message: 'Посещаемость группы сохранена',
      data: savedRecords
    });
  } catch (error) {
    next(error);
  }
});


// GET /api/attendance/history/:studentId
// Получение полной истории посещаемости студента
router.get('/history/:studentId', (req, res, next) => {
  try {
    const studentId = Number(req.params.studentId);

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Некорректный ID студента'
      });
    }

    // Проверяем существование студента
    const student = db.prepare(`
      SELECT id, full_name
      FROM students
      WHERE id = ?
    `).get(studentId);

    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Студент не найден'
      });
    }

    // Получаем историю посещаемости
    const history = db.prepare(`
      SELECT
        id,
        date,
        lesson_number,
        status,
        created_at
      FROM attendance
      WHERE student_id = ?
      ORDER BY date DESC, lesson_number ASC
    `).all(studentId);

    res.status(200).json({
      status: 'ok',
      data: {
        student,
        history
      }
    });
  } catch (error) {
    next(error);
  }
});


module.exports = router;
