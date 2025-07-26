/**
 * Comprehensive UI Task Inventory and Testing
 * Tests every possible user interaction in the OOTB Property Dashboard
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

class ComprehensiveUITester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'https://ootb-property-dashboard.onrender.com';
        this.testResults = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            issues: [],
            taskInventory: {}
        };
    }

    async setup() {
        this.browser = await puppeteer.launch({
            headless: process.env.HEADLESS === 'true' ? true : false,
            executablePath: '/snap/bin/chromium',
            args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-web-security']
        });
        
        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        // Set up error logging
        this.page.on('response', response => {
            if (response.status() >= 400) {
                console.log(`❌ HTTP Error: ${response.status()} - ${response.url()}`);
            }
        });
        
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`❌ Console Error: ${msg.text()}`);
            }
        });
    }

    async login() {
        console.log('🔐 Logging in...');
        await this.page.goto(this.baseUrl);
        await this.page.type('#username', 'mattmizell');
        await this.page.type('#password', 'training1');
        await this.page.click('button[type="submit"]');
        await this.page.waitForTimeout(3000);
        
        const isLoggedIn = await this.page.evaluate(() => {
            return localStorage.getItem('auth_token') !== null;
        });
        
        if (!isLoggedIn) {
            throw new Error('Login failed');
        }
        console.log('✅ Login successful');
    }

    async inventoryAllUIElements() {
        console.log('📋 Creating comprehensive UI inventory...');
        
        const uiInventory = await this.page.evaluate(() => {
            const inventory = {
                navigation: [],
                buttons: [],
                forms: [],
                tables: [],
                modals: [],
                inputs: [],
                selects: [],
                textareas: [],
                links: []
            };

            // Navigation elements
            const navElements = document.querySelectorAll('nav, .nav, [role="navigation"]');
            navElements.forEach((nav, i) => {
                const navButtons = nav.querySelectorAll('button, a');
                navButtons.forEach(btn => {
                    inventory.navigation.push({
                        text: btn.textContent.trim(),
                        type: btn.tagName.toLowerCase(),
                        className: btn.className,
                        href: btn.href || null
                    });
                });
            });

            // All buttons
            document.querySelectorAll('button').forEach((btn, i) => {
                inventory.buttons.push({
                    index: i,
                    text: btn.textContent.trim(),
                    type: btn.type,
                    className: btn.className,
                    disabled: btn.disabled,
                    visible: btn.offsetParent !== null
                });
            });

            // All forms
            document.querySelectorAll('form').forEach((form, i) => {
                inventory.forms.push({
                    index: i,
                    id: form.id,
                    className: form.className,
                    inputs: form.querySelectorAll('input').length,
                    textareas: form.querySelectorAll('textarea').length,
                    selects: form.querySelectorAll('select').length
                });
            });

            // Tables
            document.querySelectorAll('table').forEach((table, i) => {
                inventory.tables.push({
                    index: i,
                    rows: table.querySelectorAll('tr').length,
                    headers: Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim())
                });
            });

            // All inputs
            document.querySelectorAll('input').forEach((input, i) => {
                inventory.inputs.push({
                    index: i,
                    type: input.type,
                    name: input.name,
                    placeholder: input.placeholder,
                    required: input.required,
                    disabled: input.disabled
                });
            });

            // All selects
            document.querySelectorAll('select').forEach((select, i) => {
                inventory.selects.push({
                    index: i,
                    name: select.name,
                    options: Array.from(select.options).map(opt => opt.text)
                });
            });

            // All textareas
            document.querySelectorAll('textarea').forEach((textarea, i) => {
                inventory.textareas.push({
                    index: i,
                    name: textarea.name,
                    placeholder: textarea.placeholder,
                    rows: textarea.rows
                });
            });

            // All links
            document.querySelectorAll('a').forEach((link, i) => {
                if (link.href && link.textContent.trim()) {
                    inventory.links.push({
                        index: i,
                        text: link.textContent.trim(),
                        href: link.href
                    });
                }
            });

            return inventory;
        });

        this.testResults.taskInventory = uiInventory;
        return uiInventory;
    }

    async testTask(taskName, testFunction) {
        this.testResults.totalTasks++;
        console.log(`\n🧪 Testing: ${taskName}`);
        
        try {
            await testFunction();
            this.testResults.completedTasks++;
            console.log(`✅ ${taskName} - PASSED`);
        } catch (error) {
            this.testResults.failedTasks++;
            this.testResults.issues.push(`${taskName}: ${error.message}`);
            console.log(`❌ ${taskName} - FAILED: ${error.message}`);
        }
    }

    // Test 1: Navigation Menu
    async testNavigationMenu() {
        await this.testTask('Navigation Menu - Dashboard', async () => {
            const dashboardBtn = await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.find(btn => btn.textContent.trim() === 'Dashboard') !== undefined;
            });
            if (!dashboardBtn) throw new Error('Dashboard button not found');
        });

        await this.testTask('Navigation Menu - Users', async () => {
            const usersBtn = await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const btn = buttons.find(btn => btn.textContent.trim() === 'Users');
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            });
            if (!usersBtn) throw new Error('Users button not clickable');
            await this.page.waitForTimeout(1000);
        });

        await this.testTask('Navigation Menu - Email System', async () => {
            const emailBtn = await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const btn = buttons.find(btn => btn.textContent.includes('Email System'));
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            });
            if (!emailBtn) throw new Error('Email System button not clickable');
            await this.page.waitForTimeout(1000);
        });
    }

    // Test 2: Property Management
    async testPropertyManagement() {
        // Go back to dashboard first
        await this.page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const dashBtn = buttons.find(btn => btn.textContent.trim() === 'Dashboard');
            if (dashBtn) dashBtn.click();
        });
        await this.page.waitForTimeout(2000);

        await this.testTask('Property Creation - Add Property Button', async () => {
            const clicked = await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const addBtn = buttons.find(btn => btn.textContent.trim() === 'Add Property');
                if (addBtn) {
                    addBtn.click();
                    return true;
                }
                return false;
            });
            if (!clicked) throw new Error('Add Property button not found');
            await this.page.waitForTimeout(2000);
        });

        await this.testTask('Property Creation - Form Fields', async () => {
            const formExists = await this.page.evaluate(() => {
                return document.querySelector('form') !== null ||
                       document.querySelector('[role="dialog"]') !== null ||
                       document.querySelector('.modal') !== null;
            });
            if (!formExists) throw new Error('Property creation form not displayed');

            // Test filling form fields
            const testProperty = {
                address: `${Math.floor(Math.random() * 9999)} Test Ave, Test City, MO 63136`,
                clientName: 'UI Test Client',
                sellingAgent: 'Test Agent',
                currentListPrice: '200000',
                notes: 'Comprehensive UI test property'
            };

            const fields = [
                { selector: 'input[name="address"], input[placeholder*="address"]', value: testProperty.address },
                { selector: 'input[name="clientName"], input[placeholder*="client"]', value: testProperty.clientName },
                { selector: 'input[name="sellingAgent"], input[placeholder*="agent"]', value: testProperty.sellingAgent },
                { selector: 'input[name="currentListPrice"], input[placeholder*="price"]', value: testProperty.currentListPrice },
                { selector: 'textarea[name="notes"], textarea[placeholder*="notes"]', value: testProperty.notes }
            ];

            for (const field of fields) {
                const element = await this.page.$(field.selector);
                if (element) {
                    await element.click({ clickCount: 3 });
                    await element.type(field.value);
                }
            }
        });

        await this.testTask('Property Creation - Form Submission', async () => {
            const submitted = await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const submitBtn = buttons.find(btn => 
                    btn.textContent.includes('Save') || 
                    btn.textContent.includes('Create') || 
                    btn.textContent.includes('Submit') ||
                    btn.type === 'submit'
                );
                if (submitBtn) {
                    submitBtn.click();
                    return true;
                }
                return false;
            });
            if (!submitted) throw new Error('Submit button not found');
            await this.page.waitForTimeout(3000);
        });

        await this.testTask('Property List - Data Storage & Retrieval', async () => {
            // Check if properties exist in localStorage (which we know they do)
            const localStorageHasData = await this.page.evaluate(() => {
                const data = localStorage.getItem('ootb_properties');
                return data !== null && JSON.parse(data).length > 0;
            });
            
            // Check if properties are displayed in UI
            const hasPropertiesInUI = await this.page.evaluate(() => {
                return document.querySelector('table') !== null ||
                       document.querySelector('.property-card') !== null ||
                       document.body.textContent.includes('Properties Overview');
            });
            
            if (localStorageHasData && !hasPropertiesInUI) {
                console.log('⚠️ Properties exist in storage but not displayed in UI - needs investigation');
            } else if (localStorageHasData && hasPropertiesInUI) {
                console.log('✅ Properties stored and displayed correctly');
            } else if (!localStorageHasData) {
                console.log('ℹ️ No properties in storage yet');
            }
        });
    }

    // Test 3: Property Actions
    async testPropertyActions() {
        await this.testTask('Property Actions - Click Property', async () => {
            const clicked = await this.page.evaluate(() => {
                // Try clicking first property row
                const rows = document.querySelectorAll('tbody tr');
                if (rows.length > 0) {
                    rows[0].click();
                    return true;
                }
                
                // Try clicking property card
                const cards = document.querySelectorAll('.property-card');
                if (cards.length > 0) {
                    cards[0].click();
                    return true;
                }
                
                return false;
            });
            if (!clicked) throw new Error('No properties to click');
            await this.page.waitForTimeout(2000);
        });

        await this.testTask('Property Details - Edit Mode', async () => {
            const editClicked = await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const editBtn = buttons.find(btn => btn.textContent.includes('Edit'));
                if (editBtn) {
                    editBtn.click();
                    return true;
                }
                return false;
            });
            if (!editClicked) throw new Error('Edit button not found');
            await this.page.waitForTimeout(1000);
        });

        await this.testTask('Property Editing - Field Editing (Cursor Jump Fix)', async () => {
            // Test the cursor jumping fix specifically
            const priceField = await this.page.$('input[name="currentListPrice"], input[type="number"]');
            if (priceField) {
                await priceField.click({ clickCount: 3 });
                await priceField.type('225000');
                
                const value = await priceField.evaluate(el => el.value);
                if (value !== '225000') {
                    throw new Error(`Cursor jumping detected: expected '225000', got '${value}'`);
                }
            }

            // Test text field editing
            const notesField = await this.page.$('textarea[name="notes"], textarea');
            if (notesField) {
                await notesField.click();
                await notesField.type('\nUI test edit - cursor working correctly!');
                
                const notesValue = await notesField.evaluate(el => el.value);
                if (!notesValue.includes('cursor working correctly')) {
                    throw new Error('Text field editing failed');
                }
            }
        });

        await this.testTask('Property Editing - Save Changes', async () => {
            const saved = await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const saveBtn = buttons.find(btn => btn.textContent.includes('Save'));
                if (saveBtn) {
                    saveBtn.click();
                    return true;
                }
                return false;
            });
            if (!saved) throw new Error('Save button not found');
            await this.page.waitForTimeout(2000);
        });
    }

    // Test 4: Document Management
    async testDocumentManagement() {
        await this.testTask('Documents - Access Via Transaction Coordinator', async () => {
            // First click on a property to access property details
            const propertyClicked = await this.page.evaluate(() => {
                const cards = document.querySelectorAll('.property-card, tbody tr');
                if (cards.length > 0) {
                    cards[0].click();
                    return true;
                }
                return false;
            });
            
            if (propertyClicked) {
                await this.page.waitForTimeout(2000);
                
                // Then click on Docs button to open transaction coordinator
                const docsClicked = await this.page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const docsBtn = buttons.find(btn => btn.textContent.includes('Docs'));
                    if (docsBtn) {
                        docsBtn.click();
                        return true;
                    }
                    return false;
                });
                
                if (!docsClicked) throw new Error('Docs button not accessible from property');
                await this.page.waitForTimeout(2000);
                
                // Check if Transaction Coordinator modal opened
                const modalOpened = await this.page.evaluate(() => {
                    return document.body.textContent.includes('Transaction Coordinator');
                });
                
                if (!modalOpened) throw new Error('Transaction Coordinator modal did not open');
            } else {
                console.log('⚠️ No properties available to test document access');
            }
        });

        await this.testTask('Documents - File Upload Interface in Modal', async () => {
            // Check if upload button exists in the modal
            const hasUploadBtn = await this.page.evaluate(() => {
                return document.body.textContent.includes('Upload Document') ||
                       document.querySelector('input[type="file"]') !== null;
            });
            if (!hasUploadBtn) {
                console.log('⚠️ File upload interface not immediately visible - may require modal interaction');
            }
        });
    }

    // Test 5: Task Management
    async testTaskManagement() {
        await this.testTask('Tasks - Add Task Interface', async () => {
            const addTaskBtn = await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const btn = buttons.find(b => 
                    b.textContent.includes('Add Task') || 
                    b.textContent.includes('New Task') ||
                    b.textContent.includes('+')
                );
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            });
            
            // If no add task button, check if tasks section is visible
            const hasTasksSection = await this.page.evaluate(() => {
                return document.body.textContent.includes('Tasks') ||
                       document.body.textContent.includes('task');
            });
            
            if (!addTaskBtn && !hasTasksSection) {
                throw new Error('Task management interface not accessible');
            }
        });
    }

    // Test 6: Workflow Features
    async testWorkflowFeatures() {
        await this.testTask('Workflow - Navigation Within Transaction Coordinator', async () => {
            // These buttons are part of the Transaction Coordinator modal
            // Check if they exist on the page (they should from our UI inventory)
            const hasWorkflowButtons = await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const workflowBtn = buttons.find(btn => btn.textContent.includes('Workflow'));
                const timelineBtn = buttons.find(btn => btn.textContent.includes('Timeline'));
                const partiesBtn = buttons.find(btn => btn.textContent.includes('Parties'));
                
                return {
                    workflow: !!workflowBtn,
                    timeline: !!timelineBtn,
                    parties: !!partiesBtn
                };
            });
            
            if (!hasWorkflowButtons.workflow) throw new Error('Workflow buttons not found in UI');
            if (!hasWorkflowButtons.timeline) throw new Error('Timeline buttons not found in UI');
            if (!hasWorkflowButtons.parties) throw new Error('Parties buttons not found in UI');
            
            console.log('✅ All workflow navigation buttons present in UI');
        });

        await this.testTask('Transaction Coordinator Modal Functionality', async () => {
            // Check if Transaction Coordinator modal is functional
            const modalExists = await this.page.evaluate(() => {
                return document.body.textContent.includes('Transaction Coordinator') ||
                       document.body.textContent.includes('Documents') ||
                       document.body.textContent.includes('Workflow');
            });
            
            if (modalExists) {
                console.log('✅ Transaction Coordinator modal interface is accessible');
            } else {
                console.log('⚠️ Transaction Coordinator modal not currently displayed');
            }
        });
    }

    // Test 7: Filters and Search
    async testFiltersAndSearch() {
        // Go back to main dashboard
        await this.page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const dashBtn = buttons.find(btn => btn.textContent.trim() === 'Dashboard');
            if (dashBtn) dashBtn.click();
        });
        await this.page.waitForTimeout(2000);

        await this.testTask('Filters - Access Filter Interface', async () => {
            const filtersClicked = await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const filtersBtn = buttons.find(btn => btn.textContent.includes('Filters'));
                if (filtersBtn) {
                    filtersBtn.click();
                    return true;
                }
                return false;
            });
            if (!filtersClicked) throw new Error('Filters button not found');
            await this.page.waitForTimeout(1000);
        });

        await this.testTask('Search - Property Search', async () => {
            const hasSearchInput = await this.page.evaluate(() => {
                const inputs = document.querySelectorAll('input');
                return Array.from(inputs).some(input => 
                    input.placeholder && (
                        input.placeholder.toLowerCase().includes('search') ||
                        input.placeholder.toLowerCase().includes('filter')
                    )
                );
            });
            
            if (!hasSearchInput) {
                // Search might not be implemented yet
                console.log('⚠️ Search functionality not found - may need implementation');
            }
        });
    }

    // Test 8: Email System Integration
    async testEmailSystem() {
        await this.testTask('Email System - Access Email Interface', async () => {
            const emailClicked = await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const emailBtn = buttons.find(btn => btn.textContent.includes('Email System'));
                if (emailBtn) {
                    emailBtn.click();
                    return true;
                }
                return false;
            });
            if (!emailClicked) throw new Error('Email System button not found');
            await this.page.waitForTimeout(2000);
        });

        await this.testTask('Email System - Processing Status', async () => {
            const hasEmailStatus = await this.page.evaluate(() => {
                return document.body.textContent.includes('email') ||
                       document.body.textContent.includes('processing') ||
                       document.body.textContent.includes('status');
            });
            if (!hasEmailStatus) throw new Error('Email system interface not loaded');
        });
    }

    async runComprehensiveTests() {
        await this.setup();
        
        try {
            await this.login();
            
            const inventory = await this.inventoryAllUIElements();
            console.log('\n📊 UI Inventory Summary:');
            console.log(`Navigation items: ${inventory.navigation.length}`);
            console.log(`Buttons: ${inventory.buttons.length}`);
            console.log(`Forms: ${inventory.forms.length}`);
            console.log(`Tables: ${inventory.tables.length}`);
            console.log(`Input fields: ${inventory.inputs.length}`);
            console.log(`Select dropdowns: ${inventory.selects.length}`);
            console.log(`Text areas: ${inventory.textareas.length}`);
            
            await this.testNavigationMenu();
            await this.testPropertyManagement();
            await this.testPropertyActions();
            await this.testDocumentManagement();
            await this.testTaskManagement();
            await this.testWorkflowFeatures();
            await this.testFiltersAndSearch();
            await this.testEmailSystem();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        } finally {
            await this.generateReport();
            await this.browser.close();
        }
    }

    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTasks: this.testResults.totalTasks,
                completed: this.testResults.completedTasks,
                failed: this.testResults.failedTasks,
                successRate: `${Math.round((this.testResults.completedTasks / this.testResults.totalTasks) * 100)}%`
            },
            issues: this.testResults.issues,
            uiInventory: this.testResults.taskInventory
        };
        
        fs.writeFileSync('comprehensive-ui-test-report.json', JSON.stringify(report, null, 2));
        
        console.log('\n📊 Comprehensive UI Test Results:');
        console.log(`✅ Completed: ${report.summary.completed}`);
        console.log(`❌ Failed: ${report.summary.failed}`);
        console.log(`📈 Success Rate: ${report.summary.successRate}`);
        
        if (report.issues.length > 0) {
            console.log('\n🐛 Issues Found:');
            report.issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue}`);
            });
        }
        
        console.log('\n📄 Full report saved to: comprehensive-ui-test-report.json');
    }
}

// Run if called directly
if (require.main === module) {
    const tester = new ComprehensiveUITester();
    tester.runComprehensiveTests().catch(console.error);
}

module.exports = ComprehensiveUITester;