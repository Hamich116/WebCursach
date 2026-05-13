const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const multer = require('multer');
const fs = require('fs').promises;
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const db = require('./config/database');
const User = require('./models/user');
const Letter = require('./models/letter');
const Attachment = require('./models/attachment');

const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Express EJS Layouts middleware
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Serve jQuery from node_modules
app.use('/vendor/jquery', express.static(path.join(__dirname, 'node_modules', 'jquery', 'dist')));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'incoming-mail-system-secret',
    resave: false,
    saveUninitialized: false
}));

// Passport Local Strategy Setup
passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const user = await User.findByUsername(username);
            if (!user) {
                return done(null, false, { message: 'Неверное имя пользователя' });
            }

            const isMatch = await user.verifyPassword(password);
            if (!isMatch) {
                return done(null, false, { message: 'Неверный пароль' });
            }

            if (!user.is_active) {
                return done(null, false, { message: 'Учетная запись отключена' });
            }

            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

app.use(passport.initialize());
app.use(passport.session());

// Flash middleware
app.use(flash());

// Set default layout variables
app.use((req, res, next) => {
    res.locals.style = '';
    res.locals.script = '';
    res.locals.body = '';
    res.locals.currentUser = req.user;
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
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

// ==========================================
// MIDDLEWARES FOR ROUTING & AUTH
// ==========================================

const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Пожалуйста, войдите в систему');
    res.redirect('/auth/login');
};

const ensureAuthenticatedApi = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ success: false, message: 'Необходима авторизация' });
};

const checkRole = (roles) => {
    return (req, res, next) => {
        if (roles.includes(req.user.role_id)) {
            return next();
        }
        req.flash('error_msg', 'У вас нет прав для доступа к этой странице');
        res.redirect('/');
    };
};

const checkRoleApi = (roles) => {
    return (req, res, next) => {
        if (roles.includes(req.user.role_id)) {
            return next();
        }
        res.status(403).json({ success: false, message: 'Недостаточно прав' });
    };
};

// ==========================================
// ROUTES & CONTROLLERS (MONOLITHIC)
// ==========================================

// --- HOME PAGE ---
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        switch (req.user.role_id) {
            case 1: // Admin
                return res.redirect('/users');
            case 2: // Registrar
                return res.redirect('/letters');
            case 3: // Executor
                return res.redirect('/letters/assigned');
            default:
                return res.redirect('/letters');
        }
    }
    res.render('index');
});

// --- AUTHENTICATION ---
app.get('/auth/login', (req, res) => {
    res.render('auth/login');
});

app.post('/auth/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            req.flash('error', info.message);
            return res.redirect('/auth/login');
        }
        req.logIn(user, async (err) => {
            if (err) {
                return next(err);
            }

            // Update last login date
            await User.updateLastLogin(user.id);
            
            // Redirect based on user role
            switch (user.role_id) {
                case 1: // Admin
                    return res.redirect('/users');
                case 2: // Registrar
                    return res.redirect('/letters');
                case 3: // Executor
                    return res.redirect('/letters/assigned');
                default:
                    return res.redirect('/');
            }
        });
    })(req, res, next);
});

app.get('/auth/logout', (req, res) => {
    req.logout(() => {
        req.flash('success_msg', 'Вы успешно вышли из системы');
        res.redirect('/auth/login');
    });
});

// --- USER MANAGEMENT (Admin Only) ---
app.get('/users', ensureAuthenticated, checkRole([1]), async (req, res) => {
    try {
        const users = await User.getAll();
        const [roles] = await db.query('SELECT * FROM roles');
        res.render('users/index', { 
            users, 
            roles,
            currentUser: req.user
        });
    } catch (error) {
        req.flash('error_msg', 'Ошибка при загрузке пользователей');
        res.redirect('/');
    }
});

app.get('/users/create', ensureAuthenticated, checkRole([1]), async (req, res) => {
    try {
        const [roles] = await db.query('SELECT * FROM roles');
        res.render('users/create', { roles });
    } catch (error) {
        req.flash('error_msg', 'Ошибка при загрузке формы создания пользователя');
        res.redirect('/users');
    }
});

app.post('/users', ensureAuthenticated, checkRole([1]), async (req, res) => {
    try {
        const { username, password, email, full_name, role_id } = req.body;

        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            req.flash('error_msg', 'Пользователь с таким именем уже существует');
            return res.redirect('/users/create');
        }

        await User.create({
            username,
            password,
            email,
            full_name,
            role_id: parseInt(role_id)
        });

        req.flash('success_msg', 'Пользователь успешно создан');
        res.redirect('/users');
    } catch (error) {
        req.flash('error_msg', 'Ошибка при создании пользователя');
        res.redirect('/users/create');
    }
});

app.get('/users/:id/edit', ensureAuthenticated, checkRole([1]), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            req.flash('error_msg', 'Пользователь не найден');
            return res.redirect('/users');
        }

        const [roles] = await db.query('SELECT * FROM roles');
        res.render('users/edit', { user, roles });
    } catch (error) {
        req.flash('error_msg', 'Ошибка при загрузке пользователя');
        res.redirect('/users');
    }
});

app.post('/users/:id', ensureAuthenticated, checkRole([1]), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            req.flash('error_msg', 'Пользователь не найден');
            return res.redirect('/users');
        }

        const updateData = {
            email: req.body.email,
            full_name: req.body.full_name,
            role_id: parseInt(req.body.role_id),
            is_active: req.body.is_active === 'true'
        };

        if (req.body.password) {
            updateData.password = req.body.password;
        }

        await user.update(updateData);

        req.flash('success_msg', 'Пользователь успешно обновлен');
        res.redirect('/users');
    } catch (error) {
        req.flash('error_msg', 'Ошибка при обновлении пользователя');
        res.redirect(`/users/${req.params.id}/edit`);
    }
});

app.post('/users/:id/toggle-status', ensureAuthenticated, checkRole([1]), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        if (user.id === req.user.id) {
            return res.status(400).json({ success: false, message: 'Вы не можете деактивировать свою учетную запись' });
        }

        const newStatus = !user.is_active;
        await user.update({ is_active: newStatus });

        res.json({ success: true, is_active: newStatus });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка при изменении статуса' });
    }
});

// --- LETTERS MANAGEMENT ---
app.get('/letters', ensureAuthenticated, async (req, res) => {
    try {
        const filters = {};
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
});

app.get('/letters/assigned', ensureAuthenticated, checkRole([3]), async (req, res) => {
    try {
        const filters = {
            executor_id: req.user.id,
            status: ['В работе', 'На контроле']
        };
        
        const letters = await Letter.getAll(filters);
        res.render('letters/assigned', { letters });
    } catch (error) {
        req.flash('error_msg', 'Ошибка при загрузке назначенных писем');
        res.redirect('/');
    }
});

app.get('/letters/create', ensureAuthenticated, checkRole([1, 2]), async (req, res) => {
    try {
        const [executors] = await db.query('SELECT id, full_name FROM users WHERE role_id = 3 AND is_active = 1');
        res.render('letters/create', { executors });
    } catch (error) {
        req.flash('error_msg', 'Ошибка при загрузке формы создания письма');
        res.redirect('/letters');
    }
});

app.post('/letters', ensureAuthenticated, checkRole([1, 2]), async (req, res) => {
    try {
        upload(req, res, async (err) => {
            if (err) {
                console.error('Upload error:', err);
                req.flash('error_msg', err.message);
                return res.redirect('/letters/create');
            }

            try {
                const incoming_number = await Letter.generateIncomingNumber();
                const registration_date = new Date().toISOString().slice(0, 19).replace('T', ' ');
                const letter_date = new Date(req.body.letter_date).toISOString().slice(0, 19).replace('T', ' ');
                const received_date = new Date(req.body.received_date).toISOString().slice(0, 19).replace('T', ' ');
                const deadline = req.body.deadline ? new Date(req.body.deadline).toISOString().slice(0, 19).replace('T', ' ') : null;
                
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

                const letter = await Letter.create(letterData);

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
});

app.get('/letters/:id', ensureAuthenticated, async (req, res) => {
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
});

app.get('/letters/:id/edit', ensureAuthenticated, checkRole([1, 2]), async (req, res) => {
    try {
        const letter = await Letter.findById(req.params.id);
        if (!letter) {
            req.flash('error_msg', 'Письмо не найдено');
            return res.redirect('/letters');
        }

        if (req.user.role_id !== 1 && letter.registrar_id !== req.user.id) {
            req.flash('error_msg', 'У вас нет прав для редактирования этого письма');
            return res.redirect('/letters');
        }

        const [executors] = await db.query('SELECT id, full_name FROM users WHERE role_id = 3 AND is_active = 1');
        const attachments = await Attachment.findByLetterId(letter.id);
        
        res.render('letters/edit', { letter, attachments, executors });
    } catch (error) {
        req.flash('error_msg', 'Ошибка при загрузке письма');
        res.redirect('/letters');
    }
});

app.post('/letters/:id', ensureAuthenticated, checkRole([1, 2]), async (req, res) => {
    try {
        const letter = await Letter.findById(req.params.id);
        if (!letter) {
            req.flash('error_msg', 'Письмо не найдено');
            return res.redirect('/letters');
        }

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

                if (req.body.status) {
                    updateData.status = req.body.status;
                }

                if (req.body.result) {
                    updateData.result = req.body.result;
                }
                if (req.body.completion_date) {
                    updateData.completion_date = new Date(req.body.completion_date).toISOString().slice(0, 19).replace('T', ' ');
                }

                await letter.update(updateData);

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
});

app.get('/letters/attachments/:attachmentId/download', ensureAuthenticated, async (req, res) => {
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
});

app.post('/letters/attachments/:attachmentId/delete', ensureAuthenticated, checkRole([1, 2]), async (req, res) => {
    try {
        const attachment = await Attachment.findById(req.params.attachmentId);
        if (!attachment) {
            req.flash('error_msg', 'Вложение не найдено');
            return res.redirect('back');
        }

        await fs.unlink(attachment.file_path).catch(() => {});
        await attachment.delete();

        req.flash('success_msg', 'Вложение успешно удалено');
        res.redirect('back');
    } catch (error) {
        req.flash('error_msg', 'Ошибка при удалении вложения');
        res.redirect('back');
    }
});

// --- API ROUTES (AJAX) ---

// Search letters
app.get('/api/letters', ensureAuthenticatedApi, async (req, res) => {
    try {
        const filters = {
            search: req.query.search,
            status: req.query.status,
            date_from: req.query.date_from,
            date_to: req.query.date_to
        };

        if (req.user.role_id === 2) {
            filters.registrar_id = req.user.id;
        } else if (req.user.role_id === 3) {
            filters.executor_id = req.user.id;
        }

        const letters = await Letter.search(filters);
        res.json({ success: true, letters });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка при поиске писем' });
    }
});

// Dashboard stats
app.get('/api/stats', ensureAuthenticatedApi, async (req, res) => {
    try {
        const stats = await Letter.getStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка при получении статистики' });
    }
});

// Update status
app.patch('/api/letters/:id/status', ensureAuthenticatedApi, async (req, res) => {
    try {
        const letter = await Letter.findById(req.params.id);
        if (!letter) {
            return res.status(404).json({ success: false, message: 'Письмо не найдено' });
        }

        if (req.user.role_id === 3 && letter.executor_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Нет прав для изменения этого письма' });
        }

        const { status, result } = req.body;
        const completionDate = status === 'Исполнено' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;

        await Letter.updateStatus(letter.id, status, result, completionDate);

        res.json({ success: true, message: 'Статус обновлен' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка при обновлении статуса' });
    }
});

// Delete letter
app.delete('/api/letters/:id', ensureAuthenticatedApi, checkRoleApi([1]), async (req, res) => {
    try {
        const letter = await Letter.findById(req.params.id);
        if (!letter) {
            return res.status(404).json({ success: false, message: 'Письмо не найдено' });
        }

        const attachments = await Attachment.findByLetterId(letter.id);
        for (const att of attachments) {
            await fs.unlink(att.file_path).catch(() => {});
        }

        await Letter.delete(letter.id);

        res.json({ success: true, message: 'Письмо удалено' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка при удалении письма' });
    }
});

// Delete attachment
app.delete('/api/attachments/:attachmentId', ensureAuthenticatedApi, checkRoleApi([1, 2]), async (req, res) => {
    try {
        const attachment = await Attachment.findById(req.params.attachmentId);
        if (!attachment) {
            return res.status(404).json({ success: false, message: 'Вложение не найдено' });
        }

        await fs.unlink(attachment.file_path).catch(() => {});
        await attachment.delete();

        res.json({ success: true, message: 'Вложение удалено' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка при удалении вложения' });
    }
});

// Delete user
app.delete('/api/users/:id', ensureAuthenticatedApi, checkRoleApi([1]), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        if (user.id === req.user.id) {
            return res.status(400).json({ success: false, message: 'Вы не можете удалить свою учетную запись' });
        }

        await User.delete(user.id);
        res.json({ success: true, message: 'Пользователь удален' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка при удалении пользователя' });
    }
});

// Toggle user status
app.patch('/api/users/:id/toggle', ensureAuthenticatedApi, checkRoleApi([1]), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        if (user.id === req.user.id) {
            return res.status(400).json({ success: false, message: 'Вы не можете деактивировать свою учетную запись' });
        }

        const newStatus = !user.is_active;
        await user.update({ is_active: newStatus });

        res.json({ success: true, is_active: newStatus });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка при изменении статуса' });
    }
});

// --- ERROR HANDLER ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        message: 'Что-то пошло не так!',
        error: app.get('env') === 'development' ? err : {}
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = app;
