// Authentication JavaScript
// Handles registration, login, and password validation

// Password toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    // Toggle password visibility
    const setupPasswordToggle = (inputId, toggleId) => {
        const passwordInput = document.getElementById(inputId);
        const toggleBtn = document.getElementById(toggleId);
        
        if (passwordInput && toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                const icon = this.querySelector('i');
                icon.classList.toggle('bi-eye');
                icon.classList.toggle('bi-eye-slash');
            });
        }
    };

    // Setup toggles for different pages
    setupPasswordToggle('password', 'togglePassword');
    setupPasswordToggle('confirmPassword', 'toggleConfirmPassword');
    setupPasswordToggle('loginPassword', 'toggleLoginPassword');

    // Password strength indicator
    const passwordInput = document.getElementById('password');
    const strengthIndicator = document.getElementById('passwordStrength');
    
    if (passwordInput && strengthIndicator) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = calculatePasswordStrength(password);
            
            strengthIndicator.className = 'password-strength';
            if (password.length > 0) {
                if (strength < 30) {
                    strengthIndicator.classList.add('weak');
                } else if (strength < 60) {
                    strengthIndicator.classList.add('medium');
                } else {
                    strengthIndicator.classList.add('strong');
                }
            }
        });
    }
});

// Calculate password strength
function calculatePasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 6) strength += 20;
    if (password.length >= 10) strength += 20;
    if (/[a-z]/.test(password)) strength += 15;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 15;
    
    return strength;
}

// Registration Form Handler
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Clear previous validation
        this.classList.remove('was-validated');
        
        // Get form values
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const termsAccept = document.getElementById('termsAccept').checked;
        
        // Validation
        let isValid = true;
        
        if (!fullName) {
            isValid = false;
            document.getElementById('fullName').classList.add('is-invalid');
        }
        
        if (!email || !isValidEmail(email)) {
            isValid = false;
            document.getElementById('email').classList.add('is-invalid');
        }
        
        if (!password || password.length < 6) {
            isValid = false;
            document.getElementById('password').classList.add('is-invalid');
        }
        
        if (password !== confirmPassword) {
            isValid = false;
            document.getElementById('confirmPassword').classList.add('is-invalid');
            alert('Passwords do not match!');
        }
        
        if (!termsAccept) {
            isValid = false;
            document.getElementById('termsAccept').classList.add('is-invalid');
        }
        
        if (!isValid) {
            this.classList.add('was-validated');
            return;
        }
        
        // Show loading state
        const btnText = this.querySelector('.btn-text');
        const btnLoader = this.querySelector('.btn-loader');
        const submitBtn = this.querySelector('button[type="submit"]');
        
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-flex';
        submitBtn.disabled = true;
        
        // Simulate API call
        setTimeout(() => {
            // Store user data (in production, this would be handled by backend)
            localStorage.setItem('userName', fullName);
            localStorage.setItem('userEmail', email);
            localStorage.setItem('registeredUser', 'true');
            
            // Success message
            alert('Registration successful! Please login to continue.');
            
            // Redirect to login page
            window.location.href = 'login.html';
        }, 1500);
    });
}

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        // Basic validation
        if (!email || !password) {
            alert('Please enter both email and password');
            return;
        }
        
        // Show loading state
        const btnText = this.querySelector('.btn-text');
        const btnLoader = this.querySelector('.btn-loader');
        const submitBtn = this.querySelector('button[type="submit"]');
        
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-flex';
        submitBtn.disabled = true;
        
        // Simulate API call
        setTimeout(() => {
            // Check if user is registered
            const registeredUser = localStorage.getItem('registeredUser');
            const isFirstLogin = localStorage.getItem('hasCompletedSurvey') !== 'true';
            
            // Set login state
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userEmail', email);
            
            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
            }
            
            // Redirect based on survey completion
            if (isFirstLogin) {
                window.location.href = 'survey.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        }, 1500);
    });
}

// Email validation helper
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Remove invalid class on input
document.addEventListener('DOMContentLoaded', function() {
    const inputs = document.querySelectorAll('.form-control, .form-check-input');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            this.classList.remove('is-invalid');
            this.classList.remove('is-valid');
        });
    });
});