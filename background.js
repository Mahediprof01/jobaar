// Mock data for testing
const mockUsers = [
    {
        id: '1',
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        company: 'Test Company',
        role: 'user',
        lastLogin: null
    }
];

const mockReferrals = [];
const mockCompanies = [
    {
        id: '1',
        name: 'Test Company',
        description: 'A test company'
    }
];

// Handle login
async function handleLogin(credentials) {
    const { email, password, remember } = credentials;
    console.log('Login attempt:', { email, remember });
    
    try {
        // Find user in mock data
        const user = mockUsers.find(u => u.email === email && u.password === password);
        
        if (user) {
            // Update last login
            user.lastLogin = new Date().toISOString();

            const token = generateToken(user);
            const userData = {
                id: user.id,
                email: user.email,
                name: user.name,
                company: user.company,
                role: user.role,
                loginTime: user.lastLogin
            };
            
            await chrome.storage.local.set({
                authToken: token,
                userData: userData,
                rememberMe: remember
            });
            
            console.log('Login successful:', userData);
            return { success: true, userData, authToken: token };
        }
        
        console.log('Login failed: Invalid credentials');
        return { success: false, error: "Invalid email or password" };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: "Login failed" };
    }
}

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);
    
    if (request.action === "login") {
        handleLogin(request.credentials)
            .then(sendResponse)
            .catch(error => {
                console.error('Login handler error:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }
    
    if (request.action === "openAddReferral") {
        // Check if user is logged in
        chrome.storage.local.get(['authToken'], (result) => {
            if (!result.authToken) {
                // If not logged in, open popup for login
                chrome.windows.create({
                    url: 'popup.html',
                    type: 'popup',
                    width: 400,
                    height: 600
                });
            } else {
                // If logged in, open add-referral page
                chrome.tabs.create({
                    url: chrome.runtime.getURL('add-referral.html')
                });
            }
        });
        return true;
    }
    
    if (request.action === "createReferral") {
        handleReferralCreation(request.profileData, sendResponse);
        return true;
    }
    
    if (request.action === "addNewReferral") {
        handleAddReferral(request.referralData, sendResponse);
        return true;
    }
    
    if (request.action === "getReferrals") {
        const { userData } = chrome.storage.local.get('userData');
        if (!userData) {
            sendResponse({ success: false, error: "User not authenticated" });
            return;
        }
        
        const referrals = mockReferrals.filter(r => r.referrerId === userData.id);
        sendResponse({ success: true, referrals });
        return true;
    }
    
    if (request.action === "getCompanyData") {
        handleGetCompanyData(request, sendResponse);
        return true;
    }

    if (request.action === 'sendInvitation') {
        handleSendInvitation(request.invitationData)
            .then(sendResponse)
            .catch(error => {
                console.error('Invitation handler error:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }

    if (request.action === 'logout') {
        handleLogout()
            .then(sendResponse)
            .catch(error => {
                console.error('Logout handler error:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }
});

// Handle logout
async function handleLogout() {
    try {
        // Clear all user-related data from storage
        await chrome.storage.local.remove([
            'authToken',
            'userData',
            'lastReferral',
            'rememberedEmail',
            'rememberMe'
        ]);
        
        // Clear any temporary data
        await chrome.storage.local.remove([
            'tempReferralData',
            'tempInvitationData'
        ]);
        
        console.log('Logout successful: All user data cleared');
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error: "Logout failed" };
    }
}

// Handle new referral
async function handleNewReferral(referralData) {
    console.log('New referral submission:', referralData);
    
    try {
        const { userData } = await chrome.storage.local.get('userData');
        if (!userData) {
            console.error('Referral failed: User not authenticated');
            return { success: false, error: "User not authenticated" };
        }

        const newReferral = {
            id: generateId(),
            ...referralData,
            referrerId: userData.id,
            companyId: "1",
            status: "PENDING",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        mockReferrals.push(newReferral);
        
        console.log('Referral created:', newReferral);
        return { success: true, referralId: newReferral.id, referral: newReferral };
    } catch (error) {
        console.error('Referral creation error:', error);
        return { success: false, error: "Failed to create referral" };
    }
}

function handleReferralCreation(profileData, sendResponse) {
    chrome.storage.local.get(['userData'], (result) => {
        if (!result.userData) {
            sendResponse?.({ success: false, error: "Please login first" });
            return;
        }

        // Create new referral
        const newReferral = {
            id: generateId(),
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            jobTitle: profileData.currentPosition || profileData.headline,
            companyName: profileData.currentCompany,
            location: profileData.location,
            linkedinUrl: profileData.profileUrl,
            personalEmail: profileData.email,
            referrerEmail: result.userData.email,
            notes: profileData.about || '',
            status: "Pending",
            date: new Date().toISOString().split('T')[0],
            referrerId: result.userData.id,
            companyId: "1"
        };

        // Add to mock data
        mockReferrals.unshift(newReferral);

        // Update user's referral count
        const user = mockUsers.find(u => u.email === result.userData.email);
        if (user) {
            user.referrals = (user.referrals || 0) + 1;
            chrome.storage.local.set({ userData: user });
        }

        sendResponse?.({ success: true, referral: newReferral });
    });
}

function handleGetCompanyData(request, sendResponse) {
    const user = mockUsers.find(u => u.email === request.userEmail);
    if (user) {
        const company = mockCompanies.find(c => c.name === user.company);
        sendResponse({ success: true, company });
    } else {
        sendResponse({ success: false, error: "Company not found" });
    }
}

// Handle sending invitation
async function handleSendInvitation(invitationData) {
    console.log('Sending invitation:', invitationData);
    
    try {
        const { userData } = await chrome.storage.local.get('userData');
        if (!userData) {
            console.error('Invitation failed: User not authenticated');
            return { success: false, error: "User not authenticated" };
        }

        // Create invitation object
        const invitation = {
            id: generateId(),
            senderId: userData.id,
            recipientEmail: invitationData.recipientEmail,
            subject: invitationData.subject,
            message: invitationData.message,
            senderName: invitationData.senderName,
            senderEmail: invitationData.senderEmail,
            status: "SENT",
            sentAt: new Date().toISOString()
        };
        
        // Get existing invitations from storage
        const { invitations = { invitations: [] } } = await chrome.storage.local.get('invitations');
        
        // If invitations doesn't exist in storage, create new array
        if (!invitations.invitations) {
            invitations.invitations = [];
        }
        
        // Add new invitation
        invitations.invitations.push(invitation);
        
        // Save to storage
        await chrome.storage.local.set({ invitations });
        
        console.log('Invitation sent:', invitation);
        
        return { 
            success: true, 
            message: "Invitation sent successfully",
            invitationId: invitation.id,
            invitation: invitation
        };
    } catch (error) {
        console.error('Error sending invitation:', error);
        return { success: false, error: "Failed to send invitation" };
    }
}

// Handle adding new referral
async function handleAddReferral(referralData, sendResponse) {
    try {
        // Get auth token
        const { authToken } = await chrome.storage.local.get(['authToken']);
        
        if (!authToken) {
            sendResponse({ success: false, error: 'Not authenticated' });
            return;
        }

        // Create new referral
        const newReferral = {
            id: generateId(),
            ...referralData,
            status: "PENDING",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        mockReferrals.push(newReferral);
        
        sendResponse({ 
            success: true, 
            referralId: newReferral.id,
            message: 'Referral added successfully'
        });
    } catch (error) {
        console.error('Error adding referral:', error);
        sendResponse({ 
            success: false, 
            error: error.message || 'Failed to add referral'
        });
    }
}

// Improved token validation
function validateToken(token) {
    try {
        if (!token) return false;
        
        // Split the token into parts
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        
        // Decode the payload part (second part)
        const payload = parts[1];
        const decodedPayload = decodeBase64(payload);
        const decoded = JSON.parse(decodedPayload);
        
        // Check if token is expired
        if (decoded.exp && decoded.exp < Date.now()) {
            console.log('Token expired');
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error validating token:', error);
        return false;
    }
}

// Base64 decode function that works in service workers
function decodeBase64(str) {
    try {
        // Convert base64 to binary string
        const binaryString = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
        // Convert binary string to UTF-8
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
    } catch (error) {
        console.error('Error decoding base64:', error);
        return '';
    }
}

// Improved token generation
function generateToken(user) {
    try {
        const header = {
            alg: 'HS256',
            typ: 'JWT'
        };
        
        const payload = {
            ...user,
            exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
        };
        
        // In a real implementation, you would use a secret key here
        const signature = encodeBase64(JSON.stringify(payload));
        
        return `${encodeBase64(JSON.stringify(header))}.${encodeBase64(JSON.stringify(payload))}.${signature}`;
    } catch (error) {
        console.error('Error generating token:', error);
        return null;
    }
}

// Base64 encode function that works in service workers
function encodeBase64(str) {
    try {
        // Convert string to Uint8Array
        const bytes = new TextEncoder().encode(str);
        // Convert to base64
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    } catch (error) {
        console.error('Error encoding base64:', error);
        return '';
    }
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.authToken) {
        const newToken = changes.authToken.newValue;
        if (!newToken || !validateToken(newToken)) {
            chrome.storage.local.clear(() => {
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach(tab => {
                        if (tab.url.includes('add-referral.html') || tab.url.includes('send-invitation.html')) {
                            chrome.tabs.update(tab.id, { url: 'popup.html' });
                        }
                    });
                });
            });
        }
    }
});

// Handle extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Clear any existing data
        chrome.storage.local.clear();
    }
});

// Utility functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}