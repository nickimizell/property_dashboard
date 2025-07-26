/**
 * Test login flow specifically
 */

const puppeteer = require('puppeteer');

async function testLogin() {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/snap/bin/chromium',
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.goto('https://ootb-property-dashboard.onrender.com');
    
    console.log('🔍 Testing login flow...');
    
    // Fill and submit login
    await page.type('#username', 'mattmizell');
    await page.type('#password', 'training1');
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Check auth status
    const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    console.log('Auth token after login:', authToken ? 'Present' : 'Not found');
    
    // Get page content
    const pageContent = await page.evaluate(() => {
        return {
            title: document.title,
            url: window.location.href,
            hasProperties: document.body.textContent.includes('Properties'),
            hasDashboard: document.body.textContent.includes('Dashboard'),
            buttonTexts: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim())
        };
    });
    
    console.log('Page after login:', pageContent);
    
    // Take screenshots
    await page.screenshot({ path: 'login-result.png', fullPage: true });
    console.log('Screenshot saved as login-result.png');
    
    await browser.close();
}

testLogin().catch(console.error);