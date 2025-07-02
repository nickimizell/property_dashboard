// Popup JavaScript for extension settings and controls
document.addEventListener('DOMContentLoaded', function() {
    const statusElement = document.getElementById('status');
    const statusText = document.getElementById('status-text');
    const openZipFormsBtn = document.getElementById('open-zipforms');
    const syncDataBtn = document.getElementById('sync-data');
    const testConnectionBtn = document.getElementById('test-connection');
    const autofillToggle = document.getElementById('autofill-toggle');
    const autocaptureToggle = document.getElementById('autocapture-toggle');
    const dashboardUrlInput = document.getElementById('dashboard-url');

    // Load saved settings
    chrome.storage.local.get([
        'dashboard_url',
        'auto_fill_enabled',
        'auto_capture_enabled'
    ], (result) => {
        if (result.dashboard_url) {
            dashboardUrlInput.value = result.dashboard_url;
        }
        if (result.auto_fill_enabled !== undefined) {
            autofillToggle.classList.toggle('active', result.auto_fill_enabled);
        }
        if (result.auto_capture_enabled !== undefined) {
            autocaptureToggle.classList.toggle('active', result.auto_capture_enabled);
        }
    });

    // Check connection status
    checkConnectionStatus();

    // Event listeners
    openZipFormsBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://www.zipformplus.com' });
        window.close();
    });

    syncDataBtn.addEventListener('click', () => {
        syncWithDashboard();
    });

    testConnectionBtn.addEventListener('click', () => {
        checkConnectionStatus();
    });

    autofillToggle.addEventListener('click', () => {
        const isActive = autofillToggle.classList.contains('active');
        autofillToggle.classList.toggle('active', !isActive);
        chrome.storage.local.set({ auto_fill_enabled: !isActive });
    });

    autocaptureToggle.addEventListener('click', () => {
        const isActive = autocaptureToggle.classList.contains('active');
        autocaptureToggle.classList.toggle('active', !isActive);
        chrome.storage.local.set({ auto_capture_enabled: !isActive });
    });

    dashboardUrlInput.addEventListener('change', () => {
        chrome.storage.local.set({ dashboard_url: dashboardUrlInput.value });
    });

    async function checkConnectionStatus() {
        statusText.textContent = 'Checking connection...';
        statusElement.className = 'status disconnected';
        
        try {
            const dashboardUrl = dashboardUrlInput.value || 'http://localhost:3000';
            const response = await fetch(`${dashboardUrl}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                statusText.textContent = 'Connected to dashboard';
                statusElement.className = 'status connected';
            } else {
                throw new Error('Dashboard not responding');
            }
        } catch (error) {
            statusText.textContent = 'Dashboard disconnected';
            statusElement.className = 'status disconnected';
        }
    }

    async function syncWithDashboard() {
        syncDataBtn.textContent = 'Syncing...';
        syncDataBtn.disabled = true;

        try {
            // Get any stored completed forms
            const result = await chrome.storage.local.get();
            const completedForms = Object.keys(result)
                .filter(key => key.startsWith('completed_form_'))
                .map(key => result[key]);

            if (completedForms.length > 0) {
                const dashboardUrl = dashboardUrlInput.value || 'http://localhost:3000';
                
                for (const form of completedForms) {
                    await fetch(`${dashboardUrl}/api/transaction/zipforms-webhook`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'form_completed',
                            data: form,
                            source: 'manual_sync'
                        })
                    });
                }

                // Clear synced forms
                const keysToRemove = Object.keys(result).filter(key => 
                    key.startsWith('completed_form_')
                );
                chrome.storage.local.remove(keysToRemove);

                alert(`Synced ${completedForms.length} forms to dashboard`);
            } else {
                alert('No forms to sync');
            }
        } catch (error) {
            alert('Sync failed: ' + error.message);
        } finally {
            syncDataBtn.textContent = 'Sync Data';
            syncDataBtn.disabled = false;
        }
    }
});