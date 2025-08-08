/**
 * Debug script to understand current UI state
 */

const puppeteer = require('puppeteer');

class UIDebugger {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'https://ootb-property-dashboard.onrender.com';
    }

    async setup() {
        this.browser = await puppeteer.launch({
            headless: false,
            executablePath: '/snap/bin/chromium',
            args: ['--no-sandbox', '--disable-dev-shm-usage']
        });
        
        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1920, height: 1080 });
    }

    async login() {
        console.log('🔐 Logging in...');
        await this.page.goto(this.baseUrl);
        await this.page.type('#username', 'mattmizell');
        await this.page.type('#password', 'training1');
        await this.page.click('button[type="submit"]');
        await this.page.waitForTimeout(3000);
        console.log('✅ Logged in');
    }

    async debugCurrentState() {
        console.log('\n🔍 Debugging current UI state...');
        
        // Check what's visible on the page
        const pageInfo = await this.page.evaluate(() => {
            const info = {
                url: window.location.href,
                title: document.title,
                buttons: [],
                properties: 0,
                forms: 0,
                modals: 0
            };
            
            // Count buttons and their text
            const buttons = document.querySelectorAll('button');
            buttons.forEach((btn, i) => {
                info.buttons.push({
                    index: i,
                    text: btn.textContent.trim(),
                    visible: btn.offsetParent !== null,
                    disabled: btn.disabled
                });
            });
            
            // Count property cards/rows
            info.properties = document.querySelectorAll('.property-card, tbody tr').length;
            
            // Count forms
            info.forms = document.querySelectorAll('form').length;
            
            // Count modals/dialogs
            info.modals = document.querySelectorAll('[role="dialog"], .modal').length;
            
            return info;
        });
        
        console.log('📍 Page URL:', pageInfo.url);
        console.log('📄 Page Title:', pageInfo.title);
        console.log('🏠 Properties found:', pageInfo.properties);
        console.log('📝 Forms found:', pageInfo.forms);
        console.log('📦 Modals found:', pageInfo.modals);
        console.log('🔘 Buttons found:', pageInfo.buttons.length);
        
        console.log('\n🔘 Button inventory:');
        pageInfo.buttons.forEach(btn => {
            if (btn.visible && btn.text) {
                console.log(`  - "${btn.text}" ${btn.disabled ? '(disabled)' : '(enabled)'}`);
            }
        });
        
        return pageInfo;
    }

    async tryToAccessPropertyDetails() {
        console.log('\n🎯 Attempting to access property details...');
        
        // Try clicking on first property
        const propertyClicked = await this.page.evaluate(() => {
            const cards = document.querySelectorAll('.property-card');
            const rows = document.querySelectorAll('tbody tr');
            
            console.log('Property cards found:', cards.length);
            console.log('Table rows found:', rows.length);
            
            if (cards.length > 0) {
                console.log('Clicking on property card');
                cards[0].click();
                return 'card';
            } else if (rows.length > 0) {
                console.log('Clicking on table row');
                rows[0].click();
                return 'row';
            }
            return false;
        });
        
        if (propertyClicked) {
            console.log(`✅ Clicked on property ${propertyClicked}`);
            await this.page.waitForTimeout(3000);
            
            // Check what changed
            const afterClick = await this.debugCurrentState();
            return afterClick;
        } else {
            console.log('❌ No properties found to click');
            return null;
        }
    }

    async runDebug() {
        await this.setup();
        
        try {
            await this.login();
            const initialState = await this.debugCurrentState();
            
            if (initialState.properties > 0) {
                const afterPropertyClick = await this.tryToAccessPropertyDetails();
                
                if (afterPropertyClick) {
                    // Look specifically for Edit and Add Task buttons
                    const detailButtons = await this.page.evaluate(() => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        return {
                            editBtn: buttons.find(btn => btn.textContent.includes('Edit')) ? 'FOUND' : 'NOT FOUND',
                            addTaskBtn: buttons.find(btn => btn.textContent.includes('Add Task')) ? 'FOUND' : 'NOT FOUND',
                            allButtons: buttons.map(btn => btn.textContent.trim()).filter(text => text)
                        };
                    });
                    
                    console.log('\n🔍 Looking for specific buttons:');
                    console.log('Edit button:', detailButtons.editBtn);
                    console.log('Add Task button:', detailButtons.addTaskBtn);
                    console.log('All buttons:', detailButtons.allButtons);
                }
            } else {
                console.log('❌ No properties found - need to create one first');
            }
            
        } catch (error) {
            console.error('❌ Debug failed:', error);
        } finally {
            await this.page.waitForTimeout(5000); // Wait to see result
            await this.browser.close();
        }
    }
}

// Run debug
const uiDebugger = new UIDebugger();
uiDebugger.runDebug().catch(console.error);