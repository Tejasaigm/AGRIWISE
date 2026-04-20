/**
 * Payments Routes
 * POST /payments/create-order      – Create Razorpay order
 * POST /payments/verify            – Verify payment signature
 * POST /payments/webhook/razorpay  – Razorpay webhook (raw body)
 * POST /payments/webhook/stripe    – Stripe webhook (raw body)
 */
const router  = require('express').Router();
const crypto  = require('crypto');
const express = require('express');
const { body, validationResult } = require('express-validator');
const { query }   = require('../services/db');
const { authenticateJWT } = require('../middleware/auth');

const RAZORPAY_KEY_ID  = process.env.RAZORPAY_KEY_ID  || '';
const RAZORPAY_SECRET  = process.env.RAZORPAY_SECRET  || '';
const STRIPE_SECRET    = process.env.STRIPE_SECRET    || '';
const STRIPE_WH_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// ── Razorpay SDK init (lazy) ──────────────────────────────────────────────────
let razorpay = null;
if (RAZORPAY_KEY_ID && RAZORPAY_SECRET) {
  try {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_SECRET });
  } catch { console.warn('Razorpay SDK not installed – skipping'); }
}

// ── Stripe SDK init (lazy) ────────────────────────────────────────────────────
let stripe = null;
if (STRIPE_SECRET) {
  try { stripe = require('stripe')(STRIPE_SECRET); }
  catch { console.warn('Stripe SDK not installed – skipping'); }
}

// ── POST /payments/create-order ───────────────────────────────────────────────
router.post('/create-order',
  authenticateJWT,
  body('order_id').isUUID(),
  body('method').isIn(['razorpay', 'stripe', 'upi']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'VALIDATION_ERROR', details: errors.array() });

    const { order_id, method } = req.body;

    const result = await query('SELECT * FROM orders WHERE id = $1 AND buyer_id = $2', [order_id, req.user.id]);
    const order  = result.rows[0];
    if (!order) return res.status(404).json({ error: 'ORDER_NOT_FOUND' });
    if (order.payment_status === 'paid') return res.status(409).json({ error: 'ALREADY_PAID' });

    const amountPaise = Math.round(order.total_amount * 100); // paise for INR

    if (method === 'razorpay' && razorpay) {
      const rzpOrder = await razorpay.orders.create({
        amount:   amountPaise,
        currency: 'INR',
        receipt:  `agriwise_${order_id.slice(0, 8)}`,
        notes:    { agriwise_order_id: order_id },
      });
      return res.json({ gateway: 'razorpay', rzp_order_id: rzpOrder.id, amount: amountPaise, currency: 'INR', key_id: RAZORPAY_KEY_ID });
    }

    if (method === 'stripe' && stripe) {
      const intent = await stripe.paymentIntents.create({
        amount:   amountPaise,
        currency: 'inr',
        metadata: { agriwise_order_id: order_id },
      });
      return res.json({ gateway: 'stripe', client_secret: intent.client_secret });
    }

    if (method === 'upi') {
      // UPI QR via Razorpay payment links or redirect
      return res.json({ gateway: 'upi', upi_id: process.env.MERCHANT_UPI_ID || 'agriwise@ybl', amount: order.total_amount });
    }

    res.status(503).json({ error: 'GATEWAY_UNAVAILABLE', message: `${method} gateway is not configured` });
  }
);

// ── POST /payments/verify ─────────────────────────────────────────────────────
router.post('/verify',
  authenticateJWT,
  body('order_id').isUUID(),
  body('rzp_order_id').optional().isString(),
  body('rzp_payment_id').optional().isString(),
  body('rzp_signature').optional().isString(),
  async (req, res) => {
    const { order_id, rzp_order_id, rzp_payment_id, rzp_signature } = req.body;

    if (rzp_order_id && rzp_payment_id && rzp_signature) {
      const expected = crypto
        .createHmac('sha256', RAZORPAY_SECRET)
        .update(`${rzp_order_id}|${rzp_payment_id}`)
        .digest('hex');

      if (expected !== rzp_signature) {
        return res.status(401).json({ error: 'SIGNATURE_INVALID', message: 'Payment signature verification failed' });
      }

      await query(
        "UPDATE orders SET payment_status='paid', payment_id=$2, status='confirmed', updated_at=NOW() WHERE id=$1",
        [order_id, rzp_payment_id]
      );

      return res.json({ message: 'Payment verified and order confirmed', order_id });
    }

    res.status(422).json({ error: 'MISSING_PAYMENT_FIELDS' });
  }
);

// ── POST /payments/webhook/razorpay ───────────────────────────────────────────
// Must be registered BEFORE express.json() in server.js – uses raw body
router.post('/webhook/razorpay',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    if (!webhookSecret) return res.status(200).end(); // no secret configured

    const signature = req.headers['x-razorpay-signature'];
    const expected  = crypto.createHmac('sha256', webhookSecret).update(req.body).digest('hex');

    if (signature !== expected) {
      console.warn('[Webhook] Invalid Razorpay signature');
      return res.status(401).end();
    }

    const event = JSON.parse(req.body.toString());
    console.log('[Webhook] Razorpay event:', event.event);

    if (event.event === 'payment.captured') {
      const notes    = event.payload?.payment?.entity?.notes || {};
      const orderId  = notes.agriwise_order_id;
      const payId    = event.payload?.payment?.entity?.id;
      if (orderId && payId) {
        query(
          "UPDATE orders SET payment_status='paid', payment_id=$2, status='confirmed', updated_at=NOW() WHERE id=$1",
          [orderId, payId]
        ).catch(console.error);
      }
    }

    res.status(200).json({ received: true });
  }
);

// ── POST /payments/webhook/stripe ─────────────────────────────────────────────
router.post('/webhook/stripe',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    if (!stripe || !STRIPE_WH_SECRET) return res.status(200).end();

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WH_SECRET);
    } catch (err) {
      return res.status(400).json({ error: `Webhook signature error: ${err.message}` });
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent  = event.data.object;
      const orderId = intent.metadata?.agriwise_order_id;
      if (orderId) {
        query(
          "UPDATE orders SET payment_status='paid', payment_id=$2, status='confirmed', updated_at=NOW() WHERE id=$1",
          [orderId, intent.id]
        ).catch(console.error);
      }
    }

    res.status(200).json({ received: true });
  }
);

module.exports = router;
