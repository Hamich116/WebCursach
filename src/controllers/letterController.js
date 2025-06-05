const Letter = require('../models/letter');
const Attachment = require('../models/attachment');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const db = require('../config/database');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        }
        cb(new Error('Недопустимый тип файла'));
    }
}).array('attachments', 5); // Allow up to 5 files

// Controller methods
const index = async (req, res) => {
    try {
        const filters = {};
        
        // Apply filters based on user role
        if (req.user.role_id === 2) { // Registrar
            filters.registrar_id = req.user.id;
        } else if (req.user.role_id === 3) { // Executor
            filters.executor_id = req.user.id;
        }
        
        const letters = await Letter.getAll(filters);
        res.render('letters/index', { letters });
    } catch (error) {
        req.flash('error_msg', 'Ошибка при загрузке писем');
        res.redirect('/');
    }
};

const assigned = async (req, res) => {
    try {
        const filters = {
            executor_id: req.user.id,
            status: ['В работе', 'На контроле'] // Показываем только активные письма
        };
        
        const letters = await Letter.getAll(filters);
        res.render('letters/assigned', { letters });
    } catch (error) {
        req.flash('error_msg', 'Ошибка при загрузке назначенных писем');
        res.redirect('/');
    }
};

const create = async (req, res) => {
    try {
        // Get list of executors (users with role_id = 3)
        const [executors] = await db.query('SELECT id, full_name FROM users WHERE role_id = 3 AND is_active = 1');
        res.render('letters/create', { executors });
    } catch (error) {
        req.flash('error_msg', 'Ошибка при загрузке формы создания письма');
        res.redirect('/letters');
    }
};

const store = async (req, res) => {
    try {
        // Handle file upload
        upload(req, res, async (err) => {
            if (err) {
                console.error('Upload error:', err);
                req.flash('error_msg', err.message);
                return res.redirect('/letters/create');
            }

            try {
                // Generate incoming number
                const incoming_number = await Letter.generateIncomingNumber();
                
                // Format dates
                const registration_date = new Date().toISOString().slice(0, 19).replace('T', ' ');
                const letter_date = new Date(req.body.letter_date).toISOString().slice(0, 19).replace('T', ' ');
                const received_date = new Date(req.body.received_date).toISOString().slice(0, 19).replace('T', ' ');
                const deadline = req.body.deadline ? new Date(req.body.deadline).toISOString().slice(0, 19).replace('T', ' ') : null;
                
                // Create letter
                const letterData = {
                    incoming_number,
                    registration_date,
                    sender_name: req.body.sender_name,
                    sender_address: req.body.sender_address,
                    sender_contact: req.body.sender_contact,
                    subject: req.body.subject,
                    description: req.body.description,
                    letter_date,
                    received_date,
                    deadline,
                    executor_id: req.body.executor_id ? parseInt(req.body.executor_id) : null,
                    registrar_id: req.user.id,
                    status: 'Зарегистрировано'
                };

                // Get executor name if executor_id is provided
                if (letterData.executor_id) {
                    const [executorRows] = await db.query('SELECT full_name FROM users WHERE id = ?', [letterData.executor_id]);
                    if (executorRows.length > 0) {
                        letterData.executor_name = executorRows[0].full_name;
                    }
                }

                // Get registrar name
                letterData.registrar_name = req.user.full_name;

                console.log('Creating letter with data:', letterData);
                const letter = await Letter.create(letterData);
                console.log('Letter created:', letter);

                // Handle attachments
                if (req.files && req.files.length > 0) {
                    for (const file of req.files) {
                        await Attachment.create({
                            letter_id: letter.id,
                            file_name: file.originalname,
                            file_path: file.path,
                            file_size: file.size,
                            file_type: path.extname(file.originalname)
                        });
                    }
                }

                req.flash('success_msg', 'Письмо успешно зарегистрировано');
                res.redirect('/letters');
            } catch (error) {
                console.error('Letter creation error:', error);
                // Delete uploaded files if letter creation fails
                if (req.files) {
                    for (const file of req.files) {
                        await fs.unlink(file.path).catch(() => {});
                    }
                }
                req.flash('error_msg', 'Ошибка при регистрации письма');
                res.redirect('/letters/create');
            }
        });
    } catch (error) {
        console.error('General error:', error);
        req.flash('error_msg', 'Ошибка при регистрации письма');
        res.redirect('/letters/create');
    }
};

const show = async (req, res) => {
    try {
        const letter = await Letter.findById(req.params.id);
        if (!letter) {
            req.flash('error_msg', 'Письмо не найдено');
            return res.redirect('/letters');
        }

        const attachments = await Attachment.findByLetterId(letter.id);
        res.render('letters/show', { letter, attachments });
    } catch (error) {
        req.flash('error_msg', 'Ошибка при загрузке письма');
        res.redirect('/letters');
    }
};

const edit = async (req, res) => {
    try {
        const letter = await Letter.findById(req.params.id);
        if (!letter) {
            req.flash('error_msg', 'Письмо не найдено');
            return res.redirect('/letters');
        }

        // Check permissions
        if (req.user.role_id !== 1 && letter.registrar_id !== req.user.id) {
            req.flash('error_msg', 'У вас нет прав для редактирования этого письма');
            return res.redirect('/letters');
        }

        // Get list of executors (users with role_id = 3)
        const [executors] = await db.query('SELECT id, full_name FROM users WHERE role_id = 3 AND is_active = 1');
        const attachments = await Attachment.findByLetterId(letter.id);
        
        res.render('letters/edit', { letter, attachments, executors });
    } catch (error) {
        console.error('Error in edit:', error);
        req.flash('error_msg', 'Ошибка при загрузке письма');
        res.redirect('/letters');
    }
};

const update = async (req, res) => {
    try {
        const letter = await Letter.findById(req.params.id);
        if (!letter) {
            req.flash('error_msg', 'Письмо не найдено');
            return res.redirect('/letters');
        }

        // Check permissions
        if (req.user.role_id !== 1 && letter.registrar_id !== req.user.id) {
            req.flash('error_msg', 'У вас нет прав для редактирования этого письма');
            return res.redirect('/letters');
        }

        upload(req, res, async (err) => {
            if (err) {
                req.flash('error_msg', err.message);
                return res.redirect(`/letters/${req.params.id}/edit`);
            }

            try {
                // Format dates
                const updateData = {
                    sender_name: req.body.sender_name,
                    sender_address: req.body.sender_address,
                    sender_contact: req.body.sender_contact,
                    subject: req.body.subject,
                    description: req.body.description,
                    letter_date: new Date(req.body.letter_date).toISOString().slice(0, 19).replace('T', ' '),
                    received_date: new Date(req.body.received_date).toISOString().slice(0, 19).replace('T', ' '),
                    deadline: req.body.deadline ? new Date(req.body.deadline).toISOString().slice(0, 19).replace('T', ' ') : null,
                    executor_id: req.body.executor_id ? parseInt(req.body.executor_id) : null
                };

                // Get executor name if executor_id is provided
                if (updateData.executor_id) {
                    const [executorRows] = await db.query('SELECT full_name FROM users WHERE id = ?', [updateData.executor_id]);
                    if (executorRows.length > 0) {
                        updateData.executor_name = executorRows[0].full_name;
                    }
                }

                console.log('Updating letter with data:', updateData);
                await letter.update(updateData);

                // Handle new attachments
                if (req.files && req.files.length > 0) {
                    for (const file of req.files) {
                        await Attachment.create({
                            letter_id: letter.id,
                            file_name: file.originalname,
                            file_path: file.path,
                            file_size: file.size,
                            file_type: path.extname(file.originalname)
                        });
                    }
                }

                req.flash('success_msg', 'Письмо успешно обновлено');
                res.redirect(`/letters/${letter.id}`);
            } catch (error) {
                console.error('Letter update error:', error);
                req.flash('error_msg', 'Ошибка при обновлении письма');
                res.redirect(`/letters/${req.params.id}/edit`);
            }
        });
    } catch (error) {
        console.error('General error:', error);
        req.flash('error_msg', 'Ошибка при обновлении письма');
        res.redirect(`/letters/${req.params.id}/edit`);
    }
};

const downloadAttachment = async (req, res) => {
    try {
        const attachment = await Attachment.findById(req.params.attachmentId);
        if (!attachment) {
            req.flash('error_msg', 'Вложение не найдено');
            return res.redirect('back');
        }

        res.download(attachment.file_path, attachment.file_name);
    } catch (error) {
        req.flash('error_msg', 'Ошибка при скачивании файла');
        res.redirect('back');
    }
};

const deleteAttachment = async (req, res) => {
    try {
        const attachment = await Attachment.findById(req.params.attachmentId);
        if (!attachment) {
            req.flash('error_msg', 'Вложение не найдено');
            return res.redirect('back');
        }

        // Delete file from filesystem
        await fs.unlink(attachment.file_path);
        
        // Delete from database
        await attachment.delete();

        req.flash('success_msg', 'Вложение успешно удалено');
        res.redirect('back');
    } catch (error) {
        req.flash('error_msg', 'Ошибка при удалении вложения');
        res.redirect('back');
    }
};

module.exports = {
    index,
    create,
    store,
    show,
    edit,
    update,
    assigned,
    downloadAttachment,
    deleteAttachment
}; 