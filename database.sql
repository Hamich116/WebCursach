-- Создание базы данных
CREATE DATABASE IF NOT EXISTS incoming_mail_db;
USE incoming_mail_db;

-- Таблица ролей пользователей
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE,
    description TEXT
) ENGINE=InnoDB;

-- Вставка основных ролей
INSERT INTO roles (name, description) VALUES
('admin', 'Полный доступ к системе'),
('registrar', 'Регистрация входящих писем'),
('executor', 'Исполнение писем');

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Создание администратора по умолчанию (пароль: admin123)
INSERT INTO users (username, password_hash, email, full_name, role_id) VALUES
('admin', '$2a$10$8K1p/a7yx1qAz/hzHB5wM.LYAZDqbRdiRX1Qx8ViQwB2YKlPCPl6G', 'admin@example.com', 'Администратор системы', 1);

-- Таблица входящих писем
CREATE TABLE IF NOT EXISTS letters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incoming_number VARCHAR(20) NOT NULL UNIQUE,
    registration_date DATE NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    sender_address VARCHAR(255),
    sender_contact VARCHAR(100),
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    letter_date DATE,
    received_date DATE NOT NULL,
    registrar_id INT NOT NULL,
    executor_id INT,
    status ENUM('Зарегистрировано', 'В работе', 'На контроле', 'Исполнено', 'Архивировано') 
        DEFAULT 'Зарегистрировано',
    deadline DATE,
    result TEXT,
    completion_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (registrar_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (executor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Таблица вложений
CREATE TABLE IF NOT EXISTS attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    letter_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size INT,
    file_type VARCHAR(50),
    description VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (letter_id) REFERENCES letters(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Таблица журнала действий (аудит)
CREATE TABLE IF NOT EXISTS logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(20) NOT NULL,
    entity_id INT,
    details TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Индексы для оптимизации
CREATE INDEX idx_letters_registrar ON letters(registrar_id);
CREATE INDEX idx_letters_executor ON letters(executor_id);
CREATE INDEX idx_letters_status ON letters(status);
CREATE INDEX idx_attachments_letter ON attachments(letter_id);
CREATE INDEX idx_logs_user ON logs(user_id);
CREATE INDEX idx_logs_timestamp ON logs(timestamp); 