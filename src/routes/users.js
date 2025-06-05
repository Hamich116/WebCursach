const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { ensureAuthenticated, checkRole } = require('../controllers/authController');

// Apply authentication and admin role middleware to all routes
router.use(ensureAuthenticated);
router.use(checkRole([1])); // Only admins can access user management

// List all users
router.get('/', userController.index);

// Create new user
router.get('/create', userController.create);
router.post('/', userController.store);

// Edit user
router.get('/:id/edit', userController.edit);
router.post('/:id', userController.update);

// Toggle user status
router.post('/:id/toggle-status', userController.toggleStatus);

module.exports = router; 