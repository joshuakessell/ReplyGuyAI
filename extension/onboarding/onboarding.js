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
function validateAndSaveApiKey() {
    const apiKeyInput = document.getElementById('apiKey');
    const statusMessage = document.getElementById('apiStatus');
    
    if (!apiKeyInput || !statusMessage) return false;
    
    const apiKey = apiKeyInput.value.trim();
    
    if (!validateApiKey()) {
        showStatus('Please enter a valid OpenAI API key (starts with "sk-")', 'error');
        return false;
    }
    
    // Save API key to extension storage
    try {
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
                showStatus('Failed to save API key. Please try again.', 'error');
                return false;
            } else {
                showStatus('API key saved successfully!', 'success');
                
                // Mark onboarding as complete
                chrome.storage.sync.set({
                    'replyGuyAI_onboardingComplete': true
                });
                
                return true;
            }
        });
        
        return true;
    } catch (error) {
        showStatus('Failed to save API key. Please try again.', 'error');
        return false;
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