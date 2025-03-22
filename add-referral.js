document.addEventListener('DOMContentLoaded', () => {
    const extractButton = document.getElementById('extractButton');
    const messageContainer = document.getElementById('messageContainer');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const referrerEmailInput = document.getElementById('referrerEmail');
    const successModal = document.getElementById('successModal');
    const modalClose = document.getElementById('modalClose');
    const modalSendInvite = document.getElementById('modalSendInvite');
    const referralForm = document.getElementById('referralForm');
    const addReferralAndInvite = document.getElementById('addReferralAndInvite');

    // Get user email from storage and set it in the referrer email field
    chrome.storage.local.get(['userEmail', 'userData'], (result) => {
        const email = result.userEmail || (result.userData && result.userData.email);
        if (email) {
            referrerEmailInput.value = email;
            console.log('Set referrer email:', email);
        } else {
            console.log('No user email found in storage');
        }
    });

    function showMessage(message, isError = false) {
        messageContainer.style.display = 'block';
        if (isError) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
            successMessage.style.display = 'none';
        } else {
            successMessage.textContent = message;
            successMessage.style.display = 'block';
            errorMessage.style.display = 'none';
        }
        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, 3000);
    }

    function showSuccessModal() {
        successModal.style.display = 'block';
    }

    function hideSuccessModal() {
        successModal.style.display = 'none';
    }

    function getFormData() {
        return {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            jobTitle: document.getElementById('jobTitle').value,
            companyName: document.getElementById('companyName').value,
            mobileNumber: document.getElementById('mobileNumber').value,
            personalEmail: document.getElementById('personalEmail').value,
            businessEmail: document.getElementById('businessEmail').value,
            location: document.getElementById('location').value,
            linkedinProfile: document.getElementById('linkedinProfile').value,
            referrerEmail: document.getElementById('referrerEmail').value,
            notes: document.getElementById('notes').value
        };
    }

    function saveFormData(data) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ referralData: data }, () => {
                console.log('Form data saved:', data);
                resolve();
            });
        });
    }

    // Handle modal close button
    modalClose.addEventListener('click', () => {
        hideSuccessModal();
    });

    // Handle modal send invite button
    modalSendInvite.addEventListener('click', () => {
        hideSuccessModal();
        window.location.href = 'send-invitation.html';
    });

    // Handle Add Referral & Send Invitation button
    addReferralAndInvite.addEventListener('click', async (e) => {
        e.preventDefault();
        
        try {
            const formData = getFormData();
            await saveFormData(formData);
            console.log('Redirecting to send invitation page...');
            window.location.href = 'send-invitation.html';
        } catch (error) {
            console.error('Error:', error);
            showMessage('Failed to save referral data', true);
        }
    });

    // Handle form submission (for Add Referral button)
    referralForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // If this was triggered by Add Referral & Send Invitation, ignore it
        if (e.submitter === addReferralAndInvite) {
            return;
        }

        try {
            const formData = getFormData();
            await saveFormData(formData);
            showSuccessModal();
        } catch (error) {
            console.error('Error submitting form:', error);
            showMessage(error.message || 'Failed to add referral', true);
        }
    });

    // Handle extract button click
    extractButton.addEventListener('click', async () => {
        try {
            console.log('Extract button clicked');
            
            // Show loading state
            extractButton.disabled = true;
            extractButton.querySelector('.button-text').style.display = 'none';
            extractButton.querySelector('.loader').style.display = 'flex';

            // Get the current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('Current tab:', tab);
            
            if (!tab) {
                throw new Error('No active tab found');
            }

            if (!tab.url.includes('linkedin.com/in/')) {
                throw new Error('Please navigate to a LinkedIn profile page');
            }

            try {
                // Inject content script
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content-script.js']
                });
                console.log('Content script injected');
                
                // Wait a bit for the script to initialize
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
                console.log('Content script already injected or injection failed:', err);
            }

            // Get profile data from the content script
            const response = await chrome.tabs.sendMessage(tab.id, { 
                action: "getProfileData" 
            });
            
            console.log('Response received:', response);

            if (response && response.success) {
                const profileData = response.data;
                console.log('Profile data:', profileData);
                
                // Get all form inputs with correct IDs
                const inputs = {
                    firstName: document.getElementById('firstName'),
                    lastName: document.getElementById('lastName'),
                    jobTitle: document.getElementById('jobTitle'),
                    companyName: document.getElementById('companyName'),
                    mobileNumber: document.getElementById('mobileNumber'),
                    personalEmail: document.getElementById('personalEmail'),
                    businessEmail: document.getElementById('businessEmail'),
                    location: document.getElementById('location'),
                    linkedinProfile: document.getElementById('linkedinProfile')
                };

                // Fill form fields
                Object.entries(profileData).forEach(([key, value]) => {
                    const input = inputs[key];
                    if (input && value) {
                        input.value = value;
                        console.log(`Filled ${key} with:`, value);
                    }
                });

                showMessage('Profile data extracted successfully!');
            } else {
                throw new Error(response?.error || 'Failed to extract profile data');
            }
        } catch (error) {
            console.error('Error extracting data:', error);
            showMessage(error.message || 'Failed to extract data. Please make sure you are on a LinkedIn profile page.', true);
        } finally {
            // Reset button state
            extractButton.disabled = false;
            extractButton.querySelector('.button-text').style.display = 'inline';
            extractButton.querySelector('.loader').style.display = 'none';
        }
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === successModal) {
            hideSuccessModal();
        }
    });
});