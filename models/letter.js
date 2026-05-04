const db = require('../config/database');

class Letter {
    constructor(letterData) {
        this.id = letterData.id;
        this.incoming_number = letterData.incoming_number;
        this.registration_date = letterData.registration_date;
        this.sender_name = letterData.sender_name;
        this.sender_address = letterData.sender_address;
        this.sender_contact = letterData.sender_contact;
        this.subject = letterData.subject;
        this.description = letterData.description;
        this.letter_date = letterData.letter_date;
        this.received_date = letterData.received_date;
        this.registrar_id = letterData.registrar_id;
        this.registrar_name = letterData.registrar_name;
        this.executor_id = letterData.executor_id;
        this.executor_name = letterData.executor_name;
        this.status = letterData.status;
        this.deadline = letterData.deadline;
        this.result = letterData.result;
        this.completion_date = letterData.completion_date;
    }

    static async create(letterData) {
        try {
            const [result] = await db.query(
                `INSERT INTO letters (
                    incoming_number, registration_date, sender_name, 
                    sender_address, sender_contact, subject, 
                    description, letter_date, received_date, 
                    registrar_id, executor_id, status, 
                    deadline
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    letterData.incoming_number,
                    letterData.registration_date,
                    letterData.sender_name,
                    letterData.sender_address,
                    letterData.sender_contact,
                    letterData.subject,
                    letterData.description,
                    letterData.letter_date,
                    letterData.received_date,
                    letterData.registrar_id,
                    letterData.executor_id,
                    letterData.status || 'Зарегистрировано',
                    letterData.deadline
                ]
            );
            return this.findById(result.insertId);
        } catch (error) {
            throw error;
        }
    }

    static async findById(id) {
        try {
            const [rows] = await db.query(
                `SELECT l.*, 
                        r.full_name as registrar_name,
                        e.full_name as executor_name
                 FROM letters l
                 LEFT JOIN users r ON l.registrar_id = r.id
                 LEFT JOIN users e ON l.executor_id = e.id
                 WHERE l.id = ?`,
                [id]
            );
            return rows[0] ? new Letter(rows[0]) : null;
        } catch (error) {
            throw error;
        }
    }

    static async getAll(filters = {}) {
        try {
            let query = `
                SELECT l.*, 
                       r.full_name as registrar_name,
                       e.full_name as executor_name
                FROM letters l
                LEFT JOIN users r ON l.registrar_id = r.id
                LEFT JOIN users e ON l.executor_id = e.id
                WHERE 1=1
            `;
            const params = [];

            if (filters.status) {
                if (Array.isArray(filters.status)) {
                    query += ' AND l.status IN (' + filters.status.map(() => '?').join(',') + ')';
                    params.push(...filters.status);
                } else {
                    query += ' AND l.status = ?';
                    params.push(filters.status);
                }
            }

            if (filters.registrar_id) {
                query += ' AND l.registrar_id = ?';
                params.push(filters.registrar_id);
            }

            if (filters.executor_id) {
                query += ' AND l.executor_id = ?';
                params.push(filters.executor_id);
            }

            query += ' ORDER BY l.registration_date DESC';

            const [rows] = await db.query(query, params);
            return rows.map(row => new Letter(row));
        } catch (error) {
            throw error;
        }
    }

    /**
     * Поиск и фильтрация писем (для AJAX API)
     */
    static async search(filters = {}) {
        try {
            let query = `
                SELECT l.*, 
                       r.full_name as registrar_name,
                       e.full_name as executor_name
                FROM letters l
                LEFT JOIN users r ON l.registrar_id = r.id
                LEFT JOIN users e ON l.executor_id = e.id
                WHERE 1=1
            `;
            const params = [];

            // Текстовый поиск
            if (filters.search) {
                query += ' AND (l.incoming_number LIKE ? OR l.sender_name LIKE ? OR l.subject LIKE ? OR l.description LIKE ?)';
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }

            // Фильтр по статусу
            if (filters.status) {
                query += ' AND l.status = ?';
                params.push(filters.status);
            }

            // Фильтр по дате (от)
            if (filters.date_from) {
                query += ' AND l.registration_date >= ?';
                params.push(filters.date_from);
            }

            // Фильтр по дате (до)
            if (filters.date_to) {
                query += ' AND l.registration_date <= ?';
                params.push(filters.date_to + ' 23:59:59');
            }

            // Фильтр по регистратору
            if (filters.registrar_id) {
                query += ' AND l.registrar_id = ?';
                params.push(filters.registrar_id);
            }

            // Фильтр по исполнителю
            if (filters.executor_id) {
                query += ' AND l.executor_id = ?';
                params.push(filters.executor_id);
            }

            query += ' ORDER BY l.registration_date DESC';

            const [rows] = await db.query(query, params);
            return rows.map(row => new Letter(row));
        } catch (error) {
            throw error;
        }
    }

    async update(updateData) {
        try {
            const [result] = await db.query(
                'UPDATE letters SET ? WHERE id = ?',
                [updateData, this.id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Обновить статус письма (для исполнителя)
     */
    static async updateStatus(id, status, result, completionDate) {
        try {
            const updateData = { status };
            if (result) updateData.result = result;
            if (completionDate) updateData.completion_date = completionDate;

            const [dbResult] = await db.query(
                'UPDATE letters SET ? WHERE id = ?',
                [updateData, id]
            );
            return dbResult.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Удалить письмо
     */
    static async delete(id) {
        try {
            // Сначала удаляем вложения
            await db.query('DELETE FROM attachments WHERE letter_id = ?', [id]);
            const [result] = await db.query('DELETE FROM letters WHERE id = ?', [id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Получить статистику для дашборда
     */
    static async getStats() {
        try {
            const [statusStats] = await db.query(`
                SELECT status, COUNT(*) as count 
                FROM letters 
                GROUP BY status
            `);

            const [totalResult] = await db.query('SELECT COUNT(*) as total FROM letters');

            const [overdueResult] = await db.query(`
                SELECT COUNT(*) as count 
                FROM letters 
                WHERE deadline < NOW() AND status NOT IN ('Исполнено', 'Архивировано')
            `);

            const [todayResult] = await db.query(`
                SELECT COUNT(*) as count 
                FROM letters 
                WHERE DATE(registration_date) = CURDATE()
            `);

            return {
                total: totalResult[0].total,
                byStatus: statusStats,
                overdue: overdueResult[0].count,
                today: todayResult[0].count
            };
        } catch (error) {
            throw error;
        }
    }

    static async generateIncomingNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const [rows] = await db.query(
            'SELECT COUNT(*) as count FROM letters WHERE YEAR(registration_date) = ?',
            [year]
        );
        const count = rows[0].count + 1;
        return `${year}-${count.toString().padStart(4, '0')}`;
    }
}

module.exports = Letter;