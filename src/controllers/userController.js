const User = require('../models/user');
const db = require('../config/database');

const index = async (req, res) => {
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
};

const create = async (req, res) => {
    try {
        const [roles] = await db.query('SELECT * FROM roles');
        res.render('users/create', { roles });
    } catch (error) {
        req.flash('error_msg', 'Ошибка при загрузке формы создания пользователя');
        res.redirect('/users');
    }
};

const store = async (req, res) => {
    try {
        const { username, password, email, full_name, role_id } = req.body;

        // Check if username already exists
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
};

const edit = async (req, res) => {
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
};

const update = async (req, res) => {
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

        // Only update password if provided
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
};

const toggleStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            req.flash('error_msg', 'Пользователь не найден');
            return res.redirect('/users');
        }

        // Prevent self-deactivation
        if (user.id === req.user.id) {
            req.flash('error_msg', 'Вы не можете деактивировать свою учетную запись');
            return res.redirect('/users');
        }

        await user.update({ is_active: !user.is_active });

        req.flash('success_msg', `Пользователь успешно ${user.is_active ? 'деактивирован' : 'активирован'}`);
        res.redirect('/users');
    } catch (error) {
        req.flash('error_msg', 'Ошибка при изменении статуса пользователя');
        res.redirect('/users');
    }
};

module.exports = {
    index,
    create,
    store,
    edit,
    update,
    toggleStatus
}; 