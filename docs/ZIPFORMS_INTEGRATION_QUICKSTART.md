# ZipForms Integration Quick Start Guide

## Overview
This integration enables seamless data flow between OOTB Property Dashboard and zipForms, where MLS updates the latest forms.

## Integration Methods

### 1. **Browser Extension (Recommended)**
The browser extension automatically fills zipForms with property data and captures completed forms.

**Installation:**
1. Open Chrome/Edge
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `browser-extension` folder from this project
6. Pin the extension for easy access

**Usage:**
1. Click any property's transaction tools
2. Open Transaction Coordinator
3. Click "Open in zipForms" button
4. The extension will auto-fill available fields
5. Complete and save the form in zipForms
6. Data automatically syncs back to dashboard

### 2. **Direct URL Integration**
Opens zipForms with data ready for the browser extension to pick up.

**How it works:**
- Click "Open in zipForms" from Transaction Coordinator
- Property data is stored temporarily
- Browser extension detects and fills forms
- Completed forms sync back automatically

### 3. **Manual File Import**
For completed zipForms PDFs:

1. Download completed form from zipForms
2. In Transaction Coordinator, click Documents tab
3. Click "Upload Document"
4. Select the PDF file
5. System categorizes and stores the document

## Key Features

### Auto-Fill Capabilities
The extension can fill:
- Property address
- Client/seller information
- Agent details
- List price
- Property type
- Buyer information (if available)
- Transaction parties

### Auto-Capture
When you save/complete a form in zipForms:
- Extension detects the save action
- Captures form data and metadata
- Sends to dashboard via secure webhook
- Creates document record
- Updates transaction timeline

### Document Categorization
Forms are automatically categorized:
- Listing Agreement
- Property Disclosures
- Contract & Amendments
- Inspection Reports
- Appraisal Documents
- Title Documents

## Database Integration

New fields track zipForms data:
- `zipforms_form_id` - Unique form identifier
- `zipforms_status` - Sync status
- `zipforms_last_sync` - Last sync timestamp

## Setup Requirements

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Migration
The new tables are created automatically on first run, or manually:
```bash
# Use the migration endpoint
curl -X POST http://localhost:3001/api/database/migrate-transaction-tables
```

### 3. Configure Extension
1. Edit `browser-extension/background.js`
2. Set your dashboard URL (default: http://localhost:3000)
3. Rebuild extension if needed

## Troubleshooting

### Extension Not Working
- Check extension is enabled in browser
- Verify permissions for zipForms domain
- Check console for errors (F12)

### Forms Not Syncing
- Ensure dashboard is running
- Check network requests in browser DevTools
- Verify property exists in dashboard first

### Auto-Fill Missing Fields
- zipForms field names vary by form
- Check `content-script.js` field mappings
- Add new field patterns as needed

## Security Notes

- Extension only runs on zipForms domains
- No credentials stored in extension
- Data transmitted over HTTPS
- Webhook endpoint validates data integrity

## Future Enhancements

When zipForms API v2.0 releases:
- Direct API integration
- Real-time form status
- Template management
- Bulk operations

## Support

For issues:
1. Check browser console logs
2. Verify extension permissions
3. Ensure latest form mappings
4. Contact support with error details