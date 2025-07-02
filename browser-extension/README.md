# OOTB zipForms Integration Browser Extension

## Installation

### For Chrome/Edge:
1. Open Chrome or Edge browser
2. Navigate to `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" toggle in top-right
4. Click "Load unpacked"
5. Select this `browser-extension` folder
6. Pin the extension for easy access

### For Firefox:
1. Open Firefox
2. Navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select `manifest.json` from this folder

## Required Files

The extension needs these files (some are missing - see below):

### Existing Files:
- ✅ `manifest.json` - Extension configuration
- ✅ `background.js` - Service worker
- ✅ `content-script.js` - zipForms page script
- ✅ `popup.html` - Extension popup UI
- ✅ `popup.js` - Popup functionality

### Missing Files (Need to Create):
You need to add these icon files to complete the extension:

#### Create Icons:
Create these PNG files with the OOTB logo or a simple blue square:

1. **icon16.png** (16x16 pixels)
2. **icon48.png** (48x48 pixels) 
3. **icon128.png** (128x128 pixels)

#### Quick Icon Creation:
You can create simple icons by:
1. Making a 128x128 blue square in any image editor
2. Adding "OB" text in white
3. Saving as PNG
4. Resizing to create 16x16 and 48x48 versions

Or use online icon generators with your logo.

## How It Works

### 1. Data Flow to zipForms:
- User clicks "Open in zipForms" from dashboard
- Property data stored in browser storage
- Extension detects zipForms page load
- Content script auto-fills form fields

### 2. Data Flow from zipForms:
- User completes and saves form in zipForms
- Content script detects save action
- Form data captured and sent to dashboard
- Document record created automatically

### 3. Field Mapping:
The extension looks for common field patterns:
- `property_address`, `address` → Property Address
- `seller_name`, `client_name` → Client Name
- `listing_agent`, `agent_name` → Selling Agent
- `list_price`, `listing_price` → List Price

## Configuration

### Extension Popup Settings:
- **Dashboard URL**: Where to send data (default: http://localhost:3000)
- **Auto-fill Forms**: Automatically fill detected fields
- **Auto-capture**: Automatically capture completed forms

### Troubleshooting:
1. **Extension not working**: Check permissions in browser
2. **Fields not filling**: Check browser console for errors
3. **Data not syncing**: Verify dashboard URL and connection

## Development

### Testing:
1. Load extension in developer mode
2. Open zipForms in new tab
3. Check console for extension messages
4. Verify auto-fill and capture functionality

### Customization:
- Edit field mappings in `content-script.js`
- Modify UI in `popup.html`
- Add new form patterns as needed

## Security

- Extension only runs on zipForms domains
- No sensitive data stored permanently
- All communication over HTTPS
- Minimal permissions required