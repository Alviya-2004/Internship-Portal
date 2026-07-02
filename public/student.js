const list = document.getElementById('studentInternshipList');
const profileName = document.getElementById('profileDropdownName');
const profileEmail = document.getElementById('profileDropdownEmail');
const profileDept = document.getElementById('profileDropdownDept');
const profileAvatar = document.getElementById('profileAvatar');

// 1) Load current logged-in student and auto-fill top bar
async function loadCurrentStudent() {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please login first.');
    window.location.href = '/login.html';
    return;
  }

  const res = await fetch('/api/me', {
    headers: { 'x-auth-token': token },
  });

  if (!res.ok) {
    alert('Session expired. Please login again.');
    window.location.href = '/login.html';
    return;
  }

  const user = await res.json();
  if (user.role !== 'student') {
    alert('This account is not a student.');
    return;
  }

  // Fill name and email from user
  if (profileName) profileName.textContent = user.name;
  if (profileEmail) profileEmail.textContent = user.email;
  if (profileAvatar && user.name) {
    profileAvatar.textContent = user.name.charAt(0).toUpperCase();
  }

  // Optional: get profile to auto-fill department
  const pRes = await fetch(
    '/api/profile?studentEmail=' + encodeURIComponent(user.email)
  );
  if (pRes.ok) {
    const profile = await pRes.json();
    if (profile && profile.department && profileDept) {
      profileDept.textContent = profile.department;
    }
  }
}

// 2) Apply using token (no manual name/email in body)
async function applyToInternship(internshipId) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please login first.');
    window.location.href = '/login.html';
    return;
  }

  const res = await fetch('/api/applications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': token,
    },
    body: JSON.stringify({ internshipId }),
  });

  if (res.ok) {
    alert('Application submitted!');
    const card = document.getElementById(`internship-card-${internshipId}`);
    if (card) {
       const btn = card.querySelector('.applyBtn');
       if (btn) {
          btn.outerHTML = `<button disabled class="text-xs bg-green-100 text-green-800 font-semibold border border-green-200 px-2 py-1 rounded cursor-not-allowed">Applied ✓</button>`;
       }
    }
  } else {
    alert('Error submitting application');
  }
}

// 3) Load internships (same UI as before)
async function loadInternshipsForStudent() {
  const res = await fetch('/api/internships');
  const data = await res.json();
  
  let appliedSet = new Set();
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const appRes = await fetch('/api/my-applications', { headers: { 'x-auth-token': token } });
      if (appRes.ok) {
        const apps = await appRes.json();
        apps.forEach(app => {
          if (app.internship_id) appliedSet.add(app.internship_id._id || app.internship_id);
        });
      }
    } catch(e) {}
  }

  if (!data.length) {
    list.innerHTML =
      '<p class="text-gray-500 text-xs">No internships available.</p>';
    return;
  }

  list.innerHTML = '';
  data.forEach(int => {
    const card = document.createElement('div');
    card.id = `internship-card-${int._id}`;
    card.className =
      'border border-gray-200 rounded-lg p-3 flex justify-between items-center bg-white transition-colors duration-500';

    const deadline = int.deadline
      ? new Date(int.deadline).toLocaleDateString()
      : 'Not specified';
      
    const companyName = int.company_id ? int.company_id.name : 'Unknown Company';

    card.innerHTML = `
      <div class="space-y-1">
        <div class="text-sm font-semibold text-gray-900">${int.title} <span class="text-[10px] text-gray-400 font-normal">(${int.admin_dept || 'General'})</span></div>
        <div class="text-[11px] text-red-700 font-medium">${companyName}</div>
        <div class="text-[11px] text-gray-600">
          ${int.location || 'Flexible'} · ${int.mode || 'Mode N/A'}
        </div>
        <div class="text-[11px] text-gray-600">
          Stipend: ${int.stipend || 'N/A'} · Required Skills: ${(int.skill_set && int.skill_set.length) ? int.skill_set.join(', ') : 'None specified'}
        </div>
        <div class="text-[11px] text-gray-500">
          Deadline: <span class="font-medium text-gray-800">${deadline}</span>
        </div>
      </div>
      <div class="flex flex-col items-end space-y-1">
        ${
          int.link
            ? `<a href="${int.link}" target="_blank"
                 class="text-xs text-red-700 border border-red-200 px-2 py-0.5 rounded hover:bg-red-50">
                 External Form
               </a>`
            : ''
        }
        ${ appliedSet.has(int._id) ?
            `<button disabled class="text-xs bg-green-100 text-green-800 font-semibold border border-green-200 px-2 py-1 rounded cursor-not-allowed">Applied ✓</button>`
          :
            `<button class="applyBtn text-xs bg-red-700 text-white px-2 py-1 rounded hover:bg-red-800">
               Apply in Portal
             </button>`
        }
      </div>
    `;

    const applyBtn = card.querySelector('.applyBtn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => applyToInternship(int._id));
    }

    list.appendChild(card);
  });
}

// 4) Initial load
loadCurrentStudent();
loadInternshipsForStudent();
loadNotifications(); // Fetch notifications on boot

// ------------------ NOTIFICATIONS LOGIC ------------------ //

async function loadNotifications() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch('/api/notifications', {
      headers: { 'x-auth-token': token }
    });
    if (!res.ok) return;

    const notifs = await res.json();
    const badge = document.getElementById('notifBadge');
    const list = document.getElementById('notifList');

    if (notifs.length > 0) {
      const unreadCount = notifs.filter(n => !n.read_status).length;
      
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
      
      list.innerHTML = notifs.map(n => {
        const companyName = (n.internship_id && n.internship_id.company_id) ? n.internship_id.company_id.name : 'A company';
        const readClass = n.read_status ? 'opacity-50' : 'font-medium';
        const dot = n.read_status ? '' : '<span class="w-2 h-2 rounded-full bg-red-500 mt-1 mr-2 flex-shrink-0"></span>';
        const clickAction = `onclick="handleNotificationClick('${n._id}', '${n.internship_id?._id}', ${n.read_status})"`;
        
        return `
        <div class="px-3 py-2 border-b border-gray-50 hover:bg-red-50 cursor-pointer transition flex items-start" ${clickAction}>
          ${dot}
          <div class="flex flex-col">
            <div class="text-red-700 mb-0.5 ${readClass}" style="line-height: 1.2;">${n.message}</div>
            <div class="text-[10px] text-gray-500">From ${companyName}</div>
          </div>
        </div>
      `}).join('');
    } else {
      badge.classList.add('hidden');
      list.innerHTML = '<div class="px-3 py-4 text-gray-400 text-center text-[10px]">No new notifications</div>';
    }
  } catch (e) {
    console.error('Failed to load notifications:', e);
  }
}

async function handleNotificationClick(notifId, internshipId, alreadyRead) {
  // Close dropdown
  const dropdown = document.getElementById('notifDropdown');
  if (dropdown) dropdown.classList.add('hidden');

  // Mark as read if it wasn't already
  if (!alreadyRead) {
    const token = localStorage.getItem('token');
    try {
      await fetch(`/api/notifications/${notifId}/read`, {
        method: 'PATCH',
        headers: { 'x-auth-token': token }
      });
      loadNotifications();
    } catch(e) {
      console.error(e);
    }
  }

  // Scroll to internship
  if (internshipId) {
    const card = document.getElementById(`internship-card-${internshipId}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash highlight
      const originalClass = card.className;
      card.classList.add('bg-yellow-50', 'border-yellow-400');
      setTimeout(() => {
        card.classList.remove('bg-yellow-50', 'border-yellow-400');
      }, 2000);
    } else {
       alert("This internship is no longer visible.");
    }
  }
}

// Toggle Dropdown
const bellBtn = document.getElementById('notificationBtn');
const dropdown = document.getElementById('notifDropdown');

const profBtn = document.getElementById('profileBtn');
const profDropdown = document.getElementById('profileDropdown');

if (bellBtn && dropdown) {
  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
    if (profDropdown) profDropdown.classList.add('hidden'); // Close profile if open
  });
}

if (profBtn && profDropdown) {
  profBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    profDropdown.classList.toggle('hidden');
    if (dropdown) dropdown.classList.add('hidden'); // Close notif if open
  });
}

// Close when clicking outside
document.addEventListener('click', (e) => {
  if (bellBtn && dropdown && !bellBtn.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
  if (profBtn && profDropdown && !profBtn.contains(e.target) && !profDropdown.contains(e.target)) {
    profDropdown.classList.add('hidden');
  }
});
