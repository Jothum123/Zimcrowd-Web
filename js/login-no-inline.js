// Login functionality without inline scripts (CSP-safe)
// This file handles all login interactions using event listeners

document.addEventListener('DOMContentLoaded', function() {
    // Check if API client is loaded
    if (typeof window.ZimCrowdAPI === 'undefined') {
        console.error('ZimCrowdAPI not loaded!');
        showError('API client not loaded. Please refresh the page.');
        return;
    }

    console.log('ZimCrowdAPI loaded successfully:', window.ZimCrowdAPI);

    // Initialize login functionality
    initLogin();

    // Check for signup success
    checkSignupSuccess();

    // Check for password reset success
    checkPasswordResetSuccess();
});

function initLogin() {
    // Get DOM elements
    const passwordMethod = document.getElementById('passwordMethod');
    const otpMethod = document.getElementById('otpMethod');
    const passwordForm = document.getElementById('passwordLoginForm');
    const otpForm = document.getElementById('otpLoginForm');
    const passwordToggle = document.getElementById('passwordToggle');
    const requestOTPBtn = document.getElementById('requestOTPBtn');
    const verifyOTPBtn = document.getElementById('verifyOTPBtn');
    const resendOTPBtn = document.getElementById('resendOTPBtn');

    // Add event listeners
    passwordMethod.addEventListener('click', () => switchLoginMethod('password'));
    otpMethod.addEventListener('click', () => switchLoginMethod('otp'));
    passwordForm.addEventListener('submit', handlePasswordLogin);
    passwordToggle.addEventListener('click', togglePasswordVisibility);
    requestOTPBtn.addEventListener('click', requestOTP);
    verifyOTPBtn.addEventListener('click', verifyOTP);
    resendOTPBtn.addEventListener('click', requestOTP);
}

function switchLoginMethod(method) {
    const passwordMethod = document.getElementById('passwordMethod');
    const otpMethod = document.getElementById('otpMethod');
    const passwordForm = document.getElementById('passwordLoginForm');
    const otpForm = document.getElementById('otpLoginForm');

    if (method === 'password') {
        passwordMethod.classList.add('active');
        otpMethod.classList.remove('active');
        passwordForm.style.display = 'block';
        otpForm.style.display = 'none';
    } else {
        passwordMethod.classList.remove('active');
        otpMethod.classList.add('active');
        passwordForm.style.display = 'none';
        otpForm.style.display = 'block';
    }

    // Clear any messages
    clearMessages();
}

async function handlePasswordLogin(e) {
    e.preventDefault();

    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    // Basic validation
    if (!phone || !password) {
        showError('Please enter both phone number and password');
        return;
    }

    // Show loading
    setLoading('passwordLoginBtn', 'passwordLoginText', 'passwordLoginSpinner', true);

    try {
        const response = await window.ZimCrowdAPI.loginPhone(phone, password);

        if (response.success) {
            // Store authentication data
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('onboardingCompleted', 'false');
            localStorage.setItem('authToken', response.session?.access_token || '');
            localStorage.setItem('userData', JSON.stringify(response.user || {}));

            // Set token in API client
            window.ZimCrowdAPI.setToken(response.session?.access_token || '');

            showSuccess('Login successful! Redirecting to dashboard...');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showError(response.message || 'Login failed. Please try again.');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please check your connection and try again.');
    } finally {
        setLoading('passwordLoginBtn', 'passwordLoginText', 'passwordLoginSpinner', false);
    }
}

async function requestOTP() {
    const phone = document.getElementById('otpPhone').value.trim();

    if (!phone) {
        showError('Please enter your phone number');
        return;
    }

    // Show loading
    const btn = document.getElementById('requestOTPBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
        const response = await window.ZimCrowdAPI.passwordlessLogin(phone);

        if (response.success) {
            showSuccess('Verification code sent! Check the server console for your OTP code.');

            // Show verification section
            document.getElementById('otpRequestSection').style.display = 'none';
            document.getElementById('otpVerifySection').style.display = 'block';
            document.getElementById('resendOTPBtn').style.display = 'inline-block';

            // Focus on OTP input
            setTimeout(() => {
                document.getElementById('otpCode').focus();
            }, 500);
        } else {
            showError(response.message || 'Failed to send code');
        }
    } catch (error) {
        console.error('OTP request error:', error);
        showError('Network error. Please try again.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function verifyOTP() {
    const phone = document.getElementById('otpPhone').value.trim();
    const otp = document.getElementById('otpCode').value.trim();

    if (!phone || !otp) {
        showError('Please enter both phone number and OTP code');
        return;
    }

    // Show loading
    setLoading('verifyOTPBtn', 'otpVerifyText', 'otpVerifySpinner', true);

    try {
        const response = await window.ZimCrowdAPI.passwordlessVerify(phone, otp);

        if (response.success) {
            // Store authentication data
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('onboardingCompleted', 'false');
            localStorage.setItem('authToken', response.session?.access_token || '');
            localStorage.setItem('userData', JSON.stringify(response.user || {}));

            // Set token in API client
            window.ZimCrowdAPI.setToken(response.session?.access_token || '');

            showSuccess('Login successful! Redirecting to dashboard...');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showError(response.message || 'Invalid OTP code');
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        showError('Verification failed. Please try again.');
    } finally {
        setLoading('verifyOTPBtn', 'otpVerifyText', 'otpVerifySpinner', false);
    }
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('passwordToggle');
    const icon = passwordToggle.querySelector('i');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function checkSignupSuccess() {
    const signupSuccess = localStorage.getItem('signupSuccess');
    const userPhone = localStorage.getItem('userPhone');

    if (signupSuccess === 'true' && userPhone) {
        document.getElementById('phone').value = userPhone;
        showSuccess('Account created successfully! Please login with your phone number and password.');
        localStorage.removeItem('signupSuccess');
        localStorage.removeItem('userPhone');
    }
}

function checkPasswordResetSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const resetMessage = urlParams.get('message');

    if (resetMessage === 'password-reset-success') {
        showSuccess('Password reset successful! Please login with your new password.');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

function showSuccess(message) {
    const container = document.getElementById('messageContainer');
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    container.appendChild(successDiv);
    successDiv.style.display = 'block';

    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

function showError(message) {
    const container = document.getElementById('messageContainer');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    container.appendChild(errorDiv);
    errorDiv.style.display = 'block';
}

function clearMessages() {
    const container = document.getElementById('messageContainer');
    container.innerHTML = '';
}

function setLoading(buttonId, textId, spinnerId, loading) {
    const button = document.getElementById(buttonId);
    const text = document.getElementById(textId);
    const spinner = document.getElementById(spinnerId);

    if (loading) {
        button.disabled = true;
        text.style.display = 'none';
        spinner.style.display = 'inline-block';
    } else {
        button.disabled = false;
        text.style.display = 'inline';
        spinner.style.display = 'none';
    }
}
