const express = require('express');

// Payment methods shown at checkout. Only cash on delivery is live; the others are listed
// so customers can see what is coming. A method must never be enabled without a real payment
// provider verifying the payment on the server.
const PAYMENT_METHODS = [
  { id: 'cash_on_delivery', nameEn: 'Cash on delivery', nameAr: 'الدفع عند الاستلام', enabled: true },
  { id: 'mada', nameEn: 'mada', nameAr: 'مدى', enabled: false },
  { id: 'apple_pay', nameEn: 'Apple Pay', nameAr: 'Apple Pay', enabled: false },
  { id: 'stc_pay', nameEn: 'STC Pay', nameAr: 'STC Pay', enabled: false },
  { id: 'card', nameEn: 'Visa / Mastercard', nameAr: 'فيزا / ماستركارد', enabled: false },
];

const router = express.Router();

// GET /api/payments/methods
router.get('/methods', (_req, res) => {
  res.json({ methods: PAYMENT_METHODS });
});

module.exports = router;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
