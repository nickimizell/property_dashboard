# Email Processing System - Quick Start Guide

## 🚀 **One-Command Deployment**

```bash
# 1. Install dependencies
npm install

# 2. Deploy and migrate database
curl -X POST https://ootb-property-dashboard.onrender.com/api/database/migrate-email-processing

# 3. Start email processing
curl -X POST -H "Authorization: Bearer [admin-token]" https://ootb-property-dashboard.onrender.com/api/email-processing/start
```

## 📧 **Email Configuration**
- **Gmail**: `transaction.coordinator.agent@gmail.com`
- **App Password**: `xmvi xvso zblo oewe`
- **Grok API**: Set `GROK_API_KEY` environment variable in Render

## 🗂️ **Key Files**

### **Core Services:**
```
server/services/
├── emailProcessingOrchestrator.js  # Main coordinator
├── emailProcessor.js              # IMAP email reading
├── grokClient.js                  # AI classification  
├── documentExtractor.js           # PDF/Word/image processing
├── propertyMatcher.js             # Property matching logic
└── emailResponder.js              # Auto-response system
```

### **Database:**
```
database/
├── schema.sql                     # Main database schema
└── email_processing_schema.sql    # Email system tables
```

### **API Integration:**
```
server/index.js                    # Email processing endpoints added
```

## 🎯 **What It Does**

1. **📬 Polls Gmail** every 60 seconds for unread emails
2. **🤖 AI Classification** via Grok - determines if real estate related  
3. **📄 Document Processing** - extracts text from PDF, Word, images
4. **🎯 Property Matching** - matches to existing properties by address/MLS/client
5. **💾 Storage** - saves documents as PostgreSQL Large Objects
6. **📋 Task Generation** - creates tasks based on document content
7. **📤 Auto Response** - sends professional email replies with action summary
8. **✅ Email Marking** - marks property emails as read, ignores others

## 📊 **Monitoring**

```bash
# System status
GET /api/email-processing/status

# Processing stats  
GET /api/email-processing/stats

# Email queue
GET /api/email-processing/queue
```

## 🧪 **Test Email**

Send to: `transaction.coordinator.agent@gmail.com`
```
Subject: Purchase Agreement - 123 Main St, Springfield IL
Body: Attached is the signed purchase agreement for the Smith property.
Attachments: [PDF document with property address]
```

**Expected Result:**
- Email marked as read
- Document stored in database
- Property matched and linked  
- Tasks generated (inspection, appraisal, etc.)
- Professional response sent to sender
- Timeline updated with key dates

## ⚡ **Quick Commands**

```bash
# Start system
curl -X POST -H "Authorization: Bearer [token]" [url]/api/email-processing/start

# Stop system  
curl -X POST -H "Authorization: Bearer [token]" [url]/api/email-processing/stop

# Check stats
curl -H "Authorization: Bearer [token]" [url]/api/email-processing/stats

# Manual property assignment
curl -X POST -H "Authorization: Bearer [token]" [url]/api/email-processing/[emailId]/assign-property -d '{"propertyId":"[uuid]"}'
```

---

**🎉 Email Processing System Ready for Production!**