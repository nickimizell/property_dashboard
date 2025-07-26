/**
 * Debug property creation process specifically
 */

const puppeteer = require('puppeteer');

async function debugPropertyCreation() {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/snap/bin/chromium',
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Monitor network requests
    const requests = [];
    page.on('request', request => {
        requests.push({
            url: request.url(),
            method: request.method(),
            postData: request.postData(),
            timestamp: Date.now()
        });
    });
    
    const responses = [];
    page.on('response', response => {
        responses.push({
            url: response.url(),
            status: response.status(),
            statusText: response.statusText(),
            timestamp: Date.now()
        });
    });
    
    await page.goto('https://ootb-property-dashboard.onrender.com');
    
    console.log('🔐 Logging in...');
    await page.type('#username', 'mattmizell');
    await page.type('#password', 'training1');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    console.log('📊 Taking screenshot of dashboard...');
    await page.screenshot({ path: 'debug-dashboard.png', fullPage: true });
    
    // Count existing properties
    const initialPropertyCount = await page.evaluate(() => {
        const cards = document.querySelectorAll('.property-card, .property-item, tbody tr');
        return cards.length;
    });
    console.log(`📋 Initial property count: ${initialPropertyCount}`);
    
    console.log('🏠 Opening Add Property form...');
    const addPropertyClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addBtn = buttons.find(btn => btn.textContent.trim() === 'Add Property');
        if (addBtn) {
            addBtn.click();
            return true;
        }
        return false;
    });
    
    if (!addPropertyClicked) {
        console.error('❌ Add Property button not found');
        await browser.close();
        return;
    }
    
    await page.waitForTimeout(2000);
    console.log('📝 Taking screenshot of form...');
    await page.screenshot({ path: 'debug-form.png', fullPage: true });
    
    console.log('✏️ Filling property form...');
    const testProperty = {
        address: `${Math.floor(Math.random() * 9999)} Debug St, Test City, MO 63136`,
        clientName: 'Debug Test Client',
        sellingAgent: 'Debug Agent',
        currentListPrice: '175000',
        notes: 'Debug test property for form testing'
    };
    
    // Fill form fields
    const fields = [
        { selector: 'input[name="address"]', value: testProperty.address },
        { selector: 'input[name="clientName"]', value: testProperty.clientName },
        { selector: 'input[name="sellingAgent"]', value: testProperty.sellingAgent },
        { selector: 'input[name="currentListPrice"]', value: testProperty.currentListPrice },
        { selector: 'textarea[name="notes"]', value: testProperty.notes }
    ];
    
    for (const field of fields) {
        try {
            const element = await page.$(field.selector);
            if (element) {
                await element.click({ clickCount: 3 });
                await element.type(field.value);
                console.log(`✅ Filled ${field.selector}: ${field.value}`);
            } else {
                console.log(`⚠️ Field not found: ${field.selector}`);
            }
        } catch (error) {
            console.log(`❌ Error filling ${field.selector}: ${error.message}`);
        }
    }
    
    console.log('📝 Taking screenshot after filling form...');
    await page.screenshot({ path: 'debug-form-filled.png', fullPage: true });
    
    console.log('💾 Submitting form...');
    const submitClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const submitBtn = buttons.find(btn => 
            btn.textContent.includes('Save') || 
            btn.textContent.includes('Create') || 
            btn.type === 'submit'
        );
        if (submitBtn) {
            submitBtn.click();
            return true;
        }
        return false;
    });
    
    if (!submitClicked) {
        console.error('❌ Submit button not found');
        await browser.close();
        return;
    }
    
    // Wait and monitor the submission process
    console.log('⏳ Waiting for form submission to complete...');
    await page.waitForTimeout(5000);
    
    console.log('📊 Taking screenshot after submission...');
    await page.screenshot({ path: 'debug-after-submit.png', fullPage: true });
    
    // Check if we're back on the dashboard
    const isOnDashboard = await page.evaluate(() => {
        return document.body.textContent.includes('Property Management Dashboard') ||
               document.body.textContent.includes('Properties Overview');
    });
    
    console.log(`📍 On dashboard: ${isOnDashboard}`);
    
    // Count properties again
    const finalPropertyCount = await page.evaluate(() => {
        const cards = document.querySelectorAll('.property-card, .property-item, tbody tr');
        return cards.length;
    });
    console.log(`📋 Final property count: ${finalPropertyCount}`);
    
    // Check if our test property appears
    const propertyExists = await page.evaluate((address) => {
        return document.body.textContent.includes(address);
    }, testProperty.address);
    
    console.log(`🏠 Test property visible: ${propertyExists}`);
    
    // Check for any error messages
    const errorMessages = await page.evaluate(() => {
        const errorElements = document.querySelectorAll('.error, .alert-error, [class*="error"]');
        return Array.from(errorElements).map(el => el.textContent);
    });
    
    if (errorMessages.length > 0) {
        console.log('❌ Error messages found:', errorMessages);
    }
    
    // Analyze network requests
    console.log('\n🌐 Network Activity:');
    const propertyRequests = requests.filter(req => 
        req.url.includes('/api/properties') || 
        req.url.includes('/properties') ||
        req.method === 'POST'
    );
    
    propertyRequests.forEach(req => {
        console.log(`${req.method} ${req.url}`);
        if (req.postData) {
            console.log(`  Data: ${req.postData.substring(0, 100)}...`);
        }
    });
    
    console.log('\n📡 Response Status:');
    const propertyResponses = responses.filter(res => 
        res.url.includes('/api/properties') || 
        res.url.includes('/properties')
    );
    
    propertyResponses.forEach(res => {
        console.log(`${res.status} ${res.statusText} - ${res.url}`);
    });
    
    // Check localStorage for any data
    const localStorageData = await page.evaluate(() => {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('properties') || key.includes('auth'))) {
                data[key] = localStorage.getItem(key);
            }
        }
        return data;
    });
    
    console.log('\n💾 Relevant localStorage data:');
    Object.entries(localStorageData).forEach(([key, value]) => {
        if (typeof value === 'string' && value.length > 100) {
            console.log(`${key}: ${value.substring(0, 100)}...`);
        } else {
            console.log(`${key}: ${value}`);
        }
    });
    
    console.log('\n📊 Summary:');
    console.log(`Initial properties: ${initialPropertyCount}`);
    console.log(`Final properties: ${finalPropertyCount}`);
    console.log(`Property created successfully: ${finalPropertyCount > initialPropertyCount}`);
    console.log(`Property visible on page: ${propertyExists}`);
    console.log(`Form submitted: ${submitClicked}`);
    console.log(`Back on dashboard: ${isOnDashboard}`);
    
    await browser.close();
}

debugPropertyCreation().catch(console.error);