
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Путь к папке с базой данных
const dataDirectory = path.join(__dirname, '..', 'data');

// Создаём папку data, если её ещё нет
if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

// Подключаем SQLite
const dbPath = path.join(dataDirectory, 'callstar.db');

const db = new Database(dbPath);

// Включаем проверку внешних ключей
db.pragma('foreign_keys = ON');

// Настраиваем режим журнала SQLite
db.pragma('journal_mode = WAL');

// Создаём таблицы при первом запуске
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL CHECK(length(trim(full_name)) > 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    lesson_number INTEGER NOT NULL CHECK(lesson_number > 0),
    status TEXT NOT NULL CHECK(
      status IN (
        'Присутствует',
        'Отсутствует',
        'Уважительная',
        'Болеет',
        'Опоздал'
      )
    ),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id)
      REFERENCES students(id)
      ON DELETE CASCADE,

    UNIQUE(student_id, date, lesson_number)
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL CHECK(length(trim(title)) > 0),
    date TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_attendance_date
    ON attendance(date);

  CREATE INDEX IF NOT EXISTS idx_attendance_student
    ON attendance(student_id);

  CREATE INDEX IF NOT EXISTS idx_events_date
    ON events(date);
`);

console.log('SQLite database connected successfully');
console.log(`Database location: ${dbPath}`);

module.exports = db;
