# Browser Extension Installation Guide

## Step 1: Create Icon Files

The extension needs icon files that aren't included in git. Create them by:

### Option A: Use the Icon Generator
1. Open `create-icons.html` in your browser
2. Click "Generate Icons"
3. Click "Download All Icons"
4. Save the downloaded PNG files in this folder

### Option B: Create Manually
Create three PNG files with the OOTB logo:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

## Step 2: Install in Chrome/Edge

1. Open Chrome or Edge browser
2. Go to: `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select this `browser-extension` folder
6. The extension should now appear in your browser

## Step 3: Configure Extension

1. Click the extension icon in your browser toolbar
2. Set your dashboard URL (default: http://localhost:3000)
3. Ensure "Auto-fill Forms" and "Auto-capture" are enabled

## Step 4: Test Integration

1. Go to your dashboard (http://localhost:3000)
2. Open any property's Transaction Coordinator
3. Click "Open in zipForms" button
4. Verify the extension auto-fills fields in zipForms

## Troubleshooting

### Extension Won't Load:
- Check all icon files are present
- Verify manifest.json is valid
- Check browser console for errors

### Auto-fill Not Working:
- Ensure extension permissions are granted
- Check zipForms page has loaded completely
- Open browser DevTools to see console messages

### Data Not Syncing:
- Verify dashboard URL is correct
- Check dashboard is running on specified port
- Test connection from extension popup

## Files Needed:
- ✅ manifest.json
- ✅ background.js
- ✅ content-script.js
- ✅ popup.html
- ✅ popup.js
- ⚠️ icon16.png (create this)
- ⚠️ icon48.png (create this)
- ⚠️ icon128.png (create this)