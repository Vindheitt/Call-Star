
const express = require('express');
const db = require('../db/database');

const router = express.Router();

// Проверка корректности даты YYYY-MM-DD
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

// GET /api/events
// Получение всех событий
router.get('/', (req, res, next) => {
  try {
    const events = db.prepare(`
      SELECT
        id,
        title,
        date,
        description,
        created_at
      FROM events
      ORDER BY date ASC, id ASC
    `).all();

    res.status(200).json({
      status: 'ok',
      data: events
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/events
// Создание события
router.post('/', (req, res, next) => {
  try {
    const { title, date, description = '' } = req.body;

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Укажите название события'
      });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        status: 'error',
        message: 'Укажите корректную дату в формате YYYY-MM-DD'
      });
    }

    if (typeof description !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Описание должно быть текстом'
      });
    }

    const result = db.prepare(`
      INSERT INTO events (title, date, description)
      VALUES (?, ?, ?)
    `).run(
      title.trim(),
      date,
      description.trim()
    );

    const event = db.prepare(`
      SELECT id, title, date, description, created_at
      FROM events
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      status: 'ok',
      message: 'Событие создано',
      data: event
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/events/import
// Однократный перенос старых событий в базу данных
router.post('/import', (req, res, next) => {
 try {
   const { events } = req.body;

   if (!Array.isArray(events) || events.length > 200) {
     return res.status(400).json({
       status: 'error',
       message: 'Некорректный список событий'
     });
   }

   for (const event of events) {
     if (
       typeof event.title !== 'string' ||
       !event.title.trim() ||
       !isValidDate(event.date) ||
       typeof (event.description ?? '') !== 'string'
     ) {
       return res.status(400).json({
         status: 'error',
         message: 'Одно из событий содержит некорректные данные'
       });
     }
   }

   const count = db.prepare(`
     SELECT COUNT(*) AS count FROM events
   `).get().count;

   if (count > 0) {
     return res.status(409).json({
       status: 'error',
       message: 'В базе уже есть события'
     });
   }

   const insertEvent = db.prepare(`
     INSERT INTO events (title, date, description)
     VALUES (?, ?, ?)
   `);

   const importEvents = db.transaction((items) => {
     for (const event of items) {
       insertEvent.run(
         event.title.trim(),
         event.date,
         (event.description ?? '').trim()
       );
     }
   });

   importEvents(events);

   const savedEvents = db.prepare(`
     SELECT id, title, date, description, created_at
     FROM events
     ORDER BY date ASC, id ASC
   `).all();

   res.status(201).json({
     status: 'ok',
     message: 'События перенесены в базу данных',
     data: savedEvents
   });
 } catch (error) {
   next(error);
 }
});

// DELETE /api/events/:id
// Удаление события
router.delete('/:id', (req, res, next) => {
  try {
    const eventId = Number(req.params.id);

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Некорректный ID события'
      });
    }

    const result = db.prepare(`
      DELETE FROM events WHERE id = ?
    `).run(eventId);

    if (result.changes === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Событие не найдено'
      });
    }

    res.status(200).json({
      status: 'ok',
      message: 'Событие удалено'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
