/**
 * Orders Routes
 * POST  /orders           – Buyer: place order
 * GET   /orders           – List my orders (buyer or farmer)
 * GET   /orders/:id       – Order detail
 * PATCH /orders/:id/status – Update order status (farmer/delivery)
 */
const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { query } = require('../services/db');
const { requireRole } = require('../middleware/auth');

// Valid order status transitions
const STATUS_TRANSITIONS = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['out_for_delivery'],
  out_for_delivery: ['delivered', 'failed_delivery'],
  delivered: [],
  cancelled: [],
  failed_delivery: ['out_for_delivery', 'cancelled'],
};

// ── POST /orders ──────────────────────────────────────────────────────────────
router.post('/',
  requireRole('buyer'),
  body('product_id').isUUID().withMessage('Invalid product ID'),
  body('quantity_kg').isFloat({ gt: 0 }).withMessage('quantity_kg must be positive'),
  body('delivery_address').optional().trim().isLength({ min: 10, max: 500 }),
  body('payment_method').isIn(['cod', 'razorpay', 'stripe', 'upi']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'VALIDATION_ERROR', details: errors.array() });

    const { product_id, quantity_kg, delivery_address, payment_method, notes } = req.body;

    // Fetch product + validate availability
    const productResult = await query("SELECT * FROM products WHERE id = $1 AND status = 'active'", [product_id]);
    const product = productResult.rows[0];
    if (!product) return res.status(404).json({ error: 'PRODUCT_NOT_FOUND' });

    if (quantity_kg > product.quantity_kg) {
      return res.status(422).json({
        error: 'INSUFFICIENT_STOCK',
        message: `Only ${product.quantity_kg} kg available`,
        available: product.quantity_kg,
      });
    }

    const total_amount = parseFloat((product.price_per_kg * quantity_kg).toFixed(2));

    // Create order + deduct stock in transaction
    const result = await query(
      `WITH new_order AS (
         INSERT INTO orders
           (buyer_id, farmer_id, product_id, quantity_kg, price_per_kg,
            total_amount, delivery_address, payment_method, notes, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'placed',NOW())
         RETURNING *
       ),
       stock_update AS (
         UPDATE products SET quantity_kg = quantity_kg - $4
         WHERE id = $3 AND quantity_kg >= $4
         RETURNING id
       )
       SELECT new_order.* FROM new_order`,
      [req.user.id, product.farmer_id, product_id, quantity_kg,
      product.price_per_kg, total_amount, delivery_address, payment_method, notes]
    );

    // Add initial status history entry
    await query(
      'INSERT INTO order_status_history (order_id, status, changed_by, changed_at) VALUES ($1,$2,$3,NOW())',
      [result.rows[0].id, 'placed', req.user.id]
    );

    res.status(201).json({
      message: 'Order placed successfully',
      order: result.rows[0],
    });
  }
);

// ── GET /orders ────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { role, id } = req.user;
  const { status, page = 1, limit = 20 } = req.query;

  const conditions = [role === 'farmer' ? 'o.farmer_id = $1' : 'o.buyer_id = $1'];
  const params = [id];
  if (status) { conditions.push(`o.status = $2`); params.push(status); }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const result = await query(
    `SELECT o.*,
            p.name AS product_name, p.image_url,
            buyer.name AS buyer_name, buyer.phone AS buyer_phone,
            farmer.name AS farmer_name
     FROM orders o
     JOIN products p ON o.product_id = p.id
     JOIN users buyer ON o.buyer_id = buyer.id
     JOIN users farmer ON o.farmer_id = farmer.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY o.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, parseInt(limit), offset]
  );

  res.json({ orders: result.rows, page: parseInt(page), limit: parseInt(limit) });
});

// ── GET /orders/:id ────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const result = await query(
    `SELECT o.*,
            p.name AS product_name, p.category, p.image_url, p.grade,
            buyer.name AS buyer_name, buyer.phone AS buyer_phone,
            farmer.name AS farmer_name, farmer.phone AS farmer_phone,
            farmer.location AS farmer_location
     FROM orders o
     JOIN products p ON o.product_id = p.id
     JOIN users buyer ON o.buyer_id = buyer.id
     JOIN users farmer ON o.farmer_id = farmer.id
     WHERE o.id = $1 AND (o.buyer_id = $2 OR o.farmer_id = $2)`,
    [req.params.id, req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });

  const history = await query(
    'SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY changed_at ASC',
    [req.params.id]
  );

  res.json({ ...result.rows[0], status_history: history.rows });
});

// ── PATCH /orders/:id/status ──────────────────────────────────────────────────
router.patch('/:id/status',
  body('status').isIn(Object.keys(STATUS_TRANSITIONS)),
  body('notes').optional().isLength({ max: 500 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'VALIDATION_ERROR', details: errors.array() });

    const { status, notes } = req.body;

    const orderResult = await query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    const order = orderResult.rows[0];
    if (!order) return res.status(404).json({ error: 'NOT_FOUND' });

    // Authorization: only farmer or assigned delivery agent can update
    if (order.farmer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    // Validate state machine transition
    const allowed = STATUS_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(422).json({
        error: 'INVALID_TRANSITION',
        message: `Cannot transition from '${order.status}' to '${status}'`,
        allowed_transitions: allowed,
      });
    }

    await query(
      "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2",
      [status, order.id]
    );
    await query(
      'INSERT INTO order_status_history (order_id, status, notes, changed_by, changed_at) VALUES ($1,$2,$3,$4,NOW())',
      [order.id, status, notes, req.user.id]
    );

    res.json({ message: `Order status updated to '${status}'`, order_id: order.id, status });
  }
);

module.exports = router;
