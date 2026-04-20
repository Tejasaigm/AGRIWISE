-- ============================================================
-- AgriWise AI – PostgreSQL Database Schema
-- Version: 2.0.0
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fast text search

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(150) NOT NULL,
    phone           VARCHAR(15)  UNIQUE,
    email           VARCHAR(254) UNIQUE,
    password_hash   VARCHAR(255),
    role            VARCHAR(20)  NOT NULL CHECK (role IN ('farmer','buyer','admin','delivery')),
    location        VARCHAR(255),
    state           VARCHAR(100),
    district        VARCHAR(100),
    profile_image   TEXT,
    language_pref   VARCHAR(5)   DEFAULT 'en' CHECK (language_pref IN ('en','hi','te')),
    is_active       BOOLEAN      DEFAULT TRUE,
    is_verified     BOOLEAN      DEFAULT FALSE,
    fcm_token       TEXT,        -- Firebase push notification token
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                VARCHAR(150) NOT NULL,
    category            VARCHAR(50)  NOT NULL CHECK (category IN ('vegetables','fruits','grains','pulses','spices','oilseeds','other')),
    price_per_kg        NUMERIC(10,2) NOT NULL CHECK (price_per_kg > 0),
    quantity_kg         NUMERIC(12,2) NOT NULL CHECK (quantity_kg >= 0),
    location            VARCHAR(255) NOT NULL,
    description         TEXT,
    grade               CHAR(1)       CHECK (grade IN ('A','B','C','D')),
    quality_score       NUMERIC(4,1)  CHECK (quality_score BETWEEN 0 AND 10),
    delivery_available  BOOLEAN       DEFAULT FALSE,
    organic             BOOLEAN       DEFAULT FALSE,
    image_url           TEXT,
    status              VARCHAR(20)   NOT NULL DEFAULT 'active'
                                    CHECK (status IN ('active','inactive','deleted','sold_out')),
    view_count          INTEGER       DEFAULT 0,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ
);

CREATE INDEX idx_products_farmer    ON products(farmer_id);
CREATE INDEX idx_products_category  ON products(category);
CREATE INDEX idx_products_status    ON products(status);
CREATE INDEX idx_products_created   ON products(created_at DESC);
CREATE INDEX idx_products_price     ON products(price_per_kg);
CREATE INDEX idx_products_location  ON products USING gin(location gin_trgm_ops);
CREATE INDEX idx_products_name      ON products USING gin(name gin_trgm_ops);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id            UUID NOT NULL REFERENCES users(id),
    farmer_id           UUID NOT NULL REFERENCES users(id),
    product_id          UUID NOT NULL REFERENCES products(id),
    delivery_agent_id   UUID REFERENCES users(id),
    quantity_kg         NUMERIC(12,2) NOT NULL CHECK (quantity_kg > 0),
    price_per_kg        NUMERIC(10,2) NOT NULL,
    total_amount        NUMERIC(12,2) NOT NULL,
    delivery_address    TEXT,
    payment_method      VARCHAR(20) NOT NULL CHECK (payment_method IN ('cod','razorpay','stripe','upi')),
    payment_status      VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded','failed')),
    payment_id          VARCHAR(255),   -- Gateway transaction ID
    status              VARCHAR(30) NOT NULL DEFAULT 'placed'
                                    CHECK (status IN ('placed','confirmed','packed','out_for_delivery','delivered','cancelled','failed_delivery')),
    notes               TEXT,
    delivery_lat        NUMERIC(10,7),
    delivery_lon        NUMERIC(10,7),
    delivered_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ
);

CREATE INDEX idx_orders_buyer   ON orders(buyer_id);
CREATE INDEX idx_orders_farmer  ON orders(farmer_id);
CREATE INDEX idx_orders_status  ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- Order status history (audit trail)
CREATE TABLE order_status_history (
    id          BIGSERIAL PRIMARY KEY,
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status      VARCHAR(30) NOT NULL,
    notes       TEXT,
    changed_by  UUID REFERENCES users(id),
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_history_order ON order_status_history(order_id);

-- ============================================================
-- CART
-- ============================================================
CREATE TABLE cart_items (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity_kg NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity_kg > 0),
    added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, product_id)
);

-- ============================================================
-- ML PREDICTIONS (audit log)
-- ============================================================
CREATE TABLE predictions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id),
    prediction_type VARCHAR(50) NOT NULL
                    CHECK (prediction_type IN ('soil_analysis','disease_detection','quality_price','chatbot')),
    input_data      JSONB,
    output_data     JSONB,
    confidence      NUMERIC(5,4),
    model_version   VARCHAR(50),
    processing_ms   INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_predictions_type    ON predictions(prediction_type);
CREATE INDEX idx_predictions_user    ON predictions(user_id);
CREATE INDEX idx_predictions_created ON predictions(created_at DESC);
CREATE INDEX idx_predictions_output  ON predictions USING gin(output_data);

-- ============================================================
-- ANALYTICS (materialized aggregates)
-- ============================================================
CREATE TABLE analytics_daily (
    id              BIGSERIAL PRIMARY KEY,
    date            DATE NOT NULL,
    metric          VARCHAR(100) NOT NULL,
    dimension       VARCHAR(100),
    value           NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (date, metric, dimension)
);

CREATE INDEX idx_analytics_date   ON analytics_daily(date DESC);
CREATE INDEX idx_analytics_metric ON analytics_daily(metric);

-- ============================================================
-- ALERTS
-- ============================================================
CREATE TABLE alerts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id),
    type        VARCHAR(50) NOT NULL CHECK (type IN ('weather','disease','price_drop','order','system')),
    title       VARCHAR(255) NOT NULL,
    message     TEXT NOT NULL,
    severity    VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
    is_read     BOOLEAN DEFAULT FALSE,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_user    ON alerts(user_id);
CREATE INDEX idx_alerts_unread  ON alerts(user_id, is_read) WHERE is_read = FALSE;

-- ============================================================
-- MARKET PRICE CACHE (from Agriculture_Commodities_Week.csv)
-- ============================================================
CREATE TABLE market_prices (
    id              BIGSERIAL PRIMARY KEY,
    commodity       VARCHAR(150) NOT NULL,
    variety         VARCHAR(150),
    state           VARCHAR(100),
    district        VARCHAR(100),
    market          VARCHAR(150),
    grade           VARCHAR(50),
    min_price       NUMERIC(10,2),
    max_price       NUMERIC(10,2),
    modal_price     NUMERIC(10,2),
    arrival_date    DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_market_prices_commodity ON market_prices(commodity);
CREATE INDEX idx_market_prices_date      ON market_prices(arrival_date DESC);
CREATE INDEX idx_market_prices_state     ON market_prices(state, district);

-- ============================================================
-- SEED DATA: Admin user
-- ============================================================
INSERT INTO users (name, email, password_hash, role, is_active, is_verified)
VALUES (
    'AgriWise Admin',
    'admin@agriwise.app',
    '$2a$12$placeholder_hash_change_before_deploy',
    'admin',
    TRUE,
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- HELPFUL VIEWS
-- ============================================================

-- Active product listings with farmer name
CREATE OR REPLACE VIEW vw_active_products AS
SELECT
    p.*,
    u.name        AS farmer_name,
    u.phone       AS farmer_phone,
    u.location    AS farmer_location,
    u.is_verified AS farmer_verified
FROM products p
JOIN users u ON p.farmer_id = u.id
WHERE p.status = 'active' AND u.is_active = TRUE;

-- Order summary with product + buyer + farmer info
CREATE OR REPLACE VIEW vw_orders_full AS
SELECT
    o.*,
    p.name        AS product_name,
    p.category    AS product_category,
    p.image_url,
    p.grade       AS product_grade,
    b.name        AS buyer_name,
    b.phone       AS buyer_phone,
    f.name        AS farmer_name,
    f.phone       AS farmer_phone
FROM orders o
JOIN products p ON o.product_id = p.id
JOIN users b    ON o.buyer_id   = b.id
JOIN users f    ON o.farmer_id  = f.id;

-- Prediction summary by type (last 30 days)
CREATE OR REPLACE VIEW vw_prediction_summary AS
SELECT
    prediction_type,
    COUNT(*)                                    AS total,
    ROUND(AVG(confidence)::NUMERIC, 3)          AS avg_confidence,
    ROUND(AVG(processing_ms)::NUMERIC, 0)       AS avg_ms,
    COUNT(*) FILTER (WHERE confidence >= 0.80)  AS high_confidence,
    DATE_TRUNC('day', created_at)               AS day
FROM predictions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY prediction_type, DATE_TRUNC('day', created_at)
ORDER BY day DESC;
