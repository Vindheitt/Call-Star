
const express = require('express');
const db = require('../db/database');

const router = express.Router();

// GET /api/students
// Получение списка всех студентов
router.get('/', (req, res, next) => {
  try {
    const students = db.prepare(`
      SELECT id, full_name, created_at
      FROM students
      ORDER BY full_name COLLATE NOCASE ASC
    `).all();

    res.status(200).json({
      status: 'ok',
      data: students
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/students
// Добавление нового студента
router.post('/', (req, res, next) => {
  try {
    const { full_name } = req.body;

    // Проверяем ФИО
    if (typeof full_name !== 'string' || !full_name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Укажите корректное ФИО студента'
      });
    }

    const studentName = full_name.trim();

    // Добавляем студента в SQLite
    const result = db.prepare(`
      INSERT INTO students (full_name)
      VALUES (?)
    `).run(studentName);

    // Получаем созданную запись
    const student = db.prepare(`
      SELECT id, full_name, created_at
      FROM students
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      status: 'ok',
      message: 'Студент успешно добавлен',
      data: student
    });
  } catch (error) {
    next(error);
  }
});


// PUT /api/students/:id
// Редактирование ФИО студента
router.put('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { full_name } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Некорректный ID студента'
      });
    }

    if (typeof full_name !== 'string' || !full_name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Укажите корректное ФИО студента'
      });
    }

    const student = db.prepare(`
      SELECT id FROM students WHERE id = ?
    `).get(id);

    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Студент не найден'
      });
    }

    db.prepare(`
      UPDATE students
      SET full_name = ?
      WHERE id = ?
    `).run(full_name.trim(), id);

    const updatedStudent = db.prepare(`
      SELECT id, full_name, created_at
      FROM students
      WHERE id = ?
    `).get(id);

    res.status(200).json({
      status: 'ok',
      message: 'Данные студента обновлены',
      data: updatedStudent
    });
  } catch (error) {
    next(error);
  }
});


// DELETE /api/students/:id
// Удаление студента
router.delete('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Некорректный ID студента'
      });
    }

    const student = db.prepare(`
      SELECT id FROM students WHERE id = ?
    `).get(id);

    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Студент не найден'
      });
    }

    db.prepare(`
      DELETE FROM students WHERE id = ?
    `).run(id);

    res.status(200).json({
      status: 'ok',
      message: 'Студент успешно удалён'
    });
  } catch (error) {
    next(error);
  }
});


module.exports = router;
