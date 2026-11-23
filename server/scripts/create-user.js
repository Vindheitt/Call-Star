
const readline = require('readline');
const bcrypt = require('bcryptjs');
const db = require('../db/database');

// Настраиваем ввод из терминала
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Обычный запрос
function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

// Безопасный ввод пароля без отображения символов
function askPassword(question) {
    return new Promise((resolve) => {
        const stdin = process.stdin;

        process.stdout.write(question);

        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');

        let password = '';

        function onData(char) {
            if (char === '\u0003') {
                process.stdout.write('\n');
                cleanup();
                process.exit(1);
            }

            if (char === '\r' || char === '\n') {
                process.stdout.write('\n');
                cleanup();
                resolve(password);
                return;
            }

            if (char === '\u007f' || char === '\b') {
                password = password.slice(0, -1);
                return;
            }

            if (char >= ' ') {
                password += char;
            }
        }

        function cleanup() {
            stdin.removeListener('data', onData);
            stdin.setRawMode(false);
            stdin.pause();
        }

        stdin.on('data', onData);
    });
}

async function createUser() {
    try {
        console.log('\n=== Создание пользователя CallStar ===\n');

        const username = await ask('Логин: ');
        const email = await ask('Email: ');

        if (!username || !email) {
            throw new Error('Логин и email обязательны.');
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error('Некорректный формат email.');
        }

        const existingUser = db.prepare(`
            SELECT id FROM users
            WHERE username = ? COLLATE NOCASE
               OR email = ? COLLATE NOCASE
        `).get(username, email);

        if (existingUser) {
            throw new Error(
                'Пользователь с таким логином или email уже существует.'
            );
        }

        const password = await askPassword('Пароль: ');

        if (password.length < 8) {
            throw new Error('Пароль должен содержать минимум 8 символов.');
        }

        const confirmation = await askPassword('Повторите пароль: ');

        if (password !== confirmation) {
            throw new Error('Пароли не совпадают.');
        }

        const passwordHash = await bcrypt.hash(password, 12);

        db.prepare(`
            INSERT INTO users (username, email, password_hash)
            VALUES (?, ?, ?)
        `).run(username, email, passwordHash);

        console.log('\nПользователь успешно создан!');
        console.log(`Логин: ${username}`);
        console.log(`Email: ${email}`);
        console.log('Пароль сохранён в виде bcrypt-хеша.\n');

    } catch (error) {
        console.error('\nОшибка:', error.message);
        process.exitCode = 1;
    } finally {
        rl.close();
        db.close();
    }
}

createUser();
