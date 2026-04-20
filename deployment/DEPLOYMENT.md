# AgriWise AI – Deployment Guide
## Version 2.0.0

---

## 1. Local Development (Quickstart)

### Prerequisites
- Node.js 20+, Python 3.11+, Docker Desktop

### Steps
```bash
# 1. Clone & setup
git clone https://github.com/your-org/agriwise-platform
cd agriwise-platform

# 2. Copy env
cp .env.example .env
# Edit .env — fill OPENWEATHER_API_KEY and ANTHROPIC_API_KEY at minimum

# 3. Copy your datasets into ML service
cp /path/to/crop_recommendation.csv              backend/ml_service/data/
cp /path/to/Price_Agriculture_commodities_Week.csv backend/ml_service/data/

# 4. Train the soil model (one-time)
cd ml_models
pip install pandas scikit-learn xgboost
python train_soil_model.py \
  --data ../backend/ml_service/data/crop_recommendation.csv \
  --output ../backend/ml_service/models/

# 5. Start all services with Docker Compose
cd ..
docker compose -f docker/docker-compose.yml up -d

# 6. Start frontend dev server (Vite hot reload)
cd frontend
npm install
npm run dev          # → http://localhost:5173
```

Services running:
| Service       | URL                         |
|---------------|-----------------------------|
| Frontend      | http://localhost:5173        |
| API Gateway   | http://localhost:3000        |
| ML Service    | http://localhost:8000        |
| ML API Docs   | http://localhost:8000/docs   |
| PostgreSQL    | localhost:5432               |
| Redis         | localhost:6379               |

---

## 2. AWS Deployment (Production)

### Architecture
```
Route 53 → ALB → ECS Fargate (frontend + gateway + ml-service)
                → RDS PostgreSQL (db.t3.medium)
                → ElastiCache Redis (cache.t3.micro)
                → S3 + CloudFront (static assets)
```

### Steps

#### 2a. RDS PostgreSQL
```bash
aws rds create-db-instance \
  --db-instance-identifier agriwise-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15 \
  --master-username agriwise \
  --master-user-password "$POSTGRES_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-xxxxxxxx \
  --db-name agriwise \
  --backup-retention-period 7 \
  --multi-az
```

#### 2b. ElastiCache Redis
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id agriwise-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1
```

#### 2c. ECR + ECS Fargate
```bash
# Push images to ECR
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGION=ap-south-1

for svc in ml-service api-gateway frontend; do
  aws ecr create-repository --repository-name agriwise/$svc --region $REGION
  docker build -t agriwise/$svc ./backend/${svc/api-gateway/api_gateway} ./
  docker tag agriwise/$svc $AWS_ACCOUNT.dkr.ecr.$REGION.amazonaws.com/agriwise/$svc:latest
  aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT.dkr.ecr.$REGION.amazonaws.com
  docker push $AWS_ACCOUNT.dkr.ecr.$REGION.amazonaws.com/agriwise/$svc:latest
done

# Deploy ECS task definition
aws ecs register-task-definition --cli-input-json file://deployment/ecs-task-definition.json
aws ecs update-service --cluster agriwise --service agriwise-service --force-new-deployment
```

#### 2d. Apply DB schema
```bash
psql $DATABASE_URL < database/schema.sql
```

#### 2e. SSL via ACM + ALB
```bash
# Request certificate
aws acm request-certificate \
  --domain-name agriwise.app \
  --subject-alternative-names "*.agriwise.app" \
  --validation-method DNS

# Attach to ALB listener (HTTPS 443)
# Configure HTTP → HTTPS redirect on port 80
```

---

## 3. GCP Cloud Run (Serverless)

```bash
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

# Build and deploy ML service
gcloud builds submit --tag gcr.io/$PROJECT_ID/agriwise-ml ./backend/ml_service
gcloud run deploy agriwise-ml \
  --image gcr.io/$PROJECT_ID/agriwise-ml \
  --platform managed \
  --region asia-south1 \
  --memory 2Gi \
  --cpu 2 \
  --allow-unauthenticated \
  --set-env-vars OPENWEATHER_API_KEY=$OPENWEATHER_API_KEY,ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY

# Build and deploy API Gateway
gcloud builds submit --tag gcr.io/$PROJECT_ID/agriwise-gateway ./backend/api_gateway
gcloud run deploy agriwise-gateway \
  --image gcr.io/$PROJECT_ID/agriwise-gateway \
  --platform managed \
  --region asia-south1 \
  --set-env-vars DATABASE_URL=$DATABASE_URL,REDIS_URL=$REDIS_URL,ML_SERVICE_URL=$ML_SERVICE_URL
```

---

## 4. Azure Container Apps

```bash
az group create --name agriwise-rg --location centralindia

az containerapp env create \
  --name agriwise-env \
  --resource-group agriwise-rg \
  --location centralindia

az containerapp create \
  --name agriwise-ml \
  --resource-group agriwise-rg \
  --environment agriwise-env \
  --image agriwise/ml-service:latest \
  --cpu 2 --memory 4Gi \
  --ingress external --target-port 8000 \
  --env-vars OPENWEATHER_API_KEY=$OPENWEATHER_API_KEY ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
```

---

## 5. Monitoring

### Health check endpoints
- `GET /health` → API Gateway
- `GET /health` → ML Service (FastAPI)

### Recommended stack
- **Logs**: AWS CloudWatch / GCP Cloud Logging
- **Metrics**: Prometheus + Grafana
- **Uptime**: UptimeRobot (free tier sufficient for MVP)
- **Error tracking**: Sentry (add `@sentry/node` to gateway, `sentry-sdk` to ML)

### Key metrics to watch
- ML inference latency (target: <2s for image APIs)
- DB connection pool saturation
- OTP rate limit hits (may indicate abuse)
- Prediction confidence distribution (alert if avg drops below 0.70)

---

## 6. Production Checklist

- [ ] All `.env.example` values filled in `.env`
- [ ] `JWT_SECRET` and `REFRESH_SECRET` are random 64-byte hex strings
- [ ] `POSTGRES_PASSWORD` is strong (16+ chars, special characters)
- [ ] ML model files (`soil_crop_model.pkl`, `soil_scaler.pkl`) present in `models/`
- [ ] `crop_recommendation.csv` and `Price_Agriculture_commodities_Week.csv` in `data/`
- [ ] HTTPS certificate applied (ACM/Let's Encrypt)
- [ ] Razorpay/Stripe webhook secrets configured and tested
- [ ] DB schema applied (`psql $DB_URL < database/schema.sql`)
- [ ] Redis password set and rotated from default
- [ ] CORS `allow_origins` updated to production domain
- [ ] `NODE_ENV=production` set
- [ ] Remove `dev_otp` from auth response (already guarded by NODE_ENV check)
- [ ] Set up automated DB backups (RDS automated / pg_dump cron)
