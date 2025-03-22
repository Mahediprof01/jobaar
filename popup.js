// Check for remembered email and handle navigation
chrome.storage.local.get(['rememberedEmail', 'userData', 'authToken'], function(result) {
    console.log('Initial state:', { 
        hasRememberedEmail: !!result.rememberedEmail,
        isLoggedIn: !!result.authToken,
        userData: result.userData 
    });

    if (result.rememberedEmail) {
        document.getElementById('email').value = result.rememberedEmail;
        document.getElementById('remember').checked = true;
    }
});

// Add navigation buttons
const navigationDiv = document.createElement('div');
navigationDiv.className = 'navigation';
navigationDiv.innerHTML = `
    <button id="logoutBtn" style="display: none;">Logout</button>
`;
document.body.appendChild(navigationDiv);

// Style navigation
const style = document.createElement('style');
style.textContent = `
    .navigation {
        position: fixed;
        bottom: 10px;
        right: 10px;
        display: flex;
        gap: 10px;
    }
    .navigation button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        background: #dc3545;
        color: white;
        cursor: pointer;
    }
    .navigation button:hover {
        background: #c82333;
    }
`;
document.head.appendChild(style);

// Handle logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        const response = await new Promise(resolve => {
            chrome.runtime.sendMessage({ action: 'logout' }, resolve);
        });

        if (response.success) {
            console.log('Logout successful');
            window.location.reload();
        } else {
            console.error('Logout failed:', response.error);
            alert('Logout failed: ' + response.error);
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('An error occurred during logout');
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    // Get DOM elements
    const loginForm = document.getElementById('loginForm');
    const loginButton = document.getElementById('loginButton');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const loginError = document.getElementById('loginError');
    const loginSuccess = document.getElementById('loginSuccess');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const rememberMe = document.getElementById('remember');
    const emailInput = document.getElementById('email');

    // Check for remembered email and handle navigation
    chrome.storage.local.get(['rememberedEmail', 'userData', 'authToken'], function(result) {
        console.log('Initial state:', { 
            hasRememberedEmail: !!result.rememberedEmail,
            isLoggedIn: !!result.authToken,
            userData: result.userData 
        });

        if (result.rememberedEmail && emailInput) {
            emailInput.value = result.rememberedEmail;
            if (rememberMe) {
                rememberMe.checked = true;
            }
        }
    });

    // Check if user is already logged in
    chrome.storage.local.get(['authToken', 'userData', 'rememberMe'], (result) => {
        if (result.authToken && result.userData) {
            // If remember me is checked, auto-login
            if (result.rememberMe && rememberMe) {
                rememberMe.checked = true;
                handleSuccessfulLogin(result.userData, result.authToken);
            }
        }
    });

    // Handle form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Reset error messages
            if (loginError) loginError.style.display = 'none';
            if (emailError) emailError.style.display = 'none';
            if (passwordError) passwordError.style.display = 'none';
            if (loginSuccess) loginSuccess.style.display = 'none';

            // Get form values
            const email = emailInput.value.trim();
            const password = document.getElementById('password').value;

            // Validate email
            if (!isValidEmail(email)) {
                if (emailError) {
                    emailError.textContent = 'Please enter a valid email address';
                    emailError.style.display = 'block';
                }
                return;
            }

            // Validate password
            if (password.length < 6) {
                if (passwordError) {
                    passwordError.textContent = 'Password must be at least 6 characters long';
                    passwordError.style.display = 'block';
                }
                return;
            }

            // Show loading state
            if (loginButton) loginButton.disabled = true;
            if (loadingIndicator) loadingIndicator.style.display = 'block';

            try {
                // Send login request to background script
                chrome.runtime.sendMessage({
                    action: 'login',
                    credentials: {
                        email,
                        password,
                        remember: rememberMe ? rememberMe.checked : false
                    }
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Runtime error:', chrome.runtime.lastError);
                        if (loginError) {
                            loginError.textContent = 'Extension error. Please try again.';
                            loginError.style.display = 'block';
                        }
                    } else if (response && response.success) {
                        console.log('Login successful:', response);
                        handleSuccessfulLogin(response.userData, response.authToken);
                    } else {
                        console.error('Login failed:', response?.error);
                        if (loginError) {
                            loginError.textContent = response?.error || 'Invalid email or password';
                            loginError.style.display = 'block';
                        }
                    }
                    // Reset loading state
                    if (loginButton) loginButton.disabled = false;
                    if (loadingIndicator) loadingIndicator.style.display = 'none';
                });
            } catch (error) {
                console.error('Login error:', error);
                if (loginError) {
                    loginError.textContent = 'An unexpected error occurred. Please try again.';
                    loginError.style.display = 'block';
                }
                // Reset loading state
                if (loginButton) loginButton.disabled = false;
                if (loadingIndicator) loadingIndicator.style.display = 'none';
            }
        });
    }

    function handleSuccessfulLogin(userData, token) {
        // Show success message
        if (loginSuccess) {
            loginSuccess.textContent = 'Login successful! Redirecting...';
            loginSuccess.style.display = 'block';
        }

        // Store the token, user data, and email separately
        chrome.storage.local.set({
            authToken: token,
            userData: userData,
            userEmail: userData.email, // Store email separately for easy access
            rememberMe: rememberMe ? rememberMe.checked : false
        }, () => {
            // Redirect to add-referral page after a short delay
            setTimeout(() => {
                window.location.href = 'add-referral.html';
            }, 1000);
        });
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Handle remember me checkbox
    if (rememberMe) {
        rememberMe.addEventListener('change', () => {
            chrome.storage.local.set({ rememberMe: rememberMe.checked });
        });
    }
});