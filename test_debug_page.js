/**
 * Simple debug script to see what's on the page
 */

const puppeteer = require('puppeteer');

async function debugPage() {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/snap/bin/chromium',
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.goto('https://ootb-property-dashboard.onrender.com');
    
    console.log('🔍 Page loaded, analyzing content...');
    
    // Get page title and basic info
    const title = await page.title();
    console.log('Page Title:', title);
    
    // Check for login status
    const isLoggedIn = await page.evaluate(() => {
        return localStorage.getItem('auth_token') !== null;
    });
    console.log('Logged in status:', isLoggedIn);
    
    // Get all buttons on the page
    const buttons = await page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button'));
        return allButtons.map(btn => ({
            text: btn.textContent.trim(),
            className: btn.className,
            type: btn.type,
            id: btn.id
        }));
    });
    
    console.log('Buttons found:', buttons);
    
    // Get all inputs
    const inputs = await page.evaluate(() => {
        const allInputs = Array.from(document.querySelectorAll('input'));
        return allInputs.map(input => ({
            name: input.name,
            type: input.type,
            placeholder: input.placeholder,
            id: input.id
        }));
    });
    
    console.log('Inputs found:', inputs);
    
    // Take screenshot
    await page.screenshot({ path: 'debug-page.png', fullPage: true });
    console.log('Screenshot saved as debug-page.png');
    
    await browser.close();
}

debugPage().catch(console.error);