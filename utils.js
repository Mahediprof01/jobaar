// Shared utility functions
async function handleLogout() {
    try {
        const response = await new Promise(resolve => {
            chrome.runtime.sendMessage({ action: 'logout' }, resolve);
        });

        if (response.success) {
            console.log('Logout successful');
            // Clear all user data from storage
            await chrome.storage.local.remove([
                'authToken',
                'userData',
                'lastReferral',
                'rememberedEmail',
                'rememberMe'
            ]);
            // Redirect to login page
            window.location.href = 'popup.html';
            return true;
        } else {
            console.error('Logout failed:', response.error);
            return false;
        }
    } catch (error) {
        console.error('Logout error:', error);
        return false;
    }
}

// Add logout button to any page
function addLogoutButton(container) {
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.className = 'nav-btn';
    logoutBtn.textContent = 'Logout';
    
    // Add styles if not already present
    if (!document.querySelector('#logoutBtnStyles')) {
        const style = document.createElement('style');
        style.id = 'logoutBtnStyles';
        style.textContent = `
            .nav-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                min-width: 100px;
                background: #dc3545;
                color: white;
            }
            .nav-btn:hover {
                background: #c82333;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add click handler
    logoutBtn.addEventListener('click', handleLogout);
    
    // Add to container
    container.appendChild(logoutBtn);
    
    return logoutBtn;
} 