/**
 * Test script to verify specific issues:
 * 1. Cursor jumping when editing properties
 * 2. Missing task creation functionality
 */

const puppeteer = require('puppeteer');

class IssueVerificationTest {
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

    async testCursorJumping() {
        console.log('\n🧪 Testing cursor jumping issue...');
        
        // Click on a property to open details
        await this.page.evaluate(() => {
            const cards = document.querySelectorAll('.property-card, tbody tr');
            if (cards.length > 0) {
                cards[0].click();
            }
        });
        await this.page.waitForTimeout(2000);

        // Click Edit button
        const editClicked = await this.page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const editBtn = buttons.find(btn => btn.textContent.includes('Edit'));
            if (editBtn) {
                editBtn.click();
                return true;
            }
            return false;
        });

        if (!editClicked) {
            console.log('❌ Edit button not found');
            return false;
        }

        await this.page.waitForTimeout(1000);

        // Test typing in a price field
        console.log('Testing price field typing...');
        
        try {
            await this.page.waitForSelector('input[type="number"]', { timeout: 5000 });
            const priceField = await this.page.$('input[type="number"]');
            
            if (priceField) {
                await priceField.click({ clickCount: 3 }); // Select all
                await priceField.type('250000', { delay: 100 });
                
                const finalValue = await priceField.evaluate(el => el.value);
                console.log(`Expected: 250000, Got: ${finalValue}`);
                
                if (finalValue === '250000') {
                    console.log('✅ Cursor jumping FIXED - can type full value');
                    return true;
                } else {
                    console.log('❌ Cursor jumping STILL EXISTS - only got partial value');
                    return false;
                }
            } else {
                console.log('❌ Price field not found');
                return false;
            }
        } catch (error) {
            console.log('❌ Error testing cursor jumping:', error.message);
            return false;
        }
    }

    async testTaskCreation() {
        console.log('\n🧪 Testing task creation...');
        
        // Look for Add Task button
        const addTaskFound = await this.page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const addTaskBtn = buttons.find(btn => 
                btn.textContent.includes('Add Task') || 
                btn.textContent.includes('Add the first task')
            );
            if (addTaskBtn) {
                addTaskBtn.click();
                return true;
            }
            return false;
        });

        if (!addTaskFound) {
            console.log('❌ Add Task button not found');
            return false;
        }

        await this.page.waitForTimeout(1000);

        // Check if a task form appeared
        const taskFormExists = await this.page.evaluate(() => {
            // Look for typical task form elements
            return document.querySelector('form') !== null ||
                   document.querySelector('[role="dialog"]') !== null ||
                   document.querySelector('.modal') !== null ||
                   document.body.textContent.includes('Task Title') ||
                   document.body.textContent.includes('Task Description');
        });

        if (taskFormExists) {
            console.log('✅ Task form appears when Add Task is clicked');
            return true;
        } else {
            console.log('❌ Task form does NOT appear - this is the bug!');
            return false;
        }
    }

    async runTests() {
        await this.setup();
        
        try {
            await this.login();
            
            console.log('\n🎯 Testing specific issues reported by user...\n');
            
            const cursorFixed = await this.testCursorJumping();
            const taskCreationWorks = await this.testTaskCreation();
            
            console.log('\n📊 Test Results:');
            console.log(`Cursor jumping fixed: ${cursorFixed ? '✅' : '❌'}`);
            console.log(`Task creation works: ${taskCreationWorks ? '✅' : '❌'}`);
            
            if (!cursorFixed || !taskCreationWorks) {
                console.log('\n🚨 Issues confirmed - fixes needed!');
            } else {
                console.log('\n🎉 All issues resolved!');
            }
            
        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            await this.browser.close();
        }
    }
}

// Run if called directly
if (require.main === module) {
    const tester = new IssueVerificationTest();
    tester.runTests().catch(console.error);
}

module.exports = IssueVerificationTest;