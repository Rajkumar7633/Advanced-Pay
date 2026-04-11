# Deployment Guide

## Production Deployment

### AWS Deployment

#### Prerequisites
- AWS Account
- kubectl configured
- helm installed

#### Steps

1. **Create EKS Cluster**
```bash
eksctl create cluster \
  --name payment-gateway \
  --region us-west-2 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3
```

2. **Setup RDS PostgreSQL**
```bash
aws rds create-db-instance \
  --db-instance-identifier payment-gateway-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --master-username postgres \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 100
```

3. **Deploy Application**
```bash
kubectl apply -f deployments/kubernetes/
```

### Environment Variables

Production environment variables:
```bash
SERVER_MODE=release
DB_HOST=your-rds-endpoint
DB_PASSWORD=strong-password
REDIS_HOST=your-redis-endpoint
KAFKA_BROKERS=broker1:9092,broker2:9092
JWT_SECRET=super-secret-key-min-32-chars
```

### SSL/TLS Setup

1. Generate certificates
2. Create Kubernetes secret
3. Configure ingress

### Monitoring Setup

1. **Prometheus**
```bash
helm install prometheus prometheus-community/prometheus
```

2. **Grafana**
```bash
helm install grafana grafana/grafana
```

### Backup Strategy

1. **Database**: Daily automated RDS snapshots
2. **Redis**: AOF persistence
3. **Logs**: ELK Stack

## Performance Tuning

### Database
- Connection pool: 25 max
- Statement timeout: 30s
- Index optimization

### API Server
- Worker count: CPU cores
- Max request size: 10MB
- Timeout: 30s

### Redis
- Max memory: 2GB
- Eviction policy: allkeys-lru
