const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All order routes require authentication
router.post('/', protect, orderController.placeOrder);
router.get('/', protect, orderController.getOrders);
router.get('/:id', protect, orderController.getOrderDetails);

// Admin Only Routes
router.get('/admin/all', protect, authorize('admin'), orderController.getAllOrders);
router.put('/admin/:id/status', protect, authorize('admin'), orderController.updateOrderStatus);
router.get('/admin/stats', protect, authorize('admin'), orderController.getAdminStats);

module.exports = router;
