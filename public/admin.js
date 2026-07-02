const form = document.getElementById('internshipForm');
const list = document.getElementById('internshipList');
const searchBox = document.getElementById('searchBox');

const addNewCompanyCheck = document.getElementById('addNewCompanyCheck');
const adminCompanySelect = document.getElementById('adminCompanySelect');
const newCompanyFields = document.getElementById('newCompanyFields');

let allInternships = [];

const token = localStorage.getItem('token');
const role = localStorage.getItem('role');
const department = localStorage.getItem('department');

if (!token || !['main_admin', 'dept_admin'].includes(role)) {
  window.location.href = '/login.html';
}

// ---------- INTERNSHIPS (admin) ----------

function renderInternships(data) {
  list.innerHTML = '';

  if (!data.length) {
    list.innerHTML = '<p class="text-gray-500 text-xs">No internships posted yet.</p>';
    return;
  }

  data.forEach(int => {
    const tags = (int.skill_set || []).join(', ');
    const deadline = int.deadline
      ? new Date(int.deadline).toLocaleDateString()
      : 'Not specified';
      
    const companyName = int.company_id ? int.company_id.name : 'Unknown Company';

    const card = document.createElement('div');
    card.className =
      'border border-gray-200 rounded-lg p-3 hover:border-red-300 transition flex justify-between items-center';

    card.innerHTML = `
      <div class="space-y-1">
        <div class="flex items-center space-x-2">
          <span class="text-sm font-semibold text-gray-900">${int.title}</span>
          <span class="text-[11px] text-red-700 font-medium px-1.5 py-0.5 bg-red-50 rounded">
            ${companyName}
          </span>
        </div>
        <div class="text-[11px] text-gray-600">
          ${int.admin_dept || 'General Dept'} ·
          ${int.location || 'Location flexible'} ·
          ${int.mode || 'Mode not specified'}
        </div>
        <div class="text-[11px] text-gray-600">
          Stipend: ${int.stipend || 'N/A'}
        </div>
        <div class="text-[11px] text-gray-500">
          Skills: ${tags || 'Not specified'}
        </div>
        <div class="text-[11px] text-gray-500">
          Deadline: <span class="text-gray-800 font-medium">${deadline}</span>
        </div>
      </div>
      </div>
      </div>
      <div class="flex flex-col items-end space-y-1">
        <span class="text-[10px] text-gray-400">
          ID: ${int._id.slice(-6)}
        </span>
        <div class="flex space-x-2 mt-1">
          <button class="edit-internship-btn text-blue-600 hover:text-blue-800 text-[10px] underline" data-id="${int._id}">Edit</button>
          <button class="delete-internship-btn text-red-600 hover:text-red-800 text-[10px] underline" data-id="${int._id}">Delete</button>
        </div>
      </div>
    `;

    list.appendChild(card);
  });

  document.querySelectorAll('.edit-internship-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      const int = allInternships.find(i => i._id === id);
      if (!int) return;

      document.getElementById('editIntId').value = int._id;
      document.getElementById('editIntTitle').value = int.title || '';
      document.getElementById('editIntAdminDept').value = int.admin_dept || '';
      document.getElementById('editIntLocation').value = int.location || '';
      document.getElementById('editIntMode').value = int.mode || '';
      document.getElementById('editIntStipend').value = int.stipend || '';
      document.getElementById('editIntStartDate').value = int.start_date ? int.start_date.split('T')[0] : '';
      document.getElementById('editIntEndDate').value = int.end_date ? int.end_date.split('T')[0] : '';
      document.getElementById('editIntDeadline').value = int.deadline ? int.deadline.split('T')[0] : '';
      document.getElementById('editIntSkills').value = (int.skill_set || []).join(', ');

      document.getElementById('editInternshipModal').classList.remove('hidden');
    });
  });

  document.querySelectorAll('.delete-internship-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if(!confirm('Are you sure you want to delete this internship?')) return;
      const id = e.target.dataset.id;
      const res = await fetch('/api/internships/' + id, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });
      if(res.ok) {
        await loadInternships();
        await loadApplications();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete');
      }
    });
  });
}

async function loadInternships() {
  const res = await fetch('/api/internships');
  const data = await res.json();
  allInternships = data;
  renderInternships(allInternships);
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());

  payload.skill_set = payload.skill_set
    ? payload.skill_set.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  // Check if adding a new company
  if (addNewCompanyCheck && addNewCompanyCheck.checked) {
    const compName = document.getElementById('newCompName').value.trim();
    const compEmail = document.getElementById('newCompEmail').value.trim();
    const compWeb = document.getElementById('newCompWeb').value.trim();

    if (!compName) return alert('New Company Name is required.');

    const cRes = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: compName, email: compEmail, website: compWeb })
    });

    if (!cRes.ok) return alert('Failed to create new company.');
    
    const newComp = await cRes.json();
    payload.company_id = newComp._id; 
    
    // Refresh the dropdown silently so it's there for the next time
    await loadCompaniesForSelect();
  } else if (!payload.company_id) {
    return alert('Please select a company or create a new one.');
  }

  const res = await fetch('/api/internships', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-auth-token': token
    },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    form.reset();
    if(addNewCompanyCheck) {
      addNewCompanyCheck.checked = false;
      newCompanyFields.classList.add('hidden');
      adminCompanySelect.required = true;
      adminCompanySelect.disabled = false;
    }
    await loadInternships();
  } else {
    alert('Error saving internship');
  }
});

if (addNewCompanyCheck) {
  addNewCompanyCheck.addEventListener('change', e => {
    if (e.target.checked) {
      newCompanyFields.classList.remove('hidden');
      adminCompanySelect.required = false;
      adminCompanySelect.disabled = true;
    } else {
      newCompanyFields.classList.add('hidden');
      adminCompanySelect.required = true;
      adminCompanySelect.disabled = false;
    }
  });
}

// simple search on title/company
if (searchBox) {
  searchBox.addEventListener('input', () => {
    const q = searchBox.value.toLowerCase();
    const filtered = allInternships.filter(int =>
      (int.title || '').toLowerCase().includes(q) ||
      (int.company_id?.name || '').toLowerCase().includes(q)
    );
    renderInternships(filtered);
  });
}

// ---------- APPLICATIONS (admin) ----------

async function loadApplications() {
  const status = document.getElementById('filterStatus').value;
  const department = document.getElementById('filterDept').value.trim();
  const minCgpa = document.getElementById('filterMinCgpa').value;
  const skill = document.getElementById('filterSkill').value.trim();
  const sortBy = document.getElementById('sortBy').value;
  const sortOrder = document.getElementById('sortOrder').value;

  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (department) params.append('department', department);
  if (minCgpa) params.append('minCgpa', minCgpa);
  if (skill) params.append('skill', skill);
  params.append('sortBy', sortBy);
  params.append('sortOrder', sortOrder);

  const res = await fetch('/api/applications?' + params.toString(), {
    headers: { 'x-auth-token': token }
  });
  let apps = await res.json();

  const searchQ = document.getElementById('searchAppBox')?.value.toLowerCase();
  if (searchQ) {
    apps = apps.filter(app => 
      (app.internship_id?.title || '').toLowerCase().includes(searchQ) ||
      (app.internship_id?.company_id?.name || '').toLowerCase().includes(searchQ)
    );
  }

  const tbody = document.getElementById('applicationsTableBody');
  tbody.innerHTML = '';

  if (!apps.length) {
    const row = document.createElement('tr');
    row.innerHTML =
      '<td colspan="6" class="px-3 py-3 text-center text-gray-500">No applications found.</td>';
    tbody.appendChild(row);
    return;
  }

    apps.forEach(app => {
    const row = document.createElement('tr');

    const appliedAt = app.applied_at
      ? new Date(app.applied_at).toLocaleString()
      : '-';
      
    const studentName = app.student_id ? app.student_id.name : 'Unknown';
    const studentEmail = app.student_id ? app.student_id.email : 'Unknown';
    const dept = app.student_id ? app.student_id.department : app.department;

    row.innerHTML = `
      <td class="px-3 py-2">
        <div class="font-semibold text-gray-900">${studentName}</div>
        <div class="text-[11px] text-gray-500">${studentEmail}</div>
      </td>
      <td class="px-3 py-2 text-[11px] text-gray-700">
        ${dept || '-'}<br>
        CGPA: ${app.cgpa || '-'}
      </td>
      <td class="px-3 py-2 text-[11px] text-gray-700">
        ${app.internship_id?.title || '-'} at <span class="font-medium text-gray-600">${app.internship_id?.company_id?.name || 'Unknown Company'}</span><br>
        <span class="text-gray-500">${app.internship_id?.admin_dept || ''}</span>
      </td>
      <td class="px-3 py-2 text-[11px] text-gray-700" title="${(app.skills || []).map(s => s.name || s).join(', ') || '-'}">
        <div class="w-32 truncate">${(app.skills || []).map(s => s.name || s).join(', ') || '-'}</div>
      </td>
      <td class="px-3 py-2">
        <select class="border rounded px-2 py-0.5 text-[11px] app-status-select" data-id="${app._id}">
          <option value="Applied" ${app.status === 'Applied' ? 'selected' : ''}>Applied</option>
          <option value="Shortlisted" ${app.status === 'Shortlisted' ? 'selected' : ''}>Shortlisted</option>
          <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
          <option value="Selected" ${app.status === 'Selected' ? 'selected' : ''}>Selected</option>
        </select>
      </td>
      <td class="px-3 py-2 text-[11px] text-gray-600">
        ${appliedAt}
      </td>
    `;

    tbody.appendChild(row);
  });

  // attach listeners for status changes
  document
    .querySelectorAll('.app-status-select')
    .forEach(select => {
      select.addEventListener('change', async e => {
        const id = e.target.dataset.id;
        const status = e.target.value;

        const res = await fetch('/api/applications/' + id, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'x-auth-token': token 
          },
          body: JSON.stringify({ status }),
        });

        if (!res.ok) {
          alert('Error updating status');
        }
      });
    });
}

document.getElementById('applyFiltersBtn')
  .addEventListener('click', loadApplications);

const searchAppBox = document.getElementById('searchAppBox');
if (searchAppBox) {
  searchAppBox.addEventListener('input', loadApplications);
}

async function loadCompaniesForSelect() {
  const sel = document.getElementById('adminCompanySelect');
  if(!sel) return;
  
  sel.innerHTML = '<option value="">-- Select Company --</option>';

  const res = await fetch('/api/companies');
  if(res.ok){
     const companies = await res.json();
     companies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c._id;
        opt.textContent = c.name;
        sel.appendChild(opt);
     });
  }
}

// Edit Internship Handlers
window.closeEditInternshipModal = function() {
  document.getElementById('editInternshipModal').classList.add('hidden');
}

const editInternshipForm = document.getElementById('editInternshipForm');
if (editInternshipForm) {
  editInternshipForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(editInternshipForm);
    const payload = Object.fromEntries(fd.entries());
    const id = payload.id;
    delete payload.id;

    payload.skill_set = payload.skill_set
      ? payload.skill_set.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const res = await fetch('/api/internships/' + id, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeEditInternshipModal();
      await loadInternships();
    } else {
      const err = await res.json();
      alert('Error saving internship: ' + (err.error || ''));
    }
  });
}

// Edit User Handlers
window.closeEditUserModal = function() {
  document.getElementById('editUserModal').classList.add('hidden');
}

const editUserForm = document.getElementById('editUserForm');
if (editUserForm) {
  editUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(editUserForm);
    const payload = Object.fromEntries(fd.entries());
    const id = payload.id;
    delete payload.id;

    if (!payload.password) delete payload.password;

    const res = await fetch('/api/admin/users/' + id, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeEditUserModal();
      await loadManageUsers();
    } else {
      const err = await res.json();
      alert('Error updating user: ' + (err.error || ''));
    }
  });
}

// initial loads

if (role === 'main_admin' || role === 'dept_admin') {
  document.getElementById('createUserSection').classList.remove('hidden');
  
  const roleSelect = document.getElementById('createUserRoleSelect');
  const userDeptInput = document.getElementById('createUserDeptInput');
  const sectionTitle = document.querySelector('#createUserSection h2');
  const sectionDesc = document.querySelector('#createUserSection p');
  
  if (role === 'main_admin') {
     sectionTitle.textContent = 'Add Department Admin';
     sectionDesc.textContent = 'Create an account for a department placement officer.';
     roleSelect.innerHTML = '<option value="dept_admin">Department Admin</option>';
  } else if (role === 'dept_admin') {
     sectionTitle.textContent = 'Add Faculty Member';
     sectionDesc.textContent = 'Create an account for a class teacher or faculty in your department.';
     roleSelect.innerHTML = '<option value="faculty">Faculty</option>';
     userDeptInput.value = department;
     userDeptInput.readOnly = true;
     userDeptInput.className += ' bg-gray-100 cursor-not-allowed';
  }
  
  const createUserForm = document.getElementById('createUserForm');
  const userMessage = document.getElementById('userMessage');
  
  if (createUserForm) {
    createUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(createUserForm);
      const data = Object.fromEntries(fd.entries());
      
      const res = await fetch('/api/admin/users', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'x-auth-token': token
         },
         body: JSON.stringify(data)
      });
      
      if (res.ok) {
         userMessage.textContent = 'User created successfully!';
         userMessage.classList.remove('hidden', 'text-red-600');
         userMessage.classList.add('text-green-600');
         createUserForm.reset();
         if (role === 'dept_admin') userDeptInput.value = department; // reset constraint
         setTimeout(() => userMessage.classList.add('hidden'), 3000);
         if (typeof loadManageUsers === 'function') loadManageUsers();
      } else {
         const err = await res.json();
         userMessage.textContent = err.error || 'Failed to create user.';
         userMessage.classList.remove('hidden', 'text-green-600');
         userMessage.classList.add('text-red-600');
      }
    });
  }

  const manageSec = document.getElementById('manageUsersSection');
  if(manageSec) {
    manageSec.classList.remove('hidden');
    loadManageUsers();
  }
}

async function loadManageUsers() {
  const res = await fetch('/api/admin/users', { headers: { 'x-auth-token': token } });
  if(!res.ok) return;
  const users = await res.json();
  const tbody = document.getElementById('manageUsersTableBody');
  if(!tbody) return;
  tbody.innerHTML = '';
  
  if(!users.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-3 py-3 text-center text-gray-500">No users found.</td></tr>';
    return;
  }

  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-3 py-2 font-medium">${u.name}</td>
      <td class="px-3 py-2 text-gray-600">${u.email}</td>
      <td class="px-3 py-2 text-gray-600">${u.role}</td>
      <td class="px-3 py-2 text-gray-600">${u.department || 'All'}</td>
      <td class="px-3 py-2 space-x-2">
        <button class="text-blue-600 hover:text-blue-800 underline text-[11px] edit-user-btn" data-id="${u._id}">Edit</button>
        <button class="text-red-600 hover:text-red-800 underline text-[11px] remove-user-btn" data-id="${u._id}">Remove</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll('.edit-user-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      const res = await fetch('/api/admin/users/' + id, {
        headers: { 'x-auth-token': token }
      });
      if (!res.ok) return alert('Failed to fetch user details');
      const data = await res.json();
      
      document.getElementById('editUserId').value = data.user._id;
      document.getElementById('editUserName').value = data.user.name || '';
      document.getElementById('editUserEmail').value = data.user.email || '';
      document.getElementById('editUserDept').value = data.user.department || '';
      document.getElementById('editUserPassword').value = '';
      
      const phoneInput = document.getElementById('editUserPhone');
      const desigInput = document.getElementById('editUserDesignation');
      const desigContainer = document.getElementById('editUserDesignationContainer');
      
      if (data.profile) {
        phoneInput.value = data.profile.phn || data.profile.phone || '';
        if (data.user.role === 'faculty') {
          desigContainer.classList.remove('hidden');
          desigInput.value = data.profile.designation || '';
        } else {
          desigContainer.classList.add('hidden');
        }
      } else {
        phoneInput.value = '';
        if (data.user.role === 'faculty') desigContainer.classList.remove('hidden');
        else desigContainer.classList.add('hidden');
      }

      if (role === 'dept_admin') {
        const deptEl = document.getElementById('editUserDept');
        deptEl.readOnly = true;
        if(!deptEl.className.includes('bg-gray-100')) {
            deptEl.className += ' bg-gray-100 cursor-not-allowed';
        }
      }

      document.getElementById('editUserModal').classList.remove('hidden');
    });
  });

  document.querySelectorAll('.remove-user-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if(!confirm('Are you sure you want to remove this user?')) return;
      const id = e.target.dataset.id;
      const res = await fetch('/api/admin/users/' + id, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });
      if(res.ok) {
         loadManageUsers();
      } else {
         const err = await res.json();
         alert(err.error || 'Failed to remove user');
      }
    });
  });
}

if (role === 'dept_admin') {
  // lock admin_dept field
  const deptInput = document.querySelector('input[name="admin_dept"]');
  if (deptInput) {
    deptInput.value = department;
    deptInput.readOnly = true;
    deptInput.className += ' bg-gray-100 cursor-not-allowed';
  }
  const facLink = document.getElementById('facultyDashLink');
  if (facLink) facLink.classList.remove('hidden');
}

loadCompaniesForSelect();
loadApplications();
loadInternships();

async function loadAdminProfile() {
  try {
    const res = await fetch('/api/me', { headers: { 'x-auth-token': token } });
    if (!res.ok) return;
    const me = await res.json();
    
    const profileName = document.getElementById('profileDropdownName');
    const profileEmail = document.getElementById('profileDropdownEmail');
    const profileDept = document.getElementById('profileDropdownDept');
    const profileAvatar = document.getElementById('profileAvatar');
    
    if (profileName) profileName.textContent = me.name || 'Admin';
    if (profileEmail) profileEmail.textContent = me.email || '';
    if (profileDept) {
      profileDept.textContent = me.department || (me.role === 'main_admin' ? 'Placement Cell' : '');
    }
    if (profileAvatar && me.name) {
      profileAvatar.textContent = me.name.charAt(0).toUpperCase();
    }
  } catch(e) {
    console.log('Failed to load admin profile metadata', e);
  }
}

// Toggle Dropdown
const profBtn = document.getElementById('profileBtn');
const profDropdown = document.getElementById('profileDropdown');

if (profBtn && profDropdown) {
  profBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    profDropdown.classList.toggle('hidden');
  });
}

// Close when clicking outside
document.addEventListener('click', (e) => {
  if (profBtn && profDropdown && !profBtn.contains(e.target) && !profDropdown.contains(e.target)) {
    profDropdown.classList.add('hidden');
  }
});

loadAdminProfile();

// Restrict date inputs to today onwards
const todayStr = new Date().toISOString().split('T')[0];
const startInput = document.querySelector('#internshipForm input[name="start_date"]');
const endInput = document.querySelector('#internshipForm input[name="end_date"]');
const deadlineInput = document.querySelector('#internshipForm input[name="deadline"]');

if (startInput) startInput.min = todayStr;
if (endInput) endInput.min = todayStr;
if (deadlineInput) deadlineInput.min = todayStr;

const editStartInput = document.getElementById('editIntStartDate');
const editEndInput = document.getElementById('editIntEndDate');
const editDeadInput = document.getElementById('editIntDeadline');

if (editStartInput) editStartInput.min = todayStr;
if (editEndInput) editEndInput.min = todayStr;
if (editDeadInput) editDeadInput.min = todayStr;
