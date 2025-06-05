const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');

// Passport local strategy setup
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

// Controller methods
const login = (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            req.flash('error', info.message);
            return res.redirect('/auth/login');
        }
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            
            // Redirect based on user role
            switch (user.role_id) {
                case 1: // Admin
                    return res.redirect('/users');
                case 2: // Registrator
                    return res.redirect('/letters');
                case 3: // Executor
                    return res.redirect('/letters/assigned');
                default:
                    return res.redirect('/');
            }
        });
    })(req, res, next);
};

const logout = (req, res) => {
    req.logout(() => {
        req.flash('success_msg', 'Вы успешно вышли из системы');
        res.redirect('/auth/login');
    });
};

const renderLogin = (req, res) => {
    res.render('auth/login');
};

// Middleware to check if user is authenticated
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Пожалуйста, войдите в систему');
    res.redirect('/auth/login');
};

// Middleware to check user role
const checkRole = (roles) => {
    return (req, res, next) => {
        if (roles.includes(req.user.role_id)) {
            return next();
        }
        req.flash('error_msg', 'У вас нет прав для доступа к этой странице');
        res.redirect('/');
    };
};

module.exports = {
    login,
    logout,
    renderLogin,
    ensureAuthenticated,
    checkRole
}; 