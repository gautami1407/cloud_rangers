// ==========================
// Password toggle & strength (your existing code is fine)
// ==========================

// ==========================
// Registration Handler
// ==========================
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Get form values
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const termsAccept = document.getElementById('termsAccept').checked;

        // Simple validation
        if (!fullName || !email || !password || !confirmPassword || !termsAccept) {
            alert("Please fill all fields and accept terms.");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        // Get existing users
        const users = JSON.parse(localStorage.getItem('users') || '[]');

        // Check if email exists
        if (users.some(u => u.email === email)) {
            alert("Email is already registered.");
            return;
        }

        // Add new user
        users.push({ fullName, email, password });
        localStorage.setItem('users', JSON.stringify(users));

        alert("Registration successful! Redirecting to login...");
        window.location.href = 'login.html';
    });
}

// ==========================
// Login Handler
// ==========================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value.trim().toLowerCase();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        if (!email || !password) {
            alert("Please enter both email and password.");
            return;
        }

        // Get users
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            // Set login session
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('loggedInUser', JSON.stringify(user));
            if (rememberMe) localStorage.setItem('rememberMe', 'true');

            alert(`Welcome back, ${user.fullName}!`);
            window.location.href = 'dashboard.html';
        } else {
            alert("Invalid email or password.");
        }
    });
}

// ==========================
// Logout function for dashboard
// ==========================
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
}

// ==========================
// Protect dashboard.html
// ==========================
if (window.location.pathname.includes('dashboard.html')) {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'login.html';
    } else {
        const user = JSON.parse(localStorage.getItem('loggedInUser'));
        const welcomeEl = document.getElementById('welcomeMessage');
        if (welcomeEl) {
            welcomeEl.innerText = `Welcome, ${user.fullName}!`;
        }
    }
}

// ==========================
// Helper: Email validation
// ==========================
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}
