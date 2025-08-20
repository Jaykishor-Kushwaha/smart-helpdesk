# Smart Helpdesk Deployment Guide

## 🚀 Quick Deploy Options

### Option 1: Railway (Recommended for Demo)
**Best for**: Quick demos, prototyping, small teams

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Deploy
railway up

# 4. Set environment variables in Railway dashboard
# - MONGO_URI (use Railway's MongoDB addon)
# - JWT_SECRET (generate strong secret)
# - CORS_ORIGIN (your frontend URL)
```

**Estimated time**: 5-10 minutes  
**Cost**: Free tier available

### Option 2: Vercel + Railway
**Best for**: Production-ready deployment with CDN

```bash
# Frontend to Vercel
cd client
npx vercel --prod

# Backend to Railway
cd ../server
railway up
```

### Option 3: Docker on Cloud
**Best for**: Full control, enterprise deployment

```bash
# Build and deploy to any cloud provider
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔧 Environment Configuration

### Required Environment Variables

```bash
# Backend (.env)
MONGO_URI=mongodb://username:password@host:port/database
JWT_SECRET=your-super-secure-secret-key-at-least-32-chars
CORS_ORIGIN=https://yourdomain.com
NODE_ENV=production

# AI Agent Settings
AUTO_CLOSE_ENABLED=true
CONFIDENCE_THRESHOLD=0.85
STUB_MODE=false

# Frontend (.env)
VITE_API_BASE=https://your-backend-url.com/api
```

### Security Checklist
- [ ] Change default JWT secret
- [ ] Use production MongoDB with authentication
- [ ] Configure HTTPS/TLS
- [ ] Set proper CORS origins
- [ ] Enable rate limiting
- [ ] Configure monitoring

---

## 🌐 Platform-Specific Instructions

### Railway Deployment

1. **Create Railway Project**
   ```bash
   railway init
   ```

2. **Add MongoDB Service**
   - Go to Railway dashboard
   - Add MongoDB addon
   - Copy connection string

3. **Configure Environment**
   ```bash
   railway variables set JWT_SECRET=your-secret-here
   railway variables set MONGO_URI=your-mongodb-uri
   railway variables set CORS_ORIGIN=https://your-frontend-url
   ```

4. **Deploy**
   ```bash
   railway up
   ```

### Vercel Deployment (Frontend)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy from client directory**
   ```bash
   cd client
   vercel --prod
   ```

3. **Configure Environment**
   - Set `VITE_API_BASE` in Vercel dashboard
   - Point to your backend URL

### AWS ECS Deployment

1. **Build and Push Images**
   ```bash
   # Build images
   docker build -t smart-helpdesk-server ./server
   docker build -t smart-helpdesk-client ./client
   
   # Tag for ECR
   docker tag smart-helpdesk-server:latest <account>.dkr.ecr.<region>.amazonaws.com/smart-helpdesk-server:latest
   
   # Push to ECR
   docker push <account>.dkr.ecr.<region>.amazonaws.com/smart-helpdesk-server:latest
   ```

2. **Create ECS Service**
   - Use provided task definitions
   - Configure load balancer
   - Set up auto-scaling

### Google Cloud Run

1. **Build and Deploy**
   ```bash
   gcloud builds submit --tag gcr.io/<project>/smart-helpdesk-server ./server
   gcloud run deploy smart-helpdesk-server --image gcr.io/<project>/smart-helpdesk-server --platform managed
   ```

---

## 📊 Monitoring & Maintenance

### Health Checks
- **Backend**: `GET /healthz`
- **Database**: Connection status
- **Frontend**: Static file serving

### Logging
- Application logs via Pino
- Request logs via Morgan
- Error tracking recommended (Sentry)

### Backup Strategy
- MongoDB automated backups
- Environment variable backup
- Code repository backup

---

## 🔗 Public URL Examples

After deployment, your application will be available at:

- **Railway**: `https://smart-helpdesk-production.up.railway.app`
- **Vercel**: `https://smart-helpdesk.vercel.app`
- **Custom Domain**: `https://helpdesk.yourdomain.com`

---

## 🆘 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   ```bash
   # Check connection string format
   mongodb://username:password@host:port/database?authSource=admin
   ```

2. **CORS Errors**
   ```bash
   # Ensure CORS_ORIGIN includes your frontend URL
   CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
   ```

3. **JWT Errors**
   ```bash
   # Generate a strong secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Build Failures**
   ```bash
   # Clear cache and rebuild
   docker system prune -a
   docker-compose build --no-cache
   ```

### Performance Optimization

1. **Enable Compression**
   - Gzip compression for static files
   - API response compression

2. **CDN Setup**
   - CloudFlare for global distribution
   - Static asset caching

3. **Database Optimization**
   - MongoDB indexes for search
   - Connection pooling
   - Query optimization

---

## 📈 Scaling Considerations

### Horizontal Scaling
- Load balancer configuration
- Multiple server instances
- Database clustering

### Vertical Scaling
- Increase server resources
- Optimize memory usage
- CPU optimization

### Monitoring
- Application performance monitoring
- Database performance metrics
- User experience tracking

---

## 🔐 Security Best Practices

1. **Authentication**
   - Strong JWT secrets
   - Token expiration
   - Refresh token strategy

2. **Authorization**
   - Role-based access control
   - API endpoint protection
   - Input validation

3. **Infrastructure**
   - HTTPS enforcement
   - Security headers
   - Rate limiting
   - DDoS protection

---

## 📞 Support

For deployment issues:
1. Check the troubleshooting section
2. Review application logs
3. Verify environment variables
4. Test health endpoints

**Remember**: This is a demo application. For production use, implement additional security measures, monitoring, and backup strategies appropriate for your organization's requirements.
