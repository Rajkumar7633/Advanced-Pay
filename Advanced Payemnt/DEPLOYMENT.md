# Payment Gateway MVP - Deployment Guide

## Overview

This guide covers deploying both the frontend (Next.js) and backend (Golang) to production environments.

---

## Frontend Deployment (Next.js)

### Option 1: Vercel (Recommended)

**Easiest deployment option with automatic CI/CD.**

#### Prerequisites
- GitHub repository
- Vercel account (free tier available)
- Domain name (optional)

#### Steps

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Vercel**
   - Visit https://vercel.com
   - Click "New Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Environment Variables**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Add variables:
     ```
     NEXT_PUBLIC_API_URL=https://api.yourdomain.com
     NEXT_PUBLIC_APP_NAME=PaymentGateway
     NEXT_PUBLIC_APP_URL=https://yourdomain.com
     ```

4. **Deploy**
   - Click "Deploy"
   - Vercel automatically builds and deploys
   - Production URL: `https://yourproject.vercel.app`

5. **Configure Custom Domain**
   - In Vercel dashboard, go to Settings → Domains
   - Add your custom domain
   - Update DNS records as instructed

#### Auto-Deployment on Push
Every push to `main` branch automatically triggers deployment.

---

### Option 2: AWS Amplify

**Good for AWS ecosystem integration.**

#### Steps

1. **Create Amplify App**
   ```bash
   npm install -g @aws-amplify/cli
   amplify init
   ```

2. **Configure Hosting**
   ```bash
   amplify add hosting
   # Choose: Hosting with Amplify Console
   ```

3. **Deploy**
   ```bash
   amplify publish
   ```

#### Custom Domain
```bash
amplify console hosting
# Navigate to Domain management
```

---

### Option 3: Self-Hosted (Docker + Nginx)

**Full control over infrastructure.**

#### Dockerfile
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

#### Build and Run
```bash
# Build image
docker build -t payment-gateway-frontend .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  payment-gateway-frontend
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Backend Deployment (Golang)

### Option 1: AWS ECS (Elastic Container Service)

**Recommended for production.**

#### Prerequisites
- AWS account
- Docker image built and pushed to ECR
- RDS PostgreSQL database
- ECS cluster

#### Steps

1. **Create RDS Database**
   ```bash
   # Via AWS Console or CLI
   aws rds create-db-instance \
     --db-instance-identifier payment-gateway-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username postgres \
     --master-user-password your-password
   ```

2. **Build Docker Image**
   ```dockerfile
   FROM golang:1.21-alpine AS builder
   WORKDIR /app
   COPY go.mod go.sum ./
   RUN go mod download
   COPY . .
   RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o payment-api .

   FROM alpine:latest
   RUN apk --no-cache add ca-certificates
   WORKDIR /root/
   COPY --from=builder /app/payment-api .
   EXPOSE 8080
   CMD ["./payment-api"]
   ```

3. **Push to ECR**
   ```bash
   # Create repository
   aws ecr create-repository --repository-name payment-gateway-api

   # Login to ECR
   aws ecr get-login-password --region us-east-1 | \
     docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

   # Build and tag
   docker build -t payment-gateway-api:latest .
   docker tag payment-gateway-api:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/payment-gateway-api:latest

   # Push
   docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/payment-gateway-api:latest
   ```

4. **Create ECS Task Definition**
   ```json
   {
     "family": "payment-gateway-api",
     "containerDefinitions": [
       {
         "name": "payment-gateway-api",
         "image": "YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/payment-gateway-api:latest",
         "portMappings": [
           {
             "containerPort": 8080,
             "hostPort": 8080,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "PORT",
             "value": "8080"
           },
           {
             "name": "ENV",
             "value": "production"
           },
           {
             "name": "DATABASE_URL",
             "value": "postgresql://user:password@rds-endpoint:5432/payment_gateway"
           }
         ],
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/payment-gateway-api",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         }
       }
     ],
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512",
     "networkMode": "awsvpc"
   }
   ```

5. **Create ECS Service**
   ```bash
   aws ecs create-service \
     --cluster payment-gateway-cluster \
     --service-name payment-gateway-api \
     --task-definition payment-gateway-api:1 \
     --desired-count 2 \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
   ```

---

### Option 2: Google Cloud Run

**Serverless deployment, pay per request.**

#### Steps

1. **Create Cloud Run Service**
   ```bash
   gcloud run deploy payment-gateway-api \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

2. **Set Environment Variables**
   ```bash
   gcloud run deploy payment-gateway-api \
     --update-env-vars DATABASE_URL="postgresql://..." \
     --update-env-vars JWT_SECRET="your-secret"
   ```

3. **Configure Cloud SQL**
   ```bash
   # Create Cloud SQL instance
   gcloud sql instances create payment-gateway-db \
     --database-version POSTGRES_14 \
     --tier db-f1-micro \
     --region us-central1

   # Create database
   gcloud sql databases create payment_gateway \
     --instance payment-gateway-db
   ```

---

### Option 3: Heroku (Simple)

**Quick deployment for development/staging.**

#### Steps

1. **Create Heroku App**
   ```bash
   heroku create payment-gateway-api
   ```

2. **Add PostgreSQL**
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set JWT_SECRET="your-secret"
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

---

### Option 4: Self-Hosted (Docker + Docker Compose)

**Full control, run on own server.**

#### Docker Compose
```yaml
version: '3.8'

services:
  api:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - DATABASE_URL=postgresql://postgres:password@db:5432/payment_gateway
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
    restart: always

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=payment_gateway
    volumes:
      - ./backend/database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
      - postgres_data:/var/lib/postgresql/data
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - api
    restart: always

volumes:
  postgres_data:
```

#### Deploy
```bash
docker-compose up -d
```

---

## Database Deployment

### PostgreSQL Setup

#### AWS RDS
```bash
# Create instance
aws rds create-db-instance \
  --db-instance-identifier payment-gateway-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --allocated-storage 20 \
  --storage-type gp2

# Run migrations
PGPASSWORD=your-password psql \
  -h your-rds-endpoint.amazonaws.com \
  -U postgres \
  -d payment_gateway \
  -f backend/database/schema.sql
```

#### Google Cloud SQL
```bash
# Create instance
gcloud sql instances create payment-gateway-db \
  --database-version POSTGRES_14

# Create database
gcloud sql databases create payment_gateway \
  --instance payment-gateway-db

# Run migrations
gcloud sql connect payment-gateway-db --user=postgres < backend/database/schema.sql
```

#### Azure Database for PostgreSQL
```bash
# Create server
az postgres server create \
  --resource-group myResourceGroup \
  --name payment-gateway-db \
  --location westus \
  --admin-user postgres \
  --admin-password YourPassword123!

# Run migrations
psql --host=payment-gateway-db.postgres.database.azure.com \
     --username=postgres \
     --dbname=payment_gateway \
     --file=backend/database/schema.sql
```

---

## SSL/TLS Configuration

### Let's Encrypt (Free)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d yourdomain.com

# Configure Nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Auto-renew
    # sudo certbot renew --dry-run
}
```

---

## Environment Configuration

### Production Frontend (.env.production)
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_NAME=PaymentGateway
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Production Backend (.env)
```
PORT=8080
ENV=production
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/payment_gateway
JWT_SECRET=very-long-random-secret-min-32-chars
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=change-this-in-production
ENABLE_3D_SECURE=true
ENABLE_UPI_PAYMENTS=true
ENABLE_INTERNATIONAL_PAYMENTS=false
LOG_LEVEL=warn
```

---

## Monitoring & Logging

### CloudWatch (AWS)
```bash
# View logs
aws logs tail /ecs/payment-gateway-api --follow

# Create alarms
aws cloudwatch put-metric-alarm \
  --alarm-name payment-gateway-high-cpu \
  --alarm-description "Alert when CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

### Datadog Integration
```bash
# Install agent
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=YOUR_API_KEY bash -c "$(curl -L https://s3.amazonaws.com/datadog-agent/scripts/install_agent.sh)"

# Monitor application
# Configure APM tracing in code
```

---

## Security Checklist

- [ ] Enable HTTPS/SSL on all endpoints
- [ ] Set strong JWT secret (min 32 chars, random)
- [ ] Enable database backups and point-in-time recovery
- [ ] Configure database encryption at rest
- [ ] Set up VPC/firewall rules
- [ ] Enable API rate limiting
- [ ] Configure CORS properly (not * in production)
- [ ] Set security headers (HSTS, CSP, etc.)
- [ ] Enable request logging and monitoring
- [ ] Regular security audits and penetration testing
- [ ] Keep dependencies updated
- [ ] Implement secrets management (AWS Secrets Manager, HashiCorp Vault)
- [ ] Enable WAF (Web Application Firewall)
- [ ] Regular backups and disaster recovery testing

---

## Performance Optimization

### Caching
```bash
# Redis for caching
docker run -d -p 6379:6379 redis:latest

# Configure in backend
redis_client := redis.NewClient(&redis.Options{
    Addr: "localhost:6379",
})
```

### CDN Configuration
```bash
# CloudFront (AWS)
aws cloudfront create-distribution \
  --origin-domain-name yourdomain.com \
  --default-cache-behavior ViewerProtocolPolicy=https-only
```

### Database Query Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_transactions_merchant_id ON transactions(merchant_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
```

---

## Rollback Plan

### Frontend (Vercel)
- Vercel keeps deployment history
- Click "Rollback" in dashboard to revert to previous version

### Backend
```bash
# Using Docker tags
docker pull payment-gateway-api:previous-version
docker run -d payment-gateway-api:previous-version

# Update ECS task definition
aws ecs register-task-definition --cli-input-json file://task-definition-v2.json
aws ecs update-service --cluster payment-gateway-cluster --service payment-gateway-api --task-definition payment-gateway-api:2
```

---

## Disaster Recovery

### Backup Strategy
- Daily automated database backups
- Keep 30-day backup retention
- Test restore procedures regularly
- Store backups in different region

### RTO/RPO Targets
- RTO (Recovery Time Objective): 1 hour
- RPO (Recovery Point Objective): 15 minutes

### Disaster Recovery Plan
1. Detect failure through monitoring alerts
2. Failover to backup infrastructure
3. Restore database from backup
4. Verify all services operational
5. Notify stakeholders
6. Post-incident review

---

## Maintenance

### Regular Tasks
- Review and update dependencies (monthly)
- Security patches (as needed, immediately for critical)
- Database maintenance (VACUUM, ANALYZE - weekly)
- Log file rotation and cleanup
- Certificate renewal (auto with Let's Encrypt)
- Database backups verification

### Scheduled Downtime
- Windows: Tuesday 2 AM UTC
- Duration: 30 minutes
- Notify users 48 hours in advance

---

## Troubleshooting

### Application won't start
```bash
# Check logs
docker logs container-name

# Check environment variables
docker exec container-name env

# Check database connectivity
psql -h $DATABASE_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1"
```

### High latency
- Check database query performance
- Review slow query logs
- Check network latency
- Verify sufficient resources allocated

### Database connection errors
- Verify DATABASE_URL format
- Check security group/firewall rules
- Ensure database server is running
- Verify credentials are correct

---

## Support & Documentation

For deployment issues:
1. Check application logs
2. Review this guide
3. Consult provider documentation
4. Open an issue on GitHub
5. Contact support

