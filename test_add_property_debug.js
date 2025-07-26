/**
 * Debug Add Property button specifically
 */

const puppeteer = require('puppeteer');

async function debugAddProperty() {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/snap/bin/chromium',
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.goto('https://ootb-property-dashboard.onrender.com');
    
    console.log('🔍 Testing Add Property button...');
    
    // Login first
    await page.type('#username', 'mattmizell');
    await page.type('#password', 'training1');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    // Wait for dashboard to load
    await page.waitForTimeout(3000);
    
    // Check all buttons and their text
    const allButtons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map((btn, index) => ({
            index,
            text: btn.textContent.trim(),
            visible: btn.offsetParent !== null,
            className: btn.className,
            innerHTML: btn.innerHTML
        }));
    });
    
    console.log('All buttons found:');
    allButtons.forEach(btn => {
        if (btn.text.toLowerCase().includes('add') || btn.text.toLowerCase().includes('property')) {
            console.log(`🎯 MATCH: Button ${btn.index}: "${btn.text}" (visible: ${btn.visible})`);
        } else {
            console.log(`   Button ${btn.index}: "${btn.text}" (visible: ${btn.visible})`);
        }
    });
    
    // Try to find Add Property button using different methods
    const methods = [
        { name: 'XPath exact', code: () => page.$x('//button[text()="Add Property"]') },
        { name: 'XPath contains', code: () => page.$x('//button[contains(text(), "Add Property")]') },
        { name: 'XPath case insensitive', code: () => page.$x('//button[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "add property")]') },
        { name: 'CSS selector', code: () => page.$$('button') }
    ];
    
    for (const method of methods) {
        try {
            const result = await method.code();
            console.log(`${method.name}: Found ${Array.isArray(result) ? result.length : (result ? 1 : 0)} elements`);
        } catch (e) {
            console.log(`${method.name}: Error - ${e.message}`);
        }
    }
    
    await page.screenshot({ path: 'add-property-debug.png', fullPage: true });
    console.log('Screenshot saved as add-property-debug.png');
    
    await browser.close();
}

debugAddProperty().catch(console.error);