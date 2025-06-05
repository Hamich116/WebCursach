const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../controllers/authController');

// Home page
router.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        // Redirect based on user role
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

module.exports = router; 