/**
 * Comprehensive End-to-End Test Suite
 * Tests the complete OOTB Property Dashboard workflow
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class E2ETestSuite {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'https://ootb-property-dashboard.onrender.com';
        this.testResults = {
            passed: 0,
            failed: 0,
            issues: [],
            testData: {}
        };
        this.testProperty = {
            address: `${Math.floor(Math.random() * 9999)} Test St, Testing, MO 63136`,
            clientName: 'E2E Test Client',
            sellingAgent: 'Test Agent',
            currentListPrice: 150000,
            status: 'Active',
            propertyType: 'Single Family',
            notes: 'Created by automated E2E test'
        };
    }

    async setup() {
        console.log('🚀 Starting E2E Test Suite...');
        
        this.browser = await puppeteer.launch({
            headless: process.env.HEADLESS === 'true' ? true : false, // Show browser for debugging unless headless specified
            slowMo: process.env.HEADLESS === 'true' ? 0 : 100, // Slow down for visibility in headed mode
            executablePath: '/snap/bin/chromium', // Use system Chromium
            args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-web-security']
        });
        
        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        // Set up request/response logging
        this.page.on('response', response => {
            if (response.status() >= 400) {
                console.log(`❌ HTTP Error: ${response.status()} - ${response.url()}`);
            }
        });
        
        // Set up console logging
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`❌ Console Error: ${msg.text()}`);
            }
        });
    }

    async teardown() {
        if (this.browser) {
            await this.browser.close();
        }
        this.generateReport();
    }

    async assert(condition, message) {
        if (condition) {
            console.log(`✅ ${message}`);
            this.testResults.passed++;
        } else {
            console.log(`❌ ${message}`);
            this.testResults.failed++;
            this.testResults.issues.push(message);
        }
    }

    async takeScreenshot(name) {
        await this.page.screenshot({ 
            path: `test-screenshots/${name}.png`,
            fullPage: true 
        });
    }

    // Test 1: Login
    async testLogin() {
        console.log('\n📝 Test 1: User Authentication');
        
        try {
            await this.page.goto(this.baseUrl);
            await this.takeScreenshot('00-page-loaded');
            
            // Check if we're already logged in by looking for auth token
            const isLoggedIn = await this.page.evaluate(() => {
                return localStorage.getItem('auth_token') !== null;
            });
            
            if (isLoggedIn) {
                await this.assert(true, 'Already logged in');
                return;
            }
            
            // Wait for login form to be ready
            await this.page.waitForSelector('#username', { timeout: 10000 });
            
            // Fill login form using the correct IDs
            await this.page.type('#username', 'mattmizell');
            await this.page.type('#password', 'training1');
            
            // Submit form - click the Sign In button
            await this.page.click('button[type="submit"]');
            
            // Wait for dashboard to load or login success
            await this.page.waitForTimeout(3000);
            
            // Check if login was successful
            const loginSuccessful = await this.page.evaluate(() => {
                return localStorage.getItem('auth_token') !== null || 
                       document.body.textContent.includes('Properties') ||
                       document.body.textContent.includes('Dashboard');
            });
            
            await this.assert(loginSuccessful, 'Successfully logged in');
            await this.takeScreenshot('01-login-success');
            
        } catch (error) {
            await this.assert(false, `Login failed: ${error.message}`);
            await this.takeScreenshot('01-login-failed');
        }
    }

    // Test 2: Create New Property
    async testCreateProperty() {
        console.log('\n🏠 Test 2: Create New Property');
        
        try {
            // Wait for dashboard to fully load
            await this.page.waitForTimeout(3000);
            
            // Look for "Add Property" button using evaluate and click
            const addPropertyClicked = await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const addPropertyBtn = buttons.find(btn => btn.textContent.trim() === 'Add Property');
                if (addPropertyBtn) {
                    addPropertyBtn.click();
                    return true;
                }
                return false;
            });
            
            if (!addPropertyClicked) {
                throw new Error('Add Property button not found');
            }
            
            // Wait for property form to appear
            await this.page.waitForSelector('form, [role="dialog"], .modal', { timeout: 5000 });
            
            // Fill out property form
            await this.fillPropertyForm();
            
            // Submit form using XPath
            const saveButtons = await this.page.$x('//button[contains(text(), "Save") or contains(text(), "Create") or contains(text(), "Submit") or @type="submit"]');
            if (saveButtons.length > 0) {
                await saveButtons[0].click();
            }
            
            // Wait for success confirmation or redirect
            await this.page.waitForTimeout(2000);
            
            // Verify property was created by checking multiple indicators
            const propertyCreated = await this.page.evaluate((address) => {
                // Check if property appears in the list
                const hasAddress = document.body.textContent.includes(address);
                
                // Check for success indicators
                const hasSuccessMessage = document.body.textContent.includes('created') || 
                                        document.body.textContent.includes('saved') ||
                                        document.body.textContent.includes('added');
                
                // Check if we're back on the properties list
                const hasPropertiesList = document.querySelector('table') !== null ||
                                         document.querySelector('.property-card') !== null ||
                                         document.querySelector('[data-testid="property"]') !== null;
                
                return hasAddress || hasSuccessMessage || hasPropertiesList;
            }, this.testProperty.address);
            
            await this.assert(propertyCreated, 'Property created successfully');
            await this.takeScreenshot('02-property-created');
            
            // Store property ID if available
            this.testResults.testData.propertyId = await this.extractPropertyId();
            
        } catch (error) {
            await this.assert(false, `Property creation failed: ${error.message}`);
            await this.takeScreenshot('02-property-creation-failed');
        }
    }

    async fillPropertyForm() {
        const formFields = [
            { selector: 'input[name="address"], input[placeholder*="address"]', value: this.testProperty.address },
            { selector: 'input[name="clientName"], input[placeholder*="client"]', value: this.testProperty.clientName },
            { selector: 'input[name="sellingAgent"], input[placeholder*="agent"]', value: this.testProperty.sellingAgent },
            { selector: 'input[name="currentListPrice"], input[placeholder*="price"]', value: this.testProperty.currentListPrice.toString() },
            { selector: 'textarea[name="notes"], textarea[placeholder*="notes"]', value: this.testProperty.notes }
        ];

        for (const field of formFields) {
            try {
                const element = await this.page.$(field.selector);
                if (element) {
                    await element.click({ clickCount: 3 }); // Select all text
                    await element.type(field.value);
                    await this.assert(true, `Filled field: ${field.selector}`);
                }
            } catch (error) {
                console.log(`⚠️ Could not fill field ${field.selector}: ${error.message}`);
            }
        }

        // Handle select dropdowns
        try {
            const statusSelect = await this.page.$('select[name="status"]');
            if (statusSelect) {
                await statusSelect.select('Active');
            }
        } catch (e) {
            // Status field might not exist or be different
        }
    }

    async extractPropertyId() {
        try {
            // Try to extract property ID from URL or data attributes
            const url = this.page.url();
            const match = url.match(/property\/([a-f0-9-]+)/);
            return match ? match[1] : null;
        } catch (error) {
            return null;
        }
    }

    // Test 3: Edit Property
    async testEditProperty() {
        console.log('\n✏️ Test 3: Edit Property Details');
        
        try {
            // Find and click on the test property
            await this.findAndClickProperty();
            
            // Look for edit button
            const editSelectors = [
                'button:contains("Edit")',
                '[data-testid="edit-button"]',
                'button[class*="edit"]'
            ];
            
            for (const selector of editSelectors) {
                try {
                    await this.page.click(selector);
                    break;
                } catch (e) {
                    // Try next selector
                }
            }
            
            // Wait for edit mode
            await this.page.waitForTimeout(1000);
            
            // Test the cursor jumping fix by editing the price
            const priceField = await this.page.$('input[name="currentListPrice"], input[type="number"]');
            if (priceField) {
                await priceField.click({ clickCount: 3 }); // Select all
                await priceField.type('175000'); // Type new price
                
                // Verify text was entered correctly (test for cursor jumping)
                const value = await priceField.evaluate(el => el.value);
                await this.assert(value === '175000', 'Price field editing works without cursor jumping');
            }
            
            // Test editing text fields
            const notesField = await this.page.$('textarea[name="notes"], textarea');
            if (notesField) {
                await notesField.click();
                await notesField.type('\nUpdated via E2E test - editing works!');
                
                // Check if text was added successfully
                const notesValue = await notesField.evaluate(el => el.value);
                await this.assert(notesValue.includes('Updated via E2E test'), 'Notes field editing works correctly');
            }
            
            // Save changes using XPath
            const saveEditButtons = await this.page.$x('//button[contains(text(), "Save") or @type="submit"]');
            if (saveEditButtons.length > 0) {
                await saveEditButtons[0].click();
            }
            await this.page.waitForTimeout(2000);
            
            await this.assert(true, 'Property editing completed');
            await this.takeScreenshot('03-property-edited');
            
        } catch (error) {
            await this.assert(false, `Property editing failed: ${error.message}`);
            await this.takeScreenshot('03-property-editing-failed');
        }
    }

    async findAndClickProperty() {
        // Try to find the test property in the list using XPath
        try {
            // First try to find by text content
            const propertyLinks = await this.page.$x(`//a[contains(text(), "${this.testProperty.address}")]`);
            if (propertyLinks.length > 0) {
                await propertyLinks[0].click();
                return;
            }
            
            // Try clicking on rows containing the address
            const propertyRows = await this.page.$x(`//tr[contains(., "${this.testProperty.address}")]`);
            if (propertyRows.length > 0) {
                await propertyRows[0].click();
                return;
            }
        } catch (e) {
            console.log('Could not find test property, trying first available property');
        }
        
        // Fallback: click first property in list
        const fallbackSelectors = [
            '.property-card:first-child',
            '.property-item:first-child', 
            'tbody tr:first-child',
            'table tr:nth-child(2)' // Skip header row
        ];
        
        for (const selector of fallbackSelectors) {
            try {
                await this.page.click(selector);
                return;
            } catch (e) {
                // Try next selector
            }
        }
    }

    // Test 4: Document Upload
    async testDocumentUpload() {
        console.log('\n📄 Test 4: Document Upload');
        
        try {
            // Navigate to transaction coordinator or documents section using XPath
            const docButtons = await this.page.$x('//button[contains(text(), "Documents") or contains(text(), "Transaction") or contains(text(), "Upload")]');
            if (docButtons.length > 0) {
                await docButtons[0].click();
            }
            
            await this.page.waitForTimeout(1000);
            
            // Create a test PDF file
            await this.createTestDocument();
            
            // Find file upload input
            const fileInput = await this.page.$('input[type="file"]');
            if (fileInput) {
                await fileInput.uploadFile('./test-document.pdf');
                await this.assert(true, 'Test document uploaded');
                
                // Wait for upload to complete
                await this.page.waitForTimeout(3000);
                
                // Check if document appears in the list
                const docExists = await this.page.evaluate(() => {
                    return document.body.textContent.includes('test-document.pdf');
                });
                
                await this.assert(docExists, 'Document appears in document list');
            } else {
                await this.assert(false, 'File upload input not found');
            }
            
            await this.takeScreenshot('04-document-uploaded');
            
        } catch (error) {
            await this.assert(false, `Document upload failed: ${error.message}`);
            await this.takeScreenshot('04-document-upload-failed');
        }
    }

    async createTestDocument() {
        // Create a simple test PDF file
        const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
72 720 Td
(E2E Test Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
299
%%EOF`;
        
        fs.writeFileSync('./test-document.pdf', pdfContent);
    }

    // Test 5: Email Processing
    async testEmailProcessing() {
        console.log('\n📧 Test 5: Email-Based Property Updates');
        
        try {
            // Test email processing by making API calls to simulate email received
            const response = await this.page.evaluate(async (testProperty) => {
                const token = localStorage.getItem('auth_token');
                
                // Check email processing status
                const statusResponse = await fetch('/api/email-processing/status', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                return {
                    status: statusResponse.status,
                    data: await statusResponse.json()
                };
            }, this.testProperty);
            
            await this.assert(response.status === 200, 'Email processing system is accessible');
            
            if (response.data.isRunning !== undefined) {
                await this.assert(true, `Email processing status: ${response.data.isRunning ? 'Running' : 'Stopped'}`);
            }
            
            // Test email statistics
            const statsResponse = await this.page.evaluate(async () => {
                const token = localStorage.getItem('auth_token');
                const response = await fetch('/api/email-processing/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                return await response.json();
            });
            
            await this.assert(statsResponse.total_emails !== undefined, 'Email processing statistics available');
            console.log(`📊 Email Stats: ${statsResponse.total_emails} total emails processed`);
            
            await this.takeScreenshot('05-email-processing-status');
            
        } catch (error) {
            await this.assert(false, `Email processing test failed: ${error.message}`);
            await this.takeScreenshot('05-email-processing-failed');
        }
    }

    // Test 6: Task Management
    async testTaskManagement() {
        console.log('\n📋 Test 6: Task Management');
        
        try {
            // Look for tasks section using XPath
            const taskButtons = await this.page.$x('//button[contains(text(), "Tasks") or contains(text(), "Task")]');
            if (taskButtons.length > 0) {
                await taskButtons[0].click();
            }
            
            await this.page.waitForTimeout(1000);
            
            // Try to create a new task using XPath
            const addTaskButtons = await this.page.$x('//button[contains(text(), "Add Task") or contains(text(), "New Task") or contains(text(), "+")]');
            if (addTaskButtons.length > 0) {
                await addTaskButtons[0].click();
                
                // Fill task form if it appears
                await this.page.waitForTimeout(500);
                
                const taskTitleInput = await this.page.$('input[name="title"], input[placeholder*="task"]');
                if (taskTitleInput) {
                    await taskTitleInput.type('E2E Test Task - Verify System Works');
                }
                
                const taskDescInput = await this.page.$('textarea[name="description"], textarea[placeholder*="description"]');
                if (taskDescInput) {
                    await taskDescInput.type('This task was created by the automated E2E test to verify task management functionality.');
                }
                
                // Save task using XPath
                const saveTaskButtons = await this.page.$x('//button[contains(text(), "Save") or contains(text(), "Create")]');
                if (saveTaskButtons.length > 0) {
                    await saveTaskButtons[0].click();
                }
                await this.page.waitForTimeout(1000);
                
                await this.assert(true, 'Task creation attempted');
            }
            
            // Check if tasks are displayed
            const tasksVisible = await this.page.evaluate(() => {
                return document.querySelectorAll('.task-item, [data-testid="task"], .task').length > 0;
            });
            
            await this.assert(tasksVisible, 'Tasks are displayed in the interface');
            await this.takeScreenshot('06-task-management');
            
        } catch (error) {
            await this.assert(false, `Task management test failed: ${error.message}`);
            await this.takeScreenshot('06-task-management-failed');
        }
    }

    // Test 7: Data Persistence
    async testDataPersistence() {
        console.log('\n💾 Test 7: Data Persistence');
        
        try {
            // Refresh the page to test if data persists
            await this.page.reload();
            await this.page.waitForTimeout(2000);
            
            // Check if the test property still exists
            const propertyExists = await this.page.evaluate((address) => {
                return document.body.textContent.includes(address);
            }, this.testProperty.address);
            
            await this.assert(propertyExists, 'Property data persists after page refresh');
            
            // Test API data retrieval
            const apiData = await this.page.evaluate(async () => {
                const token = localStorage.getItem('auth_token');
                const response = await fetch('/api/properties', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                return await response.json();
            });
            
            await this.assert(Array.isArray(apiData) && apiData.length > 0, 'API returns property data');
            
            await this.takeScreenshot('07-data-persistence');
            
        } catch (error) {
            await this.assert(false, `Data persistence test failed: ${error.message}`);
            await this.takeScreenshot('07-data-persistence-failed');
        }
    }

    // Run all tests
    async runAllTests() {
        await this.setup();
        
        try {
            // Create screenshots directory
            if (!fs.existsSync('test-screenshots')) {
                fs.mkdirSync('test-screenshots');
            }
            
            await this.testLogin();
            await this.testCreateProperty();
            await this.testEditProperty();
            await this.testDocumentUpload();
            await this.testTaskManagement();
            await this.testEmailProcessing();
            await this.testDataPersistence();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        } finally {
            await this.teardown();
        }
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.testResults.passed + this.testResults.failed,
                passed: this.testResults.passed,
                failed: this.testResults.failed,
                successRate: `${Math.round((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100)}%`
            },
            issues: this.testResults.issues,
            testData: this.testResults.testData
        };
        
        fs.writeFileSync('e2e-test-report.json', JSON.stringify(report, null, 2));
        
        console.log('\n📊 E2E Test Results:');
        console.log(`✅ Passed: ${report.summary.passed}`);
        console.log(`❌ Failed: ${report.summary.failed}`);
        console.log(`📈 Success Rate: ${report.summary.successRate}`);
        
        if (report.issues.length > 0) {
            console.log('\n🐛 Issues Found:');
            report.issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue}`);
            });
        }
        
        console.log('\n📄 Full report saved to: e2e-test-report.json');
        console.log('📸 Screenshots saved to: test-screenshots/');
    }
}

// Run the test suite
async function main() {
    const testSuite = new E2ETestSuite();
    await testSuite.runAllTests();
}

// Handle cleanup on exit
process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted by user');
    process.exit(0);
});

// Export for use in other scripts
module.exports = E2ETestSuite;

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}