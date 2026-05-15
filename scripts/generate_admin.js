const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'DB88ff88',
    database: process.env.DB_NAME || 'incoming_mail_db'
};

const adminUser = {
    username: 'admin',
    password: 'admin123', // Измените на желаемый пароль
    full_name: 'Системный администратор',
    email: 'admin@example.com',
    role_id: 1 // 1 = админ
};

async function createAdmin() {
    try {
        // Генерируем хеш пароля
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminUser.password, salt);

        // Подключаемся к базе данных
        const connection = await mysql.createConnection(dbConfig);

        // Проверяем, существует ли уже администратор
        const [existingAdmin] = await connection.execute(
            'SELECT * FROM users WHERE username = ?',
            [adminUser.username]
        );

        if (existingAdmin.length > 0) {
            console.log('Администратор уже существует в базе данных');
            await connection.end();
            return;
        }

        // Добавляем администратора
        await connection.execute(
            'INSERT INTO users (username, password_hash, email, full_name, role_id) VALUES (?, ?, ?, ?, ?)',
            [adminUser.username, hashedPassword, adminUser.email, adminUser.full_name, adminUser.role_id]
        );

        console.log('Администратор успешно создан:');
        console.log('Имя пользователя:', adminUser.username);
        console.log('Пароль:', adminUser.password);

        await connection.end();
    } catch (error) {
        console.error('Ошибка при создании администратора:', error);
        process.exit(1);
    }
}

createAdmin(); 