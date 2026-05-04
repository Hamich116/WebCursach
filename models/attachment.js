const db = require('../config/database');

class Attachment {
    constructor(attachmentData) {
        this.id = attachmentData.id;
        this.letter_id = attachmentData.letter_id;
        this.file_name = attachmentData.file_name;
        this.file_path = attachmentData.file_path;
        this.file_size = attachmentData.file_size;
        this.file_type = attachmentData.file_type;
        this.description = attachmentData.description;
        this.uploaded_at = attachmentData.uploaded_at;
    }

    static async create(attachmentData) {
        try {
            const [result] = await db.query(
                `INSERT INTO attachments (
                    letter_id, file_name, file_path,
                    file_size, file_type, description
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    attachmentData.letter_id,
                    attachmentData.file_name,
                    attachmentData.file_path,
                    attachmentData.file_size,
                    attachmentData.file_type,
                    attachmentData.description
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
                'SELECT * FROM attachments WHERE id = ?',
                [id]
            );
            return rows[0] ? new Attachment(rows[0]) : null;
        } catch (error) {
            throw error;
        }
    }

    static async findByLetterId(letterId) {
        try {
            const [rows] = await db.query(
                'SELECT * FROM attachments WHERE letter_id = ?',
                [letterId]
            );
            return rows.map(row => new Attachment(row));
        } catch (error) {
            throw error;
        }
    }

    async delete() {
        try {
            const [result] = await db.query(
                'DELETE FROM attachments WHERE id = ?',
                [this.id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Attachment; 