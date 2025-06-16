/**
 * Onboarding Script for ReplyGuy.AI Extension
 * Handles first-time setup experience with API key configuration
 */

let currentStep = 1;
const totalSteps = 3;

/**
 * Initialize onboarding experience
 */
document.addEventListener('DOMContentLoaded', () => {
    updateProgress();
    setupEventListeners();
});

/**
 * Setup event listeners for the onboarding flow
 */
function setupEventListeners() {
    // Next button navigation
    const nextButton = document.getElementById('nextButton');
    if (nextButton) {
        nextButton.addEventListener('click', nextStep);
    }
    
    // Close button
    const closeButton = document.getElementById('closeButton');
    if (closeButton) {
        closeButton.addEventListener('click', () => window.close());
    }
    
    // API key input validation
    const apiKeyInput = document.getElementById('apiKey');
    if (apiKeyInput) {
        apiKeyInput.addEventListener('input', validateApiKey);
        apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && currentStep === 2) {
                nextStep();
            }
        });
    }
}

/**
 * Navigate to next step with animation
 */
function nextStep() {
    if (currentStep === 2) {
        // Validate API key before proceeding
        if (!validateAndSaveApiKey()) {
            return;
        }
    }

    if (currentStep < totalSteps) {
        const currentStepEl = document.getElementById(`step${currentStep}`);
        const nextStepEl = document.getElementById(`step${currentStep + 1}`);
        
        // Animate out current step
        currentStepEl.classList.add('slide-out');
        
        setTimeout(() => {
            currentStepEl.classList.remove('active', 'slide-out');
            currentStep++;
            
            // Animate in next step
            nextStepEl.classList.add('active', 'slide-in');
            setTimeout(() => {
                nextStepEl.classList.remove('slide-in');
            }, 300);
            
            updateProgress();
            updateButtons();
        }, 300);
    }
}

/**
 * Update progress bar and step indicator
 */
function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const stepCounter = document.getElementById('stepCounter');
    
    const progressPercentage = (currentStep / totalSteps) * 100;
    
    if (progressFill) {
        progressFill.style.width = `${progressPercentage}%`;
    }
    
    if (stepCounter) {
        stepCounter.textContent = `Step ${currentStep} of ${totalSteps}`;
    }
}

/**
 * Update button text and visibility based on current step
 */
function updateButtons() {
    const nextButton = document.getElementById('nextButton');
    
    if (nextButton) {
        if (currentStep === totalSteps) {
            nextButton.style.display = 'none';
        } else if (currentStep === 2) {
            nextButton.textContent = 'Save & Continue';
        } else {
            nextButton.textContent = 'Next';
        }
    }
}

/**
 * Validate API key format
 */
function validateApiKey() {
    const apiKeyInput = document.getElementById('apiKey');
    const nextButton = document.getElementById('nextButton');
    
    if (!apiKeyInput || !nextButton) return false;
    
    const apiKey = apiKeyInput.value.trim();
    const isValid = apiKey.length > 20 && apiKey.startsWith('sk-');
    
    if (currentStep === 2) {
        nextButton.disabled = !isValid;
        
        // Update input styling
        if (apiKey.length > 0) {
            if (isValid) {
                apiKeyInput.style.borderColor = '#28a745';
            } else {
                apiKeyInput.style.borderColor = '#dc3545';
            }
        } else {
            apiKeyInput.style.borderColor = '#e0e0e0';
        }
    }
    
    return isValid;
}

/**
 * Validate and save API key to extension storage
 */
async function validateAndSaveApiKey() {
    const apiKeyInput = document.getElementById('apiKey');
    const nextButton = document.getElementById('nextButton');
    
    if (!apiKeyInput) return false;
    
    const apiKey = apiKeyInput.value.trim();
    
    if (!validateApiKey()) {
        showStatus('Please enter a valid OpenAI API key (starts with "sk-")', 'error');
        return false;
    }
    
    // Show loading animation
    showApiKeyLoading(true);
    
    try {
        // Test the API key with OpenAI
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            showApiKeyLoading(false);
            showStatus('API key is invalid or has no access. Please check your key and try again.', 'error');
            return false;
        }
        
        // Save API key to extension storage if validation passes
        await new Promise((resolve, reject) => {
            chrome.storage.sync.set({
                'replyGuyAI_settings': {
                    openaiApiKey: apiKey,
                    saveHistory: true,
                    darkMode: false,
                    autoDetectContext: true,
                    defaultCustomization: {
                        length: 'medium',
                        mood: 'supportive',
                        tone: 'neutral'
                    }
                }
            }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
        
        showApiKeyLoading(false);
        showStatus('API key validated and saved successfully!', 'success');
        
        // Mark onboarding as complete
        chrome.storage.sync.set({
            'replyGuyAI_onboardingComplete': true
        });
        
        return true;
        
    } catch (error) {
        showApiKeyLoading(false);
        showStatus('Failed to validate API key. Please check your internet connection and try again.', 'error');
        return false;
    }
}

/**
 * Show/hide loading animation for API key validation
 */
function showApiKeyLoading(loading) {
    const nextButton = document.getElementById('nextButton');
    const statusEl = document.querySelector('.status');
    
    if (loading) {
        nextButton.disabled = true;
        nextButton.innerHTML = '<div style="display: inline-block; width: 16px; height: 16px; border: 2px solid #f3f3f3; border-top: 2px solid #0079d3; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 8px;"></div>Validating API Key...';
        if (statusEl) {
            statusEl.textContent = 'Testing your API key with OpenAI...';
            statusEl.className = 'status info';
            statusEl.style.display = 'block';
        }
    } else {
        nextButton.disabled = false;
        nextButton.innerHTML = 'Next';
    }
}

/**
 * Show status message with animation
 */
function showStatus(message, type) {
    const statusMessage = document.getElementById('apiStatus');
    
    if (!statusMessage) return;
    
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 3000);
    }
}

/**
 * Test API key connection (optional enhancement)
 */
async function testApiKey() {
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!apiKey) {
        showStatus('Please enter an API key first', 'error');
        return;
    }
    
    showStatus('Testing API key...', 'info');
    
    try {
        // Send test request to background script
        const response = await chrome.runtime.sendMessage({
            type: 'TEST_API_KEY',
            apiKey: apiKey
        });
        
        if (response && response.success) {
            showStatus('API key is valid and working!', 'success');
        } else {
            showStatus('API key test failed. Please check your key.', 'error');
        }
    } catch (error) {
        showStatus('Could not test API key. Key will be saved for later validation.', 'error');
    }
}

/**
 * Handle keyboard navigation
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && currentStep < totalSteps) {
        nextStep();
    }
    
    if (e.key === 'Escape') {
        window.close();
    }
});

// Initialize buttons
document.addEventListener('DOMContentLoaded', () => {
    updateButtons();
});