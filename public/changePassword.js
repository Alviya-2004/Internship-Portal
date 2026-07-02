// public/changePassword.js
function injectChangePasswordModal() {
  const modalHtml = `
    <div id="cpModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-5 w-80 shadow-lg">
        <h2 class="text-sm font-semibold mb-3">Change Password</h2>
        <form id="cpForm" class="space-y-3">
          <div>
            <label class="block text-[11px] text-gray-600 mb-1">Current Password</label>
            <input type="password" id="cpCurrent" class="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-red-600 focus:outline-none" required>
          </div>
          <div>
            <label class="block text-[11px] text-gray-600 mb-1">New Password</label>
            <input type="password" id="cpNew" class="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-red-600 focus:outline-none" required>
          </div>
          <p id="cpMessage" class="text-[11px] hidden"></p>
          <div class="flex justify-end space-x-2 mt-4">
            <button type="button" onclick="closeChangePasswordModal()" class="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded">Cancel</button>
            <button type="submit" class="px-3 py-1.5 text-xs text-white bg-red-700 hover:bg-red-800 rounded">Save</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('cpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('cpCurrent').value;
    const newPassword = document.getElementById('cpNew').value;
    const msg = document.getElementById('cpMessage');
    
    const token = localStorage.getItem('token');
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    
    const data = await res.json();
    if(res.ok) {
      msg.textContent = 'Password changed. Logging out...';
      msg.className = 'text-[11px] text-green-600';
      setTimeout(() => {
        if(typeof logout === 'function') {
          logout();
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/login.html';
        }
      }, 1500);
    } else {
      msg.textContent = data.error || 'Failed to change password';
      msg.className = 'text-[11px] text-red-600';
    }
  });
}

function openChangePasswordModal() {
  document.getElementById('cpModal').classList.remove('hidden');
}

function closeChangePasswordModal() {
  document.getElementById('cpModal').classList.add('hidden');
  document.getElementById('cpForm').reset();
  document.getElementById('cpMessage').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', injectChangePasswordModal);
