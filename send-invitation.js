document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication first
    const { authToken, userData } = await chrome.storage.local.get(['authToken', 'userData']);
    
    if (!authToken || !userData) {
        console.log('Not authenticated, redirecting to login');
        window.location.href = 'popup.html';
        return;
    }

    // Get DOM elements
    const emailTemplate = document.getElementById('emailTemplate');
    const customLetterBtn = document.getElementById('customLetterBtn');
    const emailSubject = document.getElementById('emailSubject');
    const emailBody = document.getElementById('emailBody');
    const sendButton = document.getElementById('sendButton');
    const backButton = document.getElementById('backButton');
    const logoutButton = document.getElementById('logoutButton');
    const userImage = document.getElementById('userImage');
    const userName = document.getElementById('userName');
    const messageContainer = document.getElementById('messageContainer');
    const invitationsList = document.createElement('div');
    invitationsList.id = 'invitationsList';
    document.body.appendChild(invitationsList);
    const successPopup = document.getElementById('successPopup');
    const overlay = document.getElementById('overlay');
    const closePopupBtn = document.getElementById('closePopup');

    // Set user info in header
    if (userData.profileImage) {
        userImage.src = userData.profileImage;
    }
    userName.textContent = userData.name || userData.email;

    function showSuccessPopup() {
        overlay.style.display = 'block';
        successPopup.style.display = 'block';
    }

    function hideSuccessPopup() {
        overlay.style.display = 'none';
        successPopup.style.display = 'none';
        // Redirect to add-referral page after closing popup
        window.location.href = 'add-referral.html';
    }

    // Load referral data from storage
    chrome.storage.local.get(['referralData'], (result) => {
        const referralData = result.referralData || {};
        console.log('Loaded referral data:', referralData);
        
        if (Object.keys(referralData).length === 0) {
            console.log('No referral data found, redirecting back');
            window.location.href = 'add-referral.html';
            return;
        }

        updateEmailTemplate(referralData, userData);
    });

    function updateEmailTemplate(referralData, userData) {
        const templates = {
            template1: {
                subject: `${userData.name || 'Someone'} invited you to join Jobaar`,
                body: `Dear ${referralData.firstName || ''},

I hope this email finds you well. I'd like to invite you to join Jobaar, a global talent marketplace that provides recruitment-as-a-service powered by artificial intelligence technology.

I've referred you for the ${referralData.jobTitle || 'position'} role at ${referralData.companyName || 'our company'}. With your experience and skills, I believe you would be a great fit for this opportunity.

Best regards,
${userData.name || ''}`
            },
            template2: {
                subject: `Quick intro: Join me on Jobaar!`,
                body: `Hi ${referralData.firstName || ''},

I wanted to reach out and connect you with Jobaar, an innovative recruitment platform I'm using. Given your background in ${referralData.jobTitle || 'your field'}, I think you'd find some great opportunities here.

I've already put in a good word for you at ${referralData.companyName || 'a great company'}. Would love to help you explore this further!

Cheers,
${userData.name || ''}`
            },
            template3: {
                subject: `Professional Referral: ${referralData.companyName || 'Company'} Opportunity`,
                body: `Dear ${referralData.firstName || ''},

I trust this email finds you well. I'm reaching out regarding an exciting opportunity at ${referralData.companyName || 'our company'} for the role of ${referralData.jobTitle || 'a position'} that I believe would be perfect for someone with your expertise.

I've taken the liberty of referring you through Jobaar, our talent acquisition platform. Your professional background and achievements make you an ideal candidate for this position.

Would you be interested in learning more about this opportunity?

Best regards,
${userData.name || ''}`
            }
        };

        // Set initial template
        const template = templates[emailTemplate.value] || templates.template1;
        emailSubject.textContent = template.subject;
        emailBody.textContent = template.body;
    }

    // Handle template change
    emailTemplate.addEventListener('change', () => {
        chrome.storage.local.get(['referralData'], (result) => {
            updateEmailTemplate(result.referralData || {}, userData);
        });
    });

    // Handle custom letter button
    customLetterBtn.addEventListener('click', () => {
        emailBody.contentEditable = true;
        emailBody.focus();
    });

    // Handle send button
    sendButton.addEventListener('click', async () => {
        try {
            sendButton.disabled = true;
            
            // Get the current referral data
            const { referralData } = await chrome.storage.local.get(['referralData']);
            
            // Here you would normally send the invitation email
            // For now, we'll just simulate it
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Save the invitation to storage
            const invitation = {
                recipientEmail: referralData.personalEmail || referralData.businessEmail,
                recipientName: `${referralData.firstName} ${referralData.lastName}`,
                subject: emailSubject.textContent,
                body: emailBody.textContent,
                sentAt: new Date().toISOString(),
                status: 'SENT'
            };

            chrome.storage.local.get(['db'], ({ db = { invitations: [] } }) => {
                db.invitations = [invitation, ...db.invitations];
                chrome.storage.local.set({ db }, () => {
                    showSuccessPopup();
                });
            });
        } catch (error) {
            alert('Failed to send invitation: ' + error.message);
        } finally {
            sendButton.disabled = false;
        }
    });

    // Handle close popup button
    closePopupBtn.addEventListener('click', hideSuccessPopup);

    // Handle back button
    backButton.addEventListener('click', () => {
        window.location.href = 'add-referral.html';
    });

    // Handle logout button
    logoutButton.addEventListener('click', () => {
        // Clear all user data from storage
        chrome.storage.local.remove([
            'authToken',
            'userData',
            'lastReferral',
            'rememberedEmail',
            'rememberMe'
        ], () => {
            // After data is cleared, redirect to login page
            window.location.replace('popup.html');
        });
    });

    // Close popup when clicking overlay
    overlay.addEventListener('click', hideSuccessPopup);

    // Load and display sent invitations
    function loadSentInvitations() {
        chrome.storage.local.get('db', ({ db }) => {
            if (db && db.invitations && db.invitations.length > 0) {
                const invitationsHtml = `
                    <div class="invitations-section">
                        <h3>Sent Invitations</h3>
                        <div class="invitations-list">
                            ${db.invitations.map(inv => `
                                <div class="invitation-item">
                                    <div class="invitation-details">
                                        <strong>To:</strong> ${inv.recipientEmail}<br>
                                        <strong>Sent:</strong> ${new Date(inv.sentAt).toLocaleString()}<br>
                                        <strong>Status:</strong> <span class="status-${inv.status.toLowerCase()}">${inv.status}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                invitationsList.innerHTML = invitationsHtml;

                // Add styles for invitations list
                const style = document.createElement('style');
                style.textContent = `
                    .invitations-section {
                        margin-top: 20px;
                        padding: 15px;
                        background: #f8f9fa;
                        border-radius: 8px;
                    }
                    .invitations-section h3 {
                        color: #0a66c2;
                        margin-bottom: 10px;
                    }
                    .invitations-list {
                        max-height: 200px;
                        overflow-y: auto;
                    }
                    .invitation-item {
                        background: white;
                        padding: 10px;
                        margin-bottom: 8px;
                        border-radius: 4px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    .status-sent {
                        color: #2e7d32;
                        background: #e8f5e9;
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-size: 12px;
                    }
                `;
                document.head.appendChild(style);
            }
        });
    }

    // Load initial invitations
    loadSentInvitations();

    function showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 20px;
            border-radius: 4px;
            background-color: ${type === 'error' ? '#f44336' : '#4caf50'};
            color: white;
            z-index: 1000;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    function showSuccessMessage() {
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.innerHTML = `
            <div class="success-content">
                <img src="icons/icon48.png" alt="Success" style="width: 48px; height: 48px; margin-bottom: 15px;">
                <h3>Invitation Sent Successfully!</h3>
                <p>Your invitation has been sent to the candidate.</p>
            </div>
            <button class="close-button">&times;</button>
        `;
        document.body.appendChild(successMessage);

        // Add styles for success message
        const style = document.createElement('style');
        style.textContent = `
            .success-message {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            .success-content {
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                text-align: center;
                min-width: 300px;
                position: relative;
            }
            .success-content h3 {
                margin: 0 0 10px 0;
                color: #2e7d32;
                font-size: 18px;
            }
            .success-content p {
                margin: 0;
                color: #666;
                font-size: 14px;
            }
            .close-button {
                position: absolute;
                top: 10px;
                right: 10px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            }
            .close-button:hover {
                background: #f5f5f5;
                color: #333;
            }
        `;
        document.head.appendChild(style);

        // Add click event to close button
        const closeButton = successMessage.querySelector('.close-button');
        closeButton.addEventListener('click', () => {
            successMessage.remove();
        });

        // Add click event to close when clicking outside
        successMessage.addEventListener('click', (e) => {
            if (e.target === successMessage) {
                successMessage.remove();
            }
        });

        // Auto close after 3 seconds
        setTimeout(() => {
            successMessage.remove();
        }, 3000);
    }
}); 