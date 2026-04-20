/**
 * Products Routes
 * POST   /products          – Farmer: add product
 * GET    /products          – List products (filter/sort/paginate)
 * GET    /products/:id      – Product detail
 * PUT    /products/:id      – Farmer: update own product
 * DELETE /products/:id      – Farmer: delete own product
 */
const router = require('express').Router();
const { body, query: qv, validationResult } = require('express-validator');
const { query } = require('../services/db');
const { requireRole } = require('../middleware/auth');

const VALID_CATEGORIES = ['vegetables','fruits','grains','pulses','spices','oilseeds','other'];

// ── POST /products ─────────────────────────────────────────────────────────────
router.post('/',
  requireRole('farmer'),
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('category').isIn(VALID_CATEGORIES),
  body('price').isFloat({ gt: 0, max: 100000 }).withMessage('Price must be positive ₹/kg'),
  body('quantity').isInt({ gt: 0, max: 1000000 }).withMessage('Quantity must be positive kg'),
  body('location').trim().notEmpty().isLength({ max: 200 }),
  body('description').optional().isLength({ max: 1000 }),
  body('grade').optional().isIn(['A','B','C','D']),
  body('quality_score').optional().isFloat({ min: 0, max: 10 }),
  body('delivery').optional().isBoolean(),
  body('organic').optional().isBoolean(),
  body('image_url').optional().isURL(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'VALIDATION_ERROR', details: errors.array() });

    const {
      name, category, price, quantity, location, description,
      grade = 'B', quality_score = 7.0, delivery = false, organic = false, image_url
    } = req.body;

    const result = await query(
      `INSERT INTO products
       (farmer_id, name, category, price_per_kg, quantity_kg, location,
        description, grade, quality_score, delivery_available, organic, image_url, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active',NOW())
       RETURNING *`,
      [req.user.id, name, category, price, quantity, location,
       description, grade, quality_score, delivery, organic, image_url]
    );

    res.status(201).json({ message: 'Product listed successfully', product: result.rows[0] });
  }
);

// ── GET /products ──────────────────────────────────────────────────────────────
router.get('/',
  qv('category').optional().isIn(VALID_CATEGORIES),
  qv('grade').optional().isIn(['A','B','C','D']),
  qv('min_price').optional().isFloat({ min: 0 }),
  qv('max_price').optional().isFloat({ min: 0 }),
  qv('delivery').optional().isBoolean(),
  qv('organic').optional().isBoolean(),
  qv('sort').optional().isIn(['newest','price_asc','price_desc','quality']),
  qv('page').optional().isInt({ min: 1 }),
  qv('limit').optional().isInt({ min: 1, max: 100 }),
  async (req, res) => {
    const {
      category, grade, min_price, max_price, delivery, organic,
      search, sort = 'newest', page = 1, limit = 20
    } = req.query;

    let conditions = ["p.status = 'active'"];
    const params = [];
    let paramIdx = 1;

    if (category)  { conditions.push(`p.category = $${paramIdx++}`);          params.push(category); }
    if (grade)     { conditions.push(`p.grade = $${paramIdx++}`);              params.push(grade); }
    if (min_price) { conditions.push(`p.price_per_kg >= $${paramIdx++}`);      params.push(parseFloat(min_price)); }
    if (max_price) { conditions.push(`p.price_per_kg <= $${paramIdx++}`);      params.push(parseFloat(max_price)); }
    if (delivery === 'true')  conditions.push('p.delivery_available = true');
    if (organic === 'true')   conditions.push('p.organic = true');
    if (search) {
      conditions.push(`(p.name ILIKE $${paramIdx} OR p.location ILIKE $${paramIdx} OR u.name ILIKE $${paramIdx})`);
      params.push(`%${search}%`); paramIdx++;
    }

    const orderMap = {
      newest:     'p.created_at DESC',
      price_asc:  'p.price_per_kg ASC',
      price_desc: 'p.price_per_kg DESC',
      quality:    'p.quality_score DESC',
    };

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where  = conditions.join(' AND ');

    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT p.*, u.name AS farmer_name, u.phone AS farmer_phone
         FROM products p
         JOIN users u ON p.farmer_id = u.id
         WHERE ${where}
         ORDER BY ${orderMap[sort]}
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, parseInt(limit), offset]
      ),
      query(`SELECT COUNT(*) FROM products p JOIN users u ON p.farmer_id = u.id WHERE ${where}`, params),
    ]);

    res.json({
      products: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(countResult.rows[0].count / limit),
    });
  }
);

// ── GET /products/:id ─────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const result = await query(
    `SELECT p.*, u.name AS farmer_name, u.phone AS farmer_phone, u.location AS farmer_location
     FROM products p JOIN users u ON p.farmer_id = u.id
     WHERE p.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(result.rows[0]);
});

// ── PUT /products/:id ─────────────────────────────────────────────────────────
router.put('/:id',
  requireRole('farmer'),
  async (req, res) => {
    const product = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!product.rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
    if (product.rows[0].farmer_id !== req.user.id)
      return res.status(403).json({ error: 'FORBIDDEN', message: 'You can only edit your own products' });

    const { name, category, price_per_kg, quantity_kg, location, description,
            grade, quality_score, delivery_available, organic, image_url, status } = req.body;

    const result = await query(
      `UPDATE products SET
         name = COALESCE($2, name),
         category = COALESCE($3, category),
         price_per_kg = COALESCE($4, price_per_kg),
         quantity_kg = COALESCE($5, quantity_kg),
         location = COALESCE($6, location),
         description = COALESCE($7, description),
         grade = COALESCE($8, grade),
         quality_score = COALESCE($9, quality_score),
         delivery_available = COALESCE($10, delivery_available),
         organic = COALESCE($11, organic),
         image_url = COALESCE($12, image_url),
         status = COALESCE($13, status),
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id, name, category, price_per_kg, quantity_kg, location, description,
       grade, quality_score, delivery_available, organic, image_url, status]
    );
    res.json(result.rows[0]);
  }
);

// ── DELETE /products/:id ───────────────────────────────────────────────────────
router.delete('/:id', requireRole('farmer'), async (req, res) => {
  const product = await query('SELECT farmer_id FROM products WHERE id = $1', [req.params.id]);
  if (!product.rows[0]) return res.status(404).json({ error: 'NOT_FOUND' });
  if (product.rows[0].farmer_id !== req.user.id)
    return res.status(403).json({ error: 'FORBIDDEN' });
  await query("UPDATE products SET status = 'deleted', updated_at = NOW() WHERE id = $1", [req.params.id]);
  res.json({ message: 'Product removed' });
});

module.exports = router;
