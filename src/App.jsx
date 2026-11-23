
import React, { useEffect, useMemo, useState } from 'react';
import { studentsApi } from './api';

const STATUSES = ['Присутствует', 'Отсутствует', 'Уважительная', 'Болеет', 'Опоздал'];

const statusClass = {
  'Присутствует': '',
  'Отсутствует': 'absent',
  'Уважительная': 'excused',
  'Болеет': 'sick',
  'Опоздал': 'late'
};

const iso = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseDate = s => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const read = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

const save = (key, value) =>
  localStorage.setItem(key, JSON.stringify(value));

const today = new Date();

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [login, setLogin] = useState('');
  const [page, setPage] = useState('calendar');
  const [month, setMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(iso(today));
  const [lesson, setLesson] = useState('1');

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState('');

  const [attendance, setAttendance] = useState(() =>
    read('cs_attendance', {})
  );

  const [events, setEvents] = useState(() =>
    read('cs_events', [
      {
        title: 'Проверить расписание на следующую неделю',
        date: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)),
        description: 'Уточнить возможные изменения в расписании.'
      },
      {
        title: 'Сдать лабораторную работу',
        date: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5)),
        description: 'Не забудьте загрузить работу в Moodle.'
      }
    ])
  );

  const [draftStatuses, setDraftStatuses] = useState({});
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventDraft, setEventDraft] = useState({
    title: '',
    date: selectedDate,
    description: ''
  });
  const [saveMessage, setSaveMessage] = useState('');

  // Загрузка студентов из базы данных
  useEffect(() => {
    const loadStudents = async () => {
      try {
        setStudentsLoading(true);
        setStudentsError('');

        const result = await studentsApi.getAll();
        setStudents(result.data);
      } catch (error) {
        setStudentsError(error.message);
      } finally {
        setStudentsLoading(false);
      }
    };

    loadStudents();
  }, []);

  const attendanceKey = `${selectedDate}_${lesson}`;
  const currentSaved = attendance[attendanceKey] || {};

  const statuses = Object.keys(draftStatuses).length
    ? draftStatuses
    : Object.fromEntries(
        students.map(student => [
          student.full_name,
          currentSaved[student.full_name] || 'Присутствует'
        ])
      );

  const persistAttendance = value => {
    setAttendance(value);
    save('cs_attendance', value);
  };

  const persistEvents = value => {
    setEvents(value);
    save('cs_events', value);
  };

  const openPage = name => {
    setPage(name);
    setSaveMessage('');

    if (name === 'attendance') {
      setDraftStatuses({});
    }
  };

  const monthTitle = month.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric'
  });

  const calendarCells = useMemo(() => {
    const y = month.getFullYear();
    const m = month.getMonth();

    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();

    const cells = [];

    for (let i = 0; i < offset; i++) {
      cells.push({
        date: new Date(y, m, 1 - offset + i),
        outside: true
      });
    }

    for (let n = 1; n <= days; n++) {
      cells.push({
        date: new Date(y, m, n),
        outside: false
      });
    }

    while (cells.length % 7) {
      cells.push({
        date: new Date(y, m, days + (cells.length - (offset + days)) + 1),
        outside: true
      });
    }

    return cells;
  }, [month, attendance, events]);

  const changeMonth = amount => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + amount, 1));
  };

  const goAttendance = date => {
    setSelectedDate(date);
    setDraftStatuses({});
    openPage('attendance');
  };

  const changeStatus = (student, status) => {
    setDraftStatuses(prev => ({
      ...statuses,
      ...prev,
      [student]: status
    }));
  };

  const saveAttendance = () => {
    const next = {
      ...attendance,
      [attendanceKey]: statuses
    };

    persistAttendance(next);
    setDraftStatuses({});
    setSaveMessage('Посещаемость сохранена.');
  };

  // Добавление студента через API
  const addStudent = async e => {
    e.preventDefault();

    const name = studentName.trim();

    if (!name) return;

    try {
      setStudentsError('');

      const result = await studentsApi.create(name);

      setStudents(prev => [...prev, result.data]);

      setStudentName('');
      setShowStudentForm(false);
    } catch (error) {
      setStudentsError(error.message);
    }
  };

  // Удаление студента через API
  const deleteStudent = async id => {
    try {
      setStudentsError('');

      await studentsApi.delete(id);

      setStudents(prev =>
        prev.filter(student => student.id !== id)
      );
    } catch (error) {
      setStudentsError(error.message);
    }
  };

  const addEvent = e => {
    e.preventDefault();

    if (!eventDraft.title.trim() || !eventDraft.date) return;

    persistEvents([
      ...events,
      {
        ...eventDraft,
        title: eventDraft.title.trim(),
        description: eventDraft.description.trim()
      }
    ]);

    setEventDraft({
      title: '',
      date: selectedDate,
      description: ''
    });

    setShowEventForm(false);
  };

  const sortedEvents = [...events].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  if (!loggedIn) {
    return (
      <section className="login-screen">
        <div className="login-card">
          <div className="brand brand-login">
            <span className="brand-star">★</span>
            CallStar
          </div>

          <h1>Вход в CallStar</h1>
          <p className="muted">Войдите, чтобы управлять группой</p>

          <form onSubmit={e => {
            e.preventDefault();
            setLoggedIn(true);
          }}>
            <label htmlFor="login">Логин</label>
            <input
              id="login"
              autoComplete="username"
              placeholder="Например, starosta"
              value={login}
              onChange={e => setLogin(e.target.value)}
              required
            />

            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Введите пароль"
              required
            />

            <button className="primary full" type="submit">
              Войти
            </button>
          </form>

          <p className="login-hint">
            Демонстрационный режим: подойдёт любой логин и пароль.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={e => {
            e.preventDefault();
            openPage('calendar');
          }}
        >
          <span className="brand-star">★</span>
          CallStar
        </a>

        <nav className="main-nav">
          {[
            ['calendar', 'Календарь'],
            ['attendance', 'Посещаемость'],
            ['students', 'Студенты'],
            ['events', 'События']
          ].map(([id, label]) => (
            <button
              key={id}
              className={`nav-link ${page === id ? 'active' : ''}`}
              onClick={() => openPage(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="user-area">
          <span>Группа ПИ-609-52 · {login || 'староста'}</span>
          <button
            className="ghost small"
            onClick={() => setLoggedIn(false)}
          >
            Выйти
          </button>
        </div>
      </header>

      <main className="container">
        {page === 'calendar' && (
          <section className="page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО</p>
                <h1>Календарь</h1>
                <p className="muted">
                  Посещаемость и события вашей группы
                </p>
              </div>

              <div className="calendar-controls">
                <button
                  className="icon-btn"
                  aria-label="Предыдущий месяц"
                  onClick={() => changeMonth(-1)}
                >
                  ‹
                </button>

                <button
                  className="secondary"
                  onClick={() => setMonth(
                    new Date(today.getFullYear(), today.getMonth(), 1)
                  )}
                >
                  Сегодня
                </button>

                <button
                  className="icon-btn"
                  aria-label="Следующий месяц"
                  onClick={() => changeMonth(1)}
                >
                  ›
                </button>
              </div>
            </div>

            <div className="calendar-card">
              <div className="calendar-title">
                <h2>{monthTitle}</h2>
                <span className="muted">
                  Выберите день, чтобы открыть посещаемость
                </span>
              </div>

              <div className="calendar-grid weekdays">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(x => (
                  <div key={x}>{x}</div>
                ))}
              </div>

              <div className="calendar-grid">
                {calendarCells.map(({ date, outside }) => {
                  const d = iso(date);
                  const done = Object.keys(attendance).some(k =>
                    k.startsWith(d + '_')
                  );
                  const hasEvent = events.some(e => e.date === d);
                  const past = date < new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate()
                  );
                  const weekend = [0, 6].includes(date.getDay());

                  return (
                    <button
                      key={d}
                      className={`day ${outside ? 'outside' : ''} ${weekend ? 'weekend' : ''} ${d === iso(today) ? 'today' : ''}`}
                      onClick={() => goAttendance(d)}
                    >
                      <span className="day-num">{date.getDate()}</span>

                      {hasEvent ? (
                        <span className="day-tag event">Событие</span>
                      ) : done ? (
                        <span className="day-tag">Отмечено</span>
                      ) : past ? (
                        <span className="day-tag empty">Не отмечено</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="legend">
                <span><i className="dot dot-done" />Отмечено</span>
                <span><i className="dot dot-empty" />Не отмечено</span>
                <span><i className="dot dot-event" />Есть событие</span>
              </div>
            </div>

            <div className="section-heading">
              <div>
                <h2>Ближайшие события</h2>
                <p className="muted">Важная информация для группы</p>
              </div>

              <button
                className="primary"
                onClick={() => openPage('events')}
              >
                Все события
              </button>
            </div>

            <div className="event-list">
              {sortedEvents.slice(0, 3).map((ev, i) => (
                <EventCard
                  key={`${ev.date}-${i}`}
                  event={ev}
                />
              ))}

              {!events.length && (
                <Empty>Пока нет событий</Empty>
              )}
            </div>
          </section>
        )}

        {page === 'attendance' && (
          <section className="page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">ЖУРНАЛ ГРУППЫ</p>
                <h1>Посещаемость</h1>
                <p className="muted">
                  Отметьте статус каждого студента на выбранной паре
                </p>
              </div>

              <div className="date-control">
                <label htmlFor="attendanceDate">Дата</label>
                <input
                  id="attendanceDate"
                  type="date"
                  value={selectedDate}
                  onChange={e => {
                    setSelectedDate(e.target.value);
                    setDraftStatuses({});
                  }}
                />
              </div>
            </div>

            <div className="toolbar">
              <div className="lesson-tabs">
                {[
                  ['1', '1 пара · 8:30'],
                  ['2', '2 пара · 10:00'],
                  ['3', '3 пара · 11:30']
                ].map(([n, label]) => (
                  <button
                    key={n}
                    className={`lesson-tab ${lesson === n ? 'active' : ''}`}
                    onClick={() => {
                      setLesson(n);
                      setDraftStatuses({});
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="toolbar-actions">
                <button
                  className="secondary"
                  onClick={() => setDraftStatuses(
                    Object.fromEntries(
                      students.map(student => [
                        student.full_name,
                        'Присутствует'
                      ])
                    )
                  )}
                >
                  Все присутствуют
                </button>

                <button
                  className="primary"
                  onClick={saveAttendance}
                >
                  Сохранить
                </button>
              </div>
            </div>

            {studentsError && (
              <p className="success-message">{studentsError}</p>
            )}

            <div className="summary-row">
              {STATUSES.map(s => [
                s,
                students.filter(st =>
                  (statuses[st.full_name] || 'Присутствует') === s
                ).length
              ])
                .filter(x => x[1] > 0)
                .map(([s, n]) => (
                  <span
                    key={s}
                    className={`summary-chip ${statusClass[s]}`}
                  >
                    {s}: {n}
                  </span>
                ))}
            </div>

            <div className="table-card">
              <div className="table-head">
                <span>№</span>
                <span>Студент</span>
                <span>Статус</span>
              </div>

              {studentsLoading ? (
                <Empty>Загружаем список студентов...</Empty>
              ) : (
                students.map((student, i) => (
                  <div className="student-row" key={student.id}>
                    <span>{i + 1}</span>
                    <span className="student-name">
                      {student.full_name}
                    </span>

                    <span>
                      <select
                        className={`status-select ${statusClass[statuses[student.full_name] || 'Присутствует']}`}
                        value={statuses[student.full_name] || 'Присутствует'}
                        onChange={e =>
                          changeStatus(student.full_name, e.target.value)
                        }
                      >
                        {STATUSES.map(st => (
                          <option key={st}>{st}</option>
                        ))}
                      </select>
                    </span>
                  </div>
                ))
              )}

              {!studentsLoading && !students.length && !studentsError && (
                <Empty>
                  Сначала добавьте студентов в разделе «Студенты».
                </Empty>
              )}
            </div>

            <p className="success-message" aria-live="polite">
              {saveMessage}
            </p>
          </section>
        )}

        {page === 'students' && (
          <section className="page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">СОСТАВ ГРУППЫ</p>
                <h1>Студенты</h1>
                <p className="muted">
                  Добавляйте и редактируйте список группы
                </p>
              </div>

              <button
                className="primary"
                onClick={() => setShowStudentForm(v => !v)}
              >
                ＋ Добавить студента
              </button>
            </div>

            {showStudentForm && (
              <form className="inline-form" onSubmit={addStudent}>
                <div>
                  <label htmlFor="studentName">
                    Фамилия и инициалы
                  </label>

                  <input
                    id="studentName"
                    placeholder="Например, Иванов И. И."
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    required
                  />
                </div>

                <button className="primary" type="submit">
                  Добавить
                </button>

                <button
                  className="secondary"
                  type="button"
                  onClick={() => setShowStudentForm(false)}
                >
                  Отмена
                </button>
              </form>
            )}

            {studentsError && (
              <p className="success-message">{studentsError}</p>
            )}

            <div className="table-card">
              <div className="table-head student-head">
                <span>№</span>
                <span>Студент</span>
                <span>Действие</span>
              </div>

              {studentsLoading ? (
                <Empty>Загружаем список студентов...</Empty>
              ) : (
                students.map((student, i) => (
                  <div
                    className="student-row student-head"
                    key={student.id}
                  >
                    <span>{i + 1}</span>
                    <span className="student-name">
                      {student.full_name}
                    </span>

                    <span>
                      <button
                        className="delete-btn"
                        onClick={() => {
                          if (window.confirm('Удалить студента из списка?')) {
                            deleteStudent(student.id);
                          }
                        }}
                      >
                        Удалить
                      </button>
                    </span>
                  </div>
                ))
              )}

              {!studentsLoading && !students.length && !studentsError && (
                <Empty>
                  Список пока пуст. Добавьте первого студента.
                </Empty>
              )}
            </div>
          </section>
        )}

        {page === 'events' && (
          <section className="page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">ОБЪЯВЛЕНИЯ ГРУППЫ</p>
                <h1>События и заметки</h1>
                <p className="muted">
                  Переносы, отмены занятий, дедлайны и объявления
                </p>
              </div>

              <button
                className="primary"
                onClick={() => {
                  setEventDraft({
                    title: '',
                    date: selectedDate,
                    description: ''
                  });
                  setShowEventForm(v => !v);
                }}
              >
                ＋ Создать событие
              </button>
            </div>

            {showEventForm && (
              <form className="event-form" onSubmit={addEvent}>
                <div className="form-grid">
                  <div>
                    <label htmlFor="eventTitle">Название</label>
                    <input
                      id="eventTitle"
                      placeholder="Например, Перенос лекции"
                      value={eventDraft.title}
                      onChange={e =>
                        setEventDraft({
                          ...eventDraft,
                          title: e.target.value
                        })
                      }
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="eventDate">Дата</label>
                    <input
                      id="eventDate"
                      type="date"
                      value={eventDraft.date}
                      onChange={e =>
                        setEventDraft({
                          ...eventDraft,
                          date: e.target.value
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="eventDescription">Описание</label>
                  <textarea
                    id="eventDescription"
                    rows="3"
                    placeholder="Дополнительная информация для группы"
                    value={eventDraft.description}
                    onChange={e =>
                      setEventDraft({
                        ...eventDraft,
                        description: e.target.value
                      })
                    }
                  />
                </div>

                <div className="form-actions">
                  <button className="primary" type="submit">
                    Опубликовать
                  </button>

                  <button
                    className="secondary"
                    type="button"
                    onClick={() => setShowEventForm(false)}
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}

            <div className="event-list">
              {sortedEvents.map((ev, i) => (
                <EventCard
                  key={`${ev.date}-${i}`}
                  event={ev}
                />
              ))}

              {!events.length && (
                <Empty>
                  Событий пока нет. Создайте первое объявление.
                </Empty>
              )}
            </div>
          </section>
        )}
      </main>

      <footer>
        CallStar <span>·</span> Умный помощник старосты
      </footer>
    </div>
  );
}

function EventCard({ event }) {
  const d = parseDate(event.date);

  return (
    <article className="event-card">
      <div className="event-date">
        <strong>{d.getDate()}</strong>
        {d.toLocaleDateString('ru-RU', { month: 'short' })}
      </div>

      <div className="event-content">
        <h3>{event.title}</h3>
        <p>{event.description || 'Без дополнительного описания'}</p>
      </div>
    </article>
  );
}

function Empty({ children }) {
  return <div className="empty-state">{children}</div>;
}

export default App;
