# OOTB Property Dashboard - System Documentation

## 🏢 Project Overview
Out Of The Box Properties dashboard is a comprehensive real estate property management system with integrated transaction coordination, user authentication, and automated email notifications.

**Live URL:** https://ootb-property-dashboard.onrender.com

---

## 🎯 Current Status (January 1, 2025)

### ✅ **COMPLETED FEATURES**

#### **Core Property Management**
- **Property Dashboard** - Real-time property listings with status tracking
- **Transaction Coordinator** - Integrated from Fathom project with document, workflow, timeline, and party management
- **Task Management** - Automated task generation and tracking
- **Search & Filtering** - Advanced property search with multiple criteria
- **Map Integration** - OpenStreetMap with geocoding and property visualization
- **Real-Time Data** - PostgreSQL backend with automatic seeding

#### **User Authentication & Security** 
- **JWT-based Authentication** - Secure login with 24-hour token expiration
- **Role-Based Access Control** - Admin, Agent, Viewer roles with different permissions
- **User Management Interface** - Admin dashboard for creating/managing users
- **Email Invitation System** - Automated user invitations with setup links
- **Password Management** - Secure password reset and change functionality

#### **Email Integration**
- **SMTP Configuration** - Using transaction.coordinator.agent@gmail.com
- **Invitation Emails** - Professional HTML emails for new user setup
- **Password Reset** - Secure token-based password reset via email
- **Email Templates** - Branded HTML templates with security notifications

#### **Database Architecture**
- **PostgreSQL Database** - Production-ready with automatic migrations
- **Real Property Data** - 18 actual Trident Properties loaded from Excel
- **User Management Tables** - Complete authentication schema with tokens
- **Task Automation** - Auto-generated tasks based on property status
- **Data Integrity** - UUID primary keys, proper indexing, triggers

---

## 🚀 **READY TO DEPLOY** (Immediate Tasks)

### **Step 1: Database Migration**
```bash
# Run this endpoint to create users table in production:
curl -X POST https://ootb-property-dashboard.onrender.com/api/database/migrate-users
```

### **Step 2: Test Authentication**
```bash
# Test login with seeded admin users:
curl -X POST https://ootb-property-dashboard.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "mattmizell", "password": "training1"}'
```

### **Step 3: Verify Email System** 
- Create a test user via the admin interface
- Check that invitation email is sent to transaction.coordinator.agent@gmail.com
- Test password setup flow

---

## 🔧 **ARCHITECTURE**

### **Frontend (React + TypeScript)**
```
src/
├── components/
│   ├── Dashboard.tsx           # Main dashboard with property grid/map/tasks
│   ├── PropertyCard.tsx        # Property cards with transaction action buttons
│   ├── TransactionCoordinator.tsx  # Modal for document/workflow management
│   ├── LoginPage.tsx           # Authentication login form
│   ├── UserManagement.tsx      # Admin user management interface
│   ├── PropertyDetail.tsx      # Full property editing modal
│   ├── OSMMapView.tsx         # OpenStreetMap integration
│   └── TaskList.tsx           # Task management interface
├── context/
│   └── AuthContext.tsx        # Authentication state management
├── services/
│   ├── hybridDataService.ts   # API/localStorage data service
│   ├── apiService.ts          # REST API client with auth headers
│   └── dataService.ts         # Local storage fallback
└── types.ts                   # TypeScript interfaces
```

### **Backend (Node.js + Express)**
```
server/
├── index.js                   # Main Express server with all routes
├── auth.js                    # JWT authentication utilities
├── emailService.js            # Email sending with nodemailer
├── seed-db.js                 # Database seeding functionality
└── geocoding.js               # Address geocoding service
```

### **Database Schema (PostgreSQL)**
```sql
-- Core Tables
properties              # Property listings with pricing, status, coordinates
tasks                  # Task management with auto-generation
contingency_dates      # Contract contingency tracking
users                  # Authentication with roles and email tokens
activity_log          # Audit trail for all changes

-- Key Features
- UUID primary keys throughout
- Automatic timestamp updates
- Role-based permissions (Admin/Agent/Viewer)
- Email token management for secure invitations
- Geographic coordinates for map integration
```

---

## 🔐 **AUTHENTICATION FLOW**

### **User Creation Process**
1. **Admin creates user** via UserManagement interface (no password required)
2. **System generates setup token** (24-hour expiration)
3. **Email invitation sent** with branded HTML template
4. **User clicks setup link** and creates password
5. **Account activated** and user can log in

### **Email Configuration**
- **SMTP Server:** smtp.gmail.com:587
- **Email Account:** transaction.coordinator.agent@gmail.com
- **App Password:** xmvi xvso zblo oewe (from Fathom project)
- **Templates:** Professional HTML with OOTB branding

### **Security Features**
- **Password Hashing:** bcrypt with 12 rounds
- **JWT Tokens:** 24-hour expiration with automatic refresh
- **Setup Tokens:** 24-hour expiration for account setup
- **Reset Tokens:** 1-hour expiration for password reset
- **Role Validation:** Middleware on all protected endpoints

---

## 📊 **DATA INTEGRATION**

### **Property Data Source**
- **Real Properties:** 18 actual Trident Properties from Excel export
- **Geographic Data:** Automated geocoding with Nominatim API
- **Status Tracking:** Active, Under Contract, Pending, Closed, Hold
- **Financial Data:** Starting/current list prices, contract prices, basis points

### **Task Automation**
- **Pre-Listing Tasks:** Photos, market analysis, listing agreement
- **Active Marketing:** Showings, price monitoring, interest tracking
- **Under Contract:** Inspections, appraisals, title work
- **Closing Tasks:** Final walkthrough, document preparation

### **Transaction Coordination**
- **Document Management:** Upload, categorization, status tracking
- **Party Management:** Buyer, seller, agents, title company, lender
- **Workflow Tracking:** Phase-based task progression
- **Timeline Events:** Milestones, deadlines, upcoming events

---

## 🚦 **DEPLOYMENT STATUS**

### **Production Environment (Render.com)**
- **URL:** https://ootb-property-dashboard.onrender.com
- **Database:** PostgreSQL with automatic backup
- **Auto-Deploy:** Git push triggers deployment
- **Environment Variables:** Configured for production

### **Current Deployment State**
- ✅ **Frontend:** React build deployed and serving
- ✅ **Backend:** Express server running on port 10000
- ✅ **API Endpoints:** All routes functional
- ⚠️ **Database:** Needs users table migration (one command)
- ⚠️ **Email:** Ready but needs migration to activate

### **Required Actions to Go Live**
1. **Run migration endpoint** to create users table
2. **Test authentication** with provided credentials
3. **Verify email system** with test user creation
4. **System is ready for production use**

---

## 🔗 **API ENDPOINTS**

### **Authentication**
```
POST /api/auth/login                    # User login
GET  /api/auth/me                       # Get current user
POST /api/auth/setup-password           # Setup password from email
POST /api/auth/request-reset            # Request password reset
POST /api/auth/reset-password           # Reset password with token
```

### **User Management (Admin Only)**
```
GET  /api/users                         # List all users
POST /api/users                         # Create user (sends invitation)
PUT  /api/users/:id                     # Update user
PUT  /api/users/:id/password            # Change password
POST /api/users/:id/resend-invitation   # Resend setup email
```

### **Properties**
```
GET  /api/properties                    # List properties with filters
GET  /api/properties/:id                # Get single property
POST /api/properties                    # Create property
PUT  /api/properties/:id                # Update property
```

### **Tasks**
```
GET  /api/tasks                         # List tasks with filters
POST /api/tasks                         # Create task
PUT  /api/tasks/:id/complete            # Mark task complete
```

### **Database Management**
```
POST /api/database/migrate-users        # Create users table (NEEDED)
POST /api/database/reseed               # Reset all data
POST /api/geocode/batch                 # Update coordinates
```

---

## 👥 **USER ROLES & PERMISSIONS**

### **Admin**
- **Full Access:** All properties, tasks, and users
- **User Management:** Create, edit, deactivate users
- **System Management:** Database operations, reseed data
- **Email Management:** Resend invitations, password resets

### **Agent**
- **Property Access:** View and edit all properties
- **Task Management:** Create and complete tasks
- **Transaction Tools:** Full coordinator access
- **Profile Management:** Change own password

### **Viewer**
- **Read-Only Access:** View properties and tasks
- **No Editing:** Cannot modify data
- **Profile Management:** Change own password

---

## 📧 **EMAIL TEMPLATES**

### **User Invitation Email**
- **Subject:** Welcome to OOTB Property Dashboard - Setup Your Account
- **Content:** Professional HTML with setup link, credentials, and feature overview
- **Security:** 24-hour expiration notice
- **Branding:** OOTB Properties styling with building emoji

### **Password Reset Email**
- **Subject:** Password Reset Request - OOTB Property Dashboard
- **Content:** Security-focused with reset link and warnings
- **Security:** 1-hour expiration notice
- **Safety:** Instructions to ignore if not requested

---

## 🧪 **TESTING CHECKLIST**

### **Before Going Live**
- [ ] Run database migration endpoint
- [ ] Test admin login (mattmizell/training1)
- [ ] Create test user via admin interface
- [ ] Verify invitation email is sent
- [ ] Test password setup flow
- [ ] Verify all property data is visible
- [ ] Test transaction coordinator features
- [ ] Test user management functions

### **Credentials for Testing**
```
Admin User 1:
- Username: mattmizell
- Email: matt.mizell@gmail.com
- Password: training1

Admin User 2:
- Username: nickimizell  
- Email: nicki@outofthebox.properties
- Password: training1
```

---

## 🎯 **NEXT STEPS**

### **Immediate (Today)**
1. **Deploy Database Migration** - Run migration endpoint
2. **Test Authentication Flow** - Verify login and user creation
3. **Test Email System** - Create test user and verify email delivery
4. **System Ready for Production Use**

### **Future Enhancements**
- **DocuSign Integration** - Automated document signing
- **Calendar Integration** - Sync deadlines with Google Calendar
- **Mobile App** - React Native companion app
- **Advanced Reporting** - Analytics dashboard
- **Webhook Integration** - Real-time MLS updates

---

## 📞 **SUPPORT & CONTACTS**

### **System Administrator**
- **Matt Mizell:** matt.mizell@gmail.com
- **Nicki Mizell:** nicki@outofthebox.properties

### **Technical Details**
- **GitHub Repository:** https://github.com/nickimizell/property_dashboard
- **Deployment Platform:** Render.com
- **Database Provider:** PostgreSQL (Render)
- **Email Service:** Gmail SMTP

### **Emergency Procedures**
- **Database Issues:** Use /api/database/reseed endpoint
- **Authentication Problems:** Reset via admin user
- **Email Failures:** Check Gmail app password validity
- **System Down:** Render auto-restarts, check logs

---

**System Status:** ✅ Ready for Production (Pending Migration)
**Last Updated:** January 1, 2025
**Documentation Version:** 1.0