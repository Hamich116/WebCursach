const express = require('express');
const router = express.Router();
const letterController = require('../controllers/letterController');
const { ensureAuthenticated, checkRole } = require('../controllers/authController');

// Apply authentication middleware to all routes
router.use(ensureAuthenticated);

// List all letters
router.get('/', letterController.index);

// Create new letter form (only for registrars and admins)
router.get('/create', checkRole([1, 2]), letterController.create);
router.post('/', checkRole([1, 2]), letterController.store);

// Route for assigned letters (only for executors)
router.get('/assigned', checkRole([3]), letterController.assigned);

// View letter details
router.get('/:id', letterController.show);

// Edit letter (only for registrars who created it and admins)
router.get('/:id/edit', checkRole([1, 2]), letterController.edit);
router.post('/:id', checkRole([1, 2]), letterController.update);

// Attachment routes
router.get('/attachments/:attachmentId/download', letterController.downloadAttachment);
router.post('/attachments/:attachmentId/delete', checkRole([1, 2]), letterController.deleteAttachment);

module.exports = router; 