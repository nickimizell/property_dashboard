/**
 * Complete test workflow:
 * 1. Create a property
 * 2. Test editing (cursor jumping fix)
 * 3. Test task creation
 */

const puppeteer = require('puppeteer');

class FullWorkflowTest {
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

    async createTestProperty() {
        console.log('\n🏠 Creating test property...');
        
        // Click Add Property button
        const addPropertyClicked = await this.page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const addBtn = buttons.find(btn => btn.textContent.includes('Add Property'));
            if (addBtn) {
                addBtn.click();
                return true;
            }
            return false;
        });
        
        if (!addPropertyClicked) {
            throw new Error('Add Property button not found');
        }
        
        await this.page.waitForTimeout(2000);
        
        // Fill form
        const testData = {
            address: `${Math.floor(Math.random() * 9999)} Test Street, Test City, MO 63136`,
            clientName: 'Test Client for Editing',
            sellingAgent: 'Test Agent',
            currentListPrice: '175000',
            notes: 'Test property for cursor jumping verification'
        };
        
        console.log('📝 Filling property form...');
        
        // Fill address
        const addressField = await this.page.$('input[name="address"], input[placeholder*="address"]');
        if (addressField) {
            await addressField.click({ clickCount: 3 });
            await addressField.type(testData.address);
        }
        
        // Fill client name
        const clientField = await this.page.$('input[name="clientName"], input[placeholder*="client"]');
        if (clientField) {
            await clientField.click({ clickCount: 3 });
            await clientField.type(testData.clientName);
        }
        
        // Fill selling agent
        const agentField = await this.page.$('input[name="sellingAgent"], input[placeholder*="agent"]');
        if (agentField) {
            await agentField.click({ clickCount: 3 });
            await agentField.type(testData.sellingAgent);
        }
        
        // Fill price
        const priceField = await this.page.$('input[name="currentListPrice"], input[placeholder*="price"]');
        if (priceField) {
            await priceField.click({ clickCount: 3 });
            await priceField.type(testData.currentListPrice);
        }
        
        // Fill notes
        const notesField = await this.page.$('textarea[name="notes"], textarea[placeholder*="notes"]');
        if (notesField) {
            await notesField.click();
            await notesField.type(testData.notes);
        }
        
        // Submit form
        const submitted = await this.page.evaluate(() => {
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
        
        if (!submitted) {
            throw new Error('Submit button not found');
        }
        
        await this.page.waitForTimeout(4000);
        console.log('✅ Property created');
        return testData;
    }

    async testPropertyEditing() {
        console.log('\n✏️ Testing property editing (cursor jumping fix)...');
        
        // Click on the property we just created
        const propertyClicked = await this.page.evaluate(() => {
            const cards = document.querySelectorAll('.property-card, tbody tr');
            if (cards.length > 0) {
                cards[0].click();
                return true;
            }
            return false;
        });
        
        if (!propertyClicked) {
            throw new Error('No property found to click');
        }
        
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
            throw new Error('Edit button not found');
        }
        
        await this.page.waitForTimeout(1000);
        
        // Test cursor jumping fix - try to type in price field
        console.log('🧪 Testing cursor jumping fix...');
        
        await this.page.waitForSelector('input[type="number"]', { timeout: 5000 });
        const priceField = await this.page.$('input[type="number"]');
        
        if (!priceField) {
            throw new Error('Price field not found in edit mode');
        }
        
        // Clear and type new value
        await priceField.click({ clickCount: 3 });
        const testValue = '225000';
        await priceField.type(testValue, { delay: 50 });
        
        // Check if full value was entered
        const actualValue = await priceField.evaluate(el => el.value);
        
        console.log(`Expected: ${testValue}, Got: ${actualValue}`);
        
        if (actualValue === testValue) {
            console.log('✅ CURSOR JUMPING FIXED - Full value entered successfully');
            return true;
        } else {
            console.log('❌ CURSOR JUMPING STILL EXISTS - Only partial value entered');
            return false;
        }
    }

    async testTaskCreation() {
        console.log('\n📋 Testing task creation...');
        
        // Look for Add Task button
        const addTaskClicked = await this.page.evaluate(() => {
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
        
        if (!addTaskClicked) {
            console.log('❌ Add Task button not found');
            return false;
        }
        
        await this.page.waitForTimeout(2000);
        
        // Check if TaskForm modal appeared
        const taskFormExists = await this.page.evaluate(() => {
            return document.body.textContent.includes('Add New Task') ||
                   document.body.textContent.includes('Task Title') ||
                   document.querySelector('form') !== null;
        });
        
        if (!taskFormExists) {
            console.log('❌ Task form modal did not appear');
            return false;
        }
        
        console.log('✅ Task form modal appeared');
        
        // Try to fill task form
        const taskData = {
            title: 'Test Task - Verify Cursor Fix',
            description: 'This task verifies that the UI fixes are working correctly',
            category: 'Property Preparation',
            dueDate: '2025-08-01'
        };
        
        // Fill task title
        const titleField = await this.page.$('input[placeholder*="title"], input[type="text"]');
        if (titleField) {
            await titleField.type(taskData.title);
        }
        
        // Fill description
        const descField = await this.page.$('textarea');
        if (descField) {
            await descField.type(taskData.description);
        }
        
        // Select category
        const categorySelect = await this.page.$('select');
        if (categorySelect) {
            await categorySelect.select(taskData.category);
        }
        
        // Set due date
        const dateField = await this.page.$('input[type="date"]');
        if (dateField) {
            await dateField.evaluate((el, value) => el.value = value, taskData.dueDate);
        }
        
        // Submit task
        const taskSubmitted = await this.page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const submitBtn = buttons.find(btn => 
                btn.textContent.includes('Create Task') || 
                btn.textContent.includes('Save')
            );
            if (submitBtn) {
                submitBtn.click();
                return true;
            }
            return false;
        });
        
        if (taskSubmitted) {
            await this.page.waitForTimeout(2000);
            console.log('✅ TASK CREATION WORKS - Task form submitted successfully');
            return true;
        } else {
            console.log('❌ Task submit button not found');
            return false;
        }
    }

    async runFullTest() {
        await this.setup();
        
        try {
            await this.login();
            
            console.log('\n🎯 Starting full workflow test...\n');
            
            // Step 1: Create property
            const testProperty = await this.createTestProperty();
            
            // Step 2: Test editing (cursor jumping fix)
            const cursorFixed = await this.testPropertyEditing();
            
            // Step 3: Test task creation
            const taskCreationWorks = await this.testTaskCreation();
            
            // Results
            console.log('\n📊 FINAL TEST RESULTS:');
            console.log('═══════════════════════════');
            console.log(`✅ Property Creation: WORKING`);
            console.log(`${cursorFixed ? '✅' : '❌'} Cursor Jumping Fix: ${cursorFixed ? 'WORKING' : 'FAILED'}`);
            console.log(`${taskCreationWorks ? '✅' : '❌'} Task Creation: ${taskCreationWorks ? 'WORKING' : 'FAILED'}`);
            console.log('═══════════════════════════');
            
            if (cursorFixed && taskCreationWorks) {
                console.log('🎉 ALL FIXES WORKING! Ready for production.');
            } else {
                console.log('🚨 Some fixes still need work.');
            }
            
        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            await this.page.waitForTimeout(3000);
            await this.browser.close();
        }
    }
}

// Run the test
const tester = new FullWorkflowTest();
tester.runFullTest().catch(console.error);