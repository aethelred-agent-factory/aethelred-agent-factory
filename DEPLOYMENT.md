# 🚀 Aethel Agent Factory Deployment Guide

## 📋 Overview

This guide provides step-by-step instructions for deploying the integrated Aethelred + Agent Factory system across different environments, from local development to production deployment.

## 🎯 Quick Deployment (Recommended)

### ⚡ Test the Integration (5 minutes)

```bash
# 1. Clone and setup
git clone <repository-url>
cd aethel-agent-factory
npm install

# 2. Set up API key
echo "DEEPSEEK_API_KEY=sk-3d94751067114380932cb022149b3e79" > .env

# 3. Test the integration
npm run test:integration
npm run test:deepseek

# 4. Start the enhanced agent controller
npm run start:enhanced
```

**Expected Output:**
```
🎯 Integration Test Results:
- Bridge functionality: ✅ Working
- Agent controller: ✅ Working  
- End-to-End flow: ✅ Working
- Decision success rate: 100.0%
```

## 🏠 Local Development Deployment

### Prerequisites

- **Node.js 18+**: `node --version`
- **Rust 1.70+**: `rustc --version` 
- **Git**: `git --version`

### Step 1: Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd aethel-agent-factory

# Install all dependencies
npm run install:all

# Create environment file
cp .env.example .env
# Edit .env with your configuration
```

### Step 2: Build Components

```bash
# Build Rust components (may take 5-10 minutes first time)
npm run build:rust

# Build JavaScript contracts
npm run build:contracts

# Or build everything
npm run build
```

### Step 3: Start Development Environment

```bash
# Terminal 1: Start local blockchain
npm run node

# Terminal 2: Start Aethelred node (stub implementation)
npm run start:aethelred-node

# Terminal 3: Deploy contracts (wait for terminal 1 to be ready)
npm run deploy

# Terminal 4: Start the enhanced agent controller
npm run start:enhanced
```

### Step 4: Verify Deployment

```bash
# Check agent status
npm run monitor

# Run integration tests
npm run test:integration

# Check system health
curl http://localhost:3001/health
```

## 🌐 Production Deployment

### Prerequisites

- **Server**: Ubuntu 20.04+ or similar
- **Domain**: Configured domain with SSL
- **API Keys**: Production DeepSeek API key
- **Infrastructure**: Ethereum mainnet access (Infura/Alchemy)

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install PM2 for process management
npm install -g pm2

# Install nginx for reverse proxy
sudo apt install nginx
```

### Step 2: Application Deployment

```bash
# Clone application
git clone <repository-url> /opt/aethel-agent-factory
cd /opt/aethel-agent-factory

# Install dependencies
npm run install:all

# Build production assets
NODE_ENV=production npm run build
```

### Step 3: Production Configuration

```bash
# Create production environment file
sudo nano /opt/aethel-agent-factory/.env.production
```

```bash
# Production Environment Configuration
NODE_ENV=production
LOG_LEVEL=info

# Production API Keys (use secure key management)
DEEPSEEK_API_KEY=sk-your-production-key-here
PRIVATE_KEY=0x-your-private-key-here

# Production Networks
RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
AETHELRED_NODE_URL=https://api.aethelred.ai

# Production Settings
USE_AETHELRED=true
AETHELRED_FALLBACK=false
ENABLE_METRICS=true
LOG_FILE=/var/log/aethel-agent.log

# Security & Performance
SWAP_THRESHOLD=2200
DEFAULT_SWAP_AMOUNT=500
MAX_SWAP_AMOUNT=2000
CHECK_INTERVAL=60000
```

### Step 4: Process Management with PM2

```bash
# Create PM2 ecosystem file
sudo nano /opt/aethel-agent-factory/ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'aethel-agent-controller',
      script: 'agent-factory-mvp/controller/enhanced_agent_controller.js',
      cwd: '/opt/aethel-agent-factory',
      env_file: '/opt/aethel-agent-factory/.env.production',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: '/var/log/aethel-agent-error.log',
      out_file: '/var/log/aethel-agent-out.log',
      log_file: '/var/log/aethel-agent.log'
    },
    {
      name: 'aethel-metrics',
      script: 'scripts/metrics-server.js',
      cwd: '/opt/aethel-agent-factory',
      env_file: '/opt/aethel-agent-factory/.env.production',
      instances: 1,
      autorestart: true
    }
  ]
};
```

```bash
# Start applications with PM2
cd /opt/aethel-agent-factory
pm2 start ecosystem.config.js

# Configure PM2 to start on boot
pm2 startup
pm2 save
```

### Step 5: Nginx Configuration

```bash
# Create nginx configuration
sudo nano /etc/nginx/sites-available/aethel-agent-factory
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Metrics endpoint
    location /metrics {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Dashboard (if implemented)
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site and restart nginx
sudo ln -s /etc/nginx/sites-available/aethel-agent-factory /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
# Multi-stage build for Rust and Node.js
FROM rust:1.70 as rust-builder
WORKDIR /app
COPY aethelred/ ./aethelred/
RUN cd aethelred && cargo build --release

FROM node:18-alpine as node-builder
WORKDIR /app
COPY package*.json ./
COPY agent-factory-mvp/ ./agent-factory-mvp/
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache curl

# Copy built artifacts
COPY --from=rust-builder /app/aethelred/target/release/ ./aethelred/target/release/
COPY --from=node-builder /app/node_modules/ ./node_modules/
COPY --from=node-builder /app/agent-factory-mvp/ ./agent-factory-mvp/

# Copy application files
COPY bridge/ ./bridge/
COPY scripts/ ./scripts/
COPY package.json ./
COPY *.md ./
COPY test-*.js ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Set permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3000 3001
CMD ["npm", "run", "start:enhanced"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  aethel-agent:
    build: .
    container_name: aethel-agent-factory
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
      - RPC_URL=${RPC_URL}
      - USE_AETHELRED=true
      - AETHELRED_FALLBACK=true
    ports:
      - "3000:3000"
      - "3001:3001"
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
    networks:
      - aethel-network

  nginx:
    image: nginx:alpine
    container_name: aethel-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - aethel-agent
    networks:
      - aethel-network

networks:
  aethel-network:
    driver: bridge
```

### Docker Deployment Commands

```bash
# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f aethel-agent

# Update deployment
docker-compose pull
docker-compose up -d --no-deps aethel-agent

# Backup data
docker-compose exec aethel-agent npm run backup
```

## ☁️ Cloud Deployment (AWS)

### AWS Infrastructure Setup

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
```

### EC2 Instance Setup

```bash
# Launch EC2 instance (Ubuntu 20.04, t3.medium)
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxx \
  --subnet-id subnet-xxxxxxxx \
  --user-data file://user-data.sh

# user-data.sh content:
#!/bin/bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
npm install -g pm2
```

### ECS Deployment (Alternative)

```yaml
# ecs-task-definition.json
{
  "family": "aethel-agent-factory",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "aethel-agent",
      "image": "your-account.dkr.ecr.region.amazonaws.com/aethel-agent-factory:latest",
      "portMappings": [
        {"containerPort": 3000, "protocol": "tcp"},
        {"containerPort": 3001, "protocol": "tcp"}
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "USE_AETHELRED", "value": "true"}
      ],
      "secrets": [
        {
          "name": "DEEPSEEK_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:deepseek-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/aethel-agent-factory",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

## 📊 Monitoring & Observability

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'aethel-agent'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Aethel Agent Factory",
    "panels": [
      {
        "title": "Trading Decisions",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(trading_decisions_total[5m])",
            "legendFormat": "Decisions/sec"
          }
        ]
      },
      {
        "title": "AI Source Distribution",
        "type": "piechart", 
        "targets": [
          {
            "expr": "trading_decisions_by_source",
            "legendFormat": "{{source}}"
          }
        ]
      }
    ]
  }
}
```

### Log Aggregation (ELK Stack)

```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.14.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:7.14.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5044:5044"

  kibana:
    image: docker.elastic.co/kibana/kibana:7.14.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
```

## 🔒 Security Considerations

### Production Security Checklist

- [ ] **API Keys**: Store in secure key management (AWS Secrets Manager, etc.)
- [ ] **Private Keys**: Use hardware wallets or secure key storage
- [ ] **Network Security**: Configure firewalls and VPCs properly
- [ ] **SSL/TLS**: Enable HTTPS with valid certificates
- [ ] **Access Control**: Implement proper IAM roles and policies
- [ ] **Monitoring**: Set up security alerts and audit logging
- [ ] **Updates**: Regular security updates and dependency scanning
- [ ] **Backup**: Implement automated backup and disaster recovery

### Security Configuration

```bash
# Firewall setup (UFW)
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw deny 3000  # Block direct access to app
sudo ufw deny 3001  # Block direct access to metrics

# Fail2ban for SSH protection
sudo apt install fail2ban
sudo systemctl enable fail2ban

# Regular security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

## 🚨 Troubleshooting Deployment

### Common Issues

#### 1. Rust Compilation Errors
```bash
# Clear cache and rebuild
cargo clean
rustup update
cargo build --release
```

#### 2. Node.js Memory Issues
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

#### 3. DeepSeek API Connection Issues
```bash
# Test API connectivity
curl -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
     https://api.deepseek.com/v1/models

# Check network connectivity
ping api.deepseek.com
```

#### 4. Port Conflicts
```bash
# Check port usage
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :3001

# Kill conflicting processes
sudo pkill -f "node.*3000"
```

### Log Analysis

```bash
# Check application logs
pm2 logs aethel-agent-controller

# Check system logs
journalctl -u nginx
journalctl -f

# Check disk space
df -h
du -sh /opt/aethel-agent-factory

# Check memory usage
free -h
top -p $(pgrep -d',' node)
```

## 📈 Scaling Considerations

### Horizontal Scaling

```bash
# Load Balancer Configuration (nginx)
upstream aethel_agents {
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
    server 10.0.1.12:3000;
}

server {
    location / {
        proxy_pass http://aethel_agents;
    }
}
```

### Auto Scaling (AWS)

```json
{
  "AutoScalingGroupName": "aethel-agent-asg",
  "MinSize": 2,
  "MaxSize": 10,
  "DesiredCapacity": 3,
  "TargetGroupARNs": ["arn:aws:elasticloadbalancing:..."],
  "HealthCheckType": "ELB",
  "HealthCheckGracePeriod": 300
}
```

---

## 🎯 Deployment Checklist

### Pre-Deployment
- [ ] ✅ Environment configuration validated
- [ ] ✅ API keys configured securely
- [ ] ✅ Build process tested
- [ ] ✅ Dependencies installed
- [ ] ✅ Integration tests passing

### Deployment
- [ ] ✅ Infrastructure provisioned
- [ ] ✅ Application deployed
- [ ] ✅ SSL certificates configured
- [ ] ✅ Load balancer configured
- [ ] ✅ Monitoring enabled

### Post-Deployment  
- [ ] ✅ Health checks passing
- [ ] ✅ Metrics collecting
- [ ] ✅ Logs flowing
- [ ] ✅ Alerts configured
- [ ] ✅ Backup verified

**🎉 Your Aethel Agent Factory is now deployed and ready for autonomous AI trading!**