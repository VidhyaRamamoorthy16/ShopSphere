const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

// All cart routes require authentication
router.get('/', protect, cartController.getCart);
router.post('/add', protect, cartController.addToCart);
router.put('/update/:id', protect, cartController.updateCartItem);
router.delete('/remove/:id', protect, cartController.removeFromCart);

module.exports = router;
