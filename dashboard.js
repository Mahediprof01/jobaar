// Load user data when dashboard opens
chrome.storage.local.get(['userData'], function(result) {
    if (result.userData) {
        const user = result.userData;
        
        // Update welcome message and role
        document.getElementById('welcome-name').textContent = `Welcome, ${user.name}`;
        document.getElementById('user-role').textContent = `${user.role} at ${user.company}`;
        
        // Update referral count
        document.getElementById('referral-count').textContent = user.referrals;
        
        // Get company data
        chrome.runtime.sendMessage({ 
            action: "getCompanyData",
            userEmail: user.email
        }, (response) => {
            if (response && response.success) {
                document.getElementById('open-positions').textContent = response.company.openPositions;
            }
        });
        
        // Get referrals
        chrome.runtime.sendMessage({ 
            action: "getReferrals",
            userEmail: user.email
        }, (response) => {
            if (response && response.success) {
                displayReferrals(response.referrals);
            }
        });
    } else {
        // If no user data, redirect to login
        window.location.href = "popup.html";
    }
});

function displayReferrals(referrals) {
    const referralList = document.getElementById('referral-list');
    referralList.innerHTML = ''; // Clear existing content
    
    referrals.forEach(referral => {
        const referralElement = document.createElement('div');
        referralElement.className = 'referral-item';
        
        const statusClass = `status-${referral.status.toLowerCase()}`;
        
        referralElement.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${referral.candidateName}</strong>
                    <div style="font-size: 14px; color: #666;">
                        ${referral.position}
                    </div>
                </div>
                <span class="status-badge ${statusClass}">
                    ${referral.status}
                </span>
            </div>
            <div style="font-size: 12px; color: #999; margin-top: 5px;">
                ${referral.date}
            </div>
        `;
        
        referralList.appendChild(referralElement);
    });
} 