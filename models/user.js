const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    constructor(userData) {
        this.id = userData.id;
        this.username = userData.username;
        this.email = userData.email;
        this.full_name = userData.full_name;
        this.role_id = userData.role_id;
        this.role_name = userData.role_name;
        this.is_active = userData.is_active;
        this.password_hash = userData.password_hash;
        this.created_at = userData.created_at;
        this.last_login = userData.last_login;
    }

    static async findById(id) {
        try {
            const [rows] = await db.query(
                'SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
                [id]
            );
            if (rows.length === 0) {
                return null;
            }
            return new User(rows[0]);
        } catch (error) {
            throw error;
        }
    }

    static async findByUsername(username) {
        try {
            const [rows] = await db.query(
                'SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.username = ?',
                [username]
            );
            return rows[0] ? new User(rows[0]) : null;
        } catch (error) {
            throw error;
        }
    }

    static async create(userData) {
        try {
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            const [result] = await db.query(
                'INSERT INTO users (username, password_hash, email, full_name, role_id, is_active) VALUES (?, ?, ?, ?, ?, ?)',
                [userData.username, hashedPassword, userData.email, userData.full_name, userData.role_id, true]
            );
            return this.findById(result.insertId);
        } catch (error) {
            throw error;
        }
    }

    async verifyPassword(password) {
        return await bcrypt.compare(password, this.password_hash);
    }

    async update(updateData) {
        try {
            const updates = {};
            
            if (updateData.email) updates.email = updateData.email;
            if (updateData.full_name) updates.full_name = updateData.full_name;
            if (updateData.role_id) updates.role_id = updateData.role_id;
            if (typeof updateData.is_active !== 'undefined') updates.is_active = updateData.is_active;
            
            // Handle password update separately
            if (updateData.password) {
                updates.password_hash = await bcrypt.hash(updateData.password, 10);
            }

            if (Object.keys(updates).length === 0) {
                return false;
            }

            const [result] = await db.query(
                'UPDATE users SET ? WHERE id = ?',
                [updates, this.id]
            );

            // Update local object
            Object.assign(this, updates);
            
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Удалить пользователя по ID
     */
    static async delete(id) {
        try {
            const [result] = await db.query(
                'DELETE FROM users WHERE id = ?',
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Обновить дату последнего входа
     */
    static async updateLastLogin(id) {
        try {
            await db.query(
                'UPDATE users SET last_login = NOW() WHERE id = ?',
                [id]
            );
        } catch (error) {
            console.error('Ошибка обновления last_login:', error);
        }
    }

    static async getAll() {
        try {
            const [rows] = await db.query(
                'SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.id'
            );
            return rows.map(row => new User(row));
        } catch (error) {
            throw error;
        }
    }

    /**
     * Получить всех активных исполнителей
     */
    static async getExecutors() {
        try {
            const [rows] = await db.query(
                'SELECT id, full_name FROM users WHERE role_id = 3 AND is_active = 1 ORDER BY full_name'
            );
            return rows;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = User;