const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const msg = document.getElementById('loginMessage');

form.addEventListener('submit', async e => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    msg.textContent = 'Invalid credentials';
    return;
  }

  const data = await res.json();
  localStorage.setItem('token', data.token);
  localStorage.setItem('role', data.user.role);
  localStorage.setItem('department', data.user.department || '');

  // redirect all roles to the landing page, which will act as a splash screen
  window.location.href = '/landing.html';
});

const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
const fpModal1 = document.getElementById('fpModal1');
const fpModal2 = document.getElementById('fpModal2');
const fpForm1 = document.getElementById('fpForm1');
const fpForm2 = document.getElementById('fpForm2');

if (forgotPasswordBtn) {
  forgotPasswordBtn.addEventListener('click', () => {
    fpModal1.classList.remove('hidden');
  });
}

window.closeFpModal1 = function() {
  fpModal1.classList.add('hidden');
  fpForm1.reset();
  document.getElementById('fpMessage1').classList.add('hidden');
}

window.closeFpModal2 = function() {
  fpModal2.classList.add('hidden');
  fpForm2.reset();
  document.getElementById('fpMessage2').classList.add('hidden');
}

let resetEmail = '';

if (fpForm1) {
  fpForm1.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('fpEmail').value.trim();
    const msg = document.getElementById('fpMessage1');
    msg.className = 'text-[11px] text-gray-600';
    msg.textContent = 'Sending...';
    msg.classList.remove('hidden');

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await res.json();
    if (res.ok) {
      resetEmail = email;
      closeFpModal1();
      fpModal2.classList.remove('hidden');
      alert('OTP successfully sent to your email. Check backend running console to view the Ethereal inbox link!');
    } else {
      msg.textContent = data.error || 'Failed to request reset';
      msg.className = 'text-[11px] text-red-600';
    }
  });
}

if (fpForm2) {
  fpForm2.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = document.getElementById('fpOtp').value.trim();
    const newPassword = document.getElementById('fpNewPass').value;
    const msg = document.getElementById('fpMessage2');

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resetEmail, otp, newPassword })
    });

    const data = await res.json();
    if (res.ok) {
      msg.textContent = 'Password reset successful. Please login.';
      msg.className = 'text-[11px] text-green-600';
      msg.classList.remove('hidden');
      setTimeout(() => {
        closeFpModal2();
      }, 2000);
    } else {
      msg.textContent = data.error || 'Failed to reset password';
      msg.className = 'text-[11px] text-red-600';
      msg.classList.remove('hidden');
    }
  });
}
