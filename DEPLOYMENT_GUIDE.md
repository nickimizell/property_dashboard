# 🚀 Render Deployment Guide

## Complete Setup for OOTB Property Dashboard

### 📋 Prerequisites
- Render account (free)
- GitHub repository connected
- 10 minutes of setup time

---

## 🗄️ Step 1: Create PostgreSQL Database

1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Click "New +"** → **"PostgreSQL"**
3. **Configure Database**:
   - **Name**: `ootb-property-db`
   - **Database**: `property_dashboard`
   - **User**: `property_user`
   - **Region**: Choose closest to your location
   - **PostgreSQL Version**: 15 (latest)
   - **Plan**: **Free** (500MB storage, perfect for getting started)

4. **Click "Create Database"**
5. **Wait 2-3 minutes** for database to initialize
6. **Copy the Internal Database URL** (you'll need this)

---

## 🔧 Step 2: Run Database Migration

Once your database is ready:

1. **Go to your database dashboard on Render**
2. **Click "Connect"** → **"External Connection"**
3. **Use any PostgreSQL client** (pgAdmin, DBeaver, or psql CLI):
   ```
   Host: <from-render-dashboard>
   Port: 5432
   Database: property_dashboard
   Username: property_user
   Password: <from-render-dashboard>
   ```

4. **Run the migration script**:
   - Copy the contents of `database/schema.sql`
   - Execute it in your PostgreSQL client
   - This will create all tables, indexes, and sample data

---

## 🌐 Step 3: Deploy API Backend

### Option A: Separate API Service (Recommended)
1. **Click "New +"** → **"Web Service"**
2. **Connect Repository**: `nickimizell/property_dashboard`
3. **Configure Service**:
   - **Name**: `ootb-property-api`
   - **Runtime**: Node
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: **Free**

4. **Environment Variables**:
   ```
   NODE_ENV=production
   DATABASE_URL=[your-database-internal-url]
   ```

5. **Click "Create Web Service"**

### Option B: Use render-api.yaml
1. Use the included `render-api.yaml` for automatic configuration
2. Render will auto-detect database connection

---

## 🖥️ Step 4: Deploy Frontend Dashboard

1. **Click "New +"** → **"Web Service"**
2. **Connect Repository**: `nickimizell/property_dashboard`  
3. **Configure Service**:
   - **Name**: `ootb-property-dashboard`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s dist -l 10000`
   - **Plan**: **Free**

4. **Environment Variables** (if using API):
   ```
   VITE_API_URL=https://your-api-service.onrender.com
   NODE_ENV=production
   ```

5. **Click "Create Web Service"**

---

## 🔗 Step 5: Connect Frontend to API (Optional)

If you deployed the API backend, update your frontend to use it:

### Update Data Service
Replace localStorage calls with API calls in `src/services/dataService.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Example API integration
export const getAllProperties = async (): Promise<Property[]> => {
  const response = await fetch(`${API_URL}/api/properties`);
  return response.json();
};
```

---

## ✅ Step 6: Verify Deployment

### Database Check
- [ ] Database is running and accessible
- [ ] Migration completed successfully  
- [ ] Sample data is populated

### API Check (if deployed)
- [ ] API service is running
- [ ] Health endpoint returns OK: `https://your-api.onrender.com/health`
- [ ] Properties endpoint returns data: `https://your-api.onrender.com/api/properties`

### Frontend Check
- [ ] Dashboard loads successfully
- [ ] Properties display correctly
- [ ] Search and filtering work
- [ ] Task management functions properly

---

## 🎯 Production Considerations

### Performance
- **Free tier limits**: API will sleep after 15 minutes of inactivity
- **Upgrade to Starter ($7/month)** for always-on service
- **Database storage**: Free tier includes 500MB

### Security
- [ ] Database credentials are secure
- [ ] API endpoints validate input
- [ ] CORS is properly configured

### Monitoring
- [ ] Set up Render notifications
- [ ] Monitor database storage usage
- [ ] Check API response times

---

## 🆘 Troubleshooting

### Common Issues

**Database Connection Failed**
- Verify DATABASE_URL is correct
- Check database is running on Render
- Ensure SSL settings match environment

**API Not Responding**
- Check Render logs for errors
- Verify environment variables
- Ensure server starts on correct port

**Frontend Not Loading**
- Check build process completed
- Verify static files are served correctly
- Check browser console for errors

### Getting Help
- **Render Docs**: https://render.com/docs
- **Database Logs**: Available in Render dashboard
- **API Logs**: Real-time logs in service dashboard

---

## 🚀 You're Live!

Your Out Of The Box Properties Dashboard is now deployed and ready for your team to use!

**Frontend URL**: `https://ootb-property-dashboard.onrender.com`
**API URL**: `https://ootb-property-api.onrender.com` (if deployed)

### Next Steps
1. **Share the URL** with your team
2. **Add real property data** through the dashboard
3. **Set up regular backups** (export feature built-in)
4. **Consider upgrading** to paid plans for production use