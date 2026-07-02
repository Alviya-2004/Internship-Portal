// NO LOGIN REQUIRED - direct access to faculty dashboard
async function loadStudents() {
  const box = document.getElementById('studentsContainer');
  
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Fetch applications to calculate ongoing/past internships for each student
    const appsRes = await fetch('/api/faculty/applications', {
      headers: { 'x-auth-token': token }
    });
    const apps = appsRes.ok ? await appsRes.json() : [];

    // Try real API first
    const res = await fetch('/api/faculty/students', {
      headers: { 'x-auth-token': token }
    });
    const students = await res.json();
    
    if (res.ok && students.length) {
      
      // Sort students by Semester (descending) then by Department (alphabetical)
      students.sort((a, b) => {
        const semA = a.sem || 0;
        const semB = b.sem || 0;
        if (semB !== semA) return semB - semA;
        
        const deptA = a.dept || '';
        const deptB = b.dept || '';
        return deptA.localeCompare(deptB);
      });

      box.innerHTML = students.map(s => {
        const studentName = s.student_id ? s.student_id.name : 'Unknown';
        const studentEmail = s.student_id ? s.student_id.email : 'Unknown';
        
        let internshipsHtml = '';
        if (s.student_id) {
          const myApps = apps.filter(a => a.student_id && a.student_id._id === s.student_id._id && a.status === 'Selected');
          
          if (myApps.length > 0) {
            const todayTime = new Date().setHours(0,0,0,0);
            myApps.forEach(a => {
               const int = a.internship_id;
               if (!int) return;
               
               const start = int.start_date ? new Date(int.start_date).setHours(0,0,0,0) : 0;
               const end = int.end_date ? new Date(int.end_date).setHours(0,0,0,0) : 0;
               
               let badge = '';
               let badgeClass = '';
               if (end !== 0 && todayTime > end) {
                 badge = 'Past'; badgeClass = 'bg-gray-100 text-gray-700';
               } else if (start === 0 || todayTime >= start) {
                 badge = 'Ongoing'; badgeClass = 'bg-green-50 text-green-800 border-green-200';
               } else {
                 badge = 'Upcoming'; badgeClass = 'bg-blue-50 text-blue-800 border-blue-200';
               }
               const compName = int.company_id ? int.company_id.name : 'Unknown';
               internshipsHtml += `<span class="inline-block mt-1 mr-2 px-1.5 py-0.5 text-[9px] rounded border ${badgeClass}" title="${int.title} (${compName})">${badge}: ${int.title.substring(0,25)}${int.title.length>25?'...':''}</span>`;
            });
          }
        }
        
        return `
        <div class="border-b py-3 hover:bg-gray-50 transition px-2">
          <div class="flex justify-between items-start">
            <div>
              <div class="font-medium text-gray-800">${studentName}</div>
              <div class="text-xs text-gray-500">${studentEmail}</div>
            </div>
            <div class="text-right flex flex-col items-end align-top">
              <div>
                <span class="inline-block bg-blue-100 text-blue-800 text-[10px] font-semibold px-2 py-0.5 rounded">Sem: ${s.sem || '-'}</span>
                <span class="inline-block bg-gray-100 text-gray-800 text-[10px] font-semibold px-2 py-0.5 rounded ml-1">${s.dept || '-'}</span>
              </div>
              <button class="text-blue-600 hover:text-blue-800 text-[10px] underline edit-student-btn mt-1 font-medium" data-id="${s.student_id ? s.student_id._id : null}">Edit Profile</button>
            </div>
          </div>
          <div class="mt-2 text-[11px] grid grid-cols-2 gap-2 text-gray-600">
            <div><span class="font-medium">CGPA:</span> ${s.cgpa || '-'}</div>
            <div><span class="font-medium">Admission:</span> ${s.admission_no || '-'}</div>
            <div class="col-span-2 text-gray-500 truncate" title="${(s.skills || []).map(k => k.name).join(', ') || '-'}">
              <span class="font-medium">Skills:</span> ${(s.skills || []).map(k => k.name).join(', ') || '-'}
            </div>
          </div>
          ${internshipsHtml ? `<div class="mt-2 text-[11px] border-t border-gray-100 pt-1.5 flex flex-wrap items-center"><span class="font-semibold text-gray-700 mr-2 mt-1">Internships:</span> ${internshipsHtml}</div>` : ''}
        </div>
      `}).join('');
      
      document.querySelectorAll('.edit-student-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          if (!id || id === 'null') return;
          const res = await fetch('/api/faculty/students/' + id, {
            headers: { 'x-auth-token': token }
          });
          if (!res.ok) return alert('Failed to load student details');
          const data = await res.json();
          
          document.getElementById('editStudentId').value = data.user._id;
          document.getElementById('editStudentName').value = data.user.name || '';
          document.getElementById('editStudentEmail').value = data.user.email || '';
          document.getElementById('editStudentPassword').value = '';
          
          if (data.profile) {
            document.getElementById('editStudentAdmNo').value = data.profile.admission_no || '';
            document.getElementById('editStudentBatch').value = data.profile.batch || '';
            document.getElementById('editStudentSem').value = data.profile.sem || '';
            document.getElementById('editStudentBranch').value = data.profile.branch || '';
            document.getElementById('editStudentPhone').value = data.profile.phn || '';
          }
          
          document.getElementById('editStudentModal').classList.remove('hidden');
        });
      });
      return;
    } else {
      box.innerHTML = '<div class="text-gray-500 py-3">No students found.</div>';
      return;
    }
  } catch (e) {
    console.log('API call failed:', e);
    box.innerHTML = '<div class="text-red-500 py-3">Error loading students.</div>';
  }
}

async function loadApplications() {
  const box = document.getElementById('appsContainer');
  
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Try real API first
    const res = await fetch('/api/faculty/applications', {
      headers: { 'x-auth-token': token }
    });
    const apps = await res.json();
    
    if (res.ok && apps.length) {
      renderApps(apps);
      return;
      return;
    } else {
      box.innerHTML = '<div class="text-gray-500 py-3">No applications found.</div>';
      return;
    }
  } catch (e) {
    console.log('API call failed:', e);
    box.innerHTML = '<div class="text-red-500 py-3">Error loading applications.</div>';
  }
}

function renderApps(apps) {
  const box = document.getElementById('appsContainer');
  
  
  if (!apps || apps.length === 0) {
    box.innerHTML = '<div class="text-gray-500 py-3">No applications found.</div>';
    return;
  }

  box.innerHTML = apps.map(app => {
    const studentName = app.student_id ? app.student_id.name : 'Unknown';
    const studentEmail = app.student_id ? app.student_id.email : 'Unknown';
    const dept = app.student_id ? app.student_id.department : app.department;
    
    // Safely parse deeply populated internship object
    let title = 'Unknown Internship';
    let intDept = '-';
    let companyName = 'Unknown Company';
    
    if (app.internship_id) {
        title = app.internship_id.title || title;
        intDept = app.internship_id.admin_dept || dept;
        if (app.internship_id.company_id && app.internship_id.company_id.name) {
            companyName = app.internship_id.company_id.name;
        }
    }

    return `
    <div class="border-b py-3 flex flex-col md:flex-row md:justify-between md:items-center">
      <div class="mb-2 md:mb-0">
        <div class="font-medium text-gray-800">${studentName} <span class="text-gray-500 text-xs font-normal">(${studentEmail})</span></div>
        <div class="text-gray-600 mt-1">${title} at ${companyName}</div>
        <div class="text-gray-500 text-[11px] mt-0.5">Internship Dept: ${intDept || '-'}</div>
        <div class="mt-2 text-[11px]">
          <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded mr-2">Admin: ${app.status}</span>
          <span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Faculty: <span id="faculty-${app._id}" class="font-semibold">${app.facultyApprovalStatus || 'Pending'}</span></span>
        </div>
      </div>
      <div class="flex space-x-2 mt-2 md:mt-0">
         ${app.facultyApprovalStatus === 'Approved' ? `
            <button disabled class="px-3 py-1.5 text-xs bg-green-100 text-green-800 font-semibold border border-green-200 rounded cursor-not-allowed shadow-none">Approved ✓</button>
         ` : app.facultyApprovalStatus === 'Rejected' ? `
            <button disabled class="px-3 py-1.5 text-xs bg-red-100 text-red-800 font-semibold border border-red-200 rounded cursor-not-allowed shadow-none">Rejected ✗</button>
         ` : `
        <button data-id="${app._id}" data-status="Approved"
          class="approveBtn px-3 py-1.5 text-xs bg-green-600 font-medium text-white rounded hover:bg-green-700 transition shadow-sm">
          Approve
        </button>
        <button data-id="${app._id}" data-status="Rejected"
          class="approveBtn px-3 py-1.5 text-xs bg-red-600 font-medium text-white rounded hover:bg-red-700 transition shadow-sm">
          Reject
        </button>
         `}
      </div>
    </div>
  `}).join('');

  // Add click handlers
  document.querySelectorAll('.approveBtn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.dataset.id;
      const status = btn.dataset.status;
      
      // Visual feedback immediately
      const facultySpan = document.getElementById(`faculty-${id}`);
      facultySpan.textContent = status;
      btn.textContent = status + ' ✓';
      btn.disabled = true;
      
      try {
        const token = localStorage.getItem('token');
        // Try real API update
        const res = await fetch(`/api/faculty/applications/${id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'x-auth-token': token
          },
          body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error();
      } catch (e) {
        console.log('API update failed:', e);
      }
      
      setTimeout(() => loadApplications(), 1000);
    });
  });
}

// Load Faculty Header Details
async function loadFacultyProfile() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/me', { headers: { 'x-auth-token': token } });
    if (!res.ok) return;
    const me = await res.json();
    
    const profileName = document.getElementById('profileDropdownName');
    const profileEmail = document.getElementById('profileDropdownEmail');
    const profileDept = document.getElementById('profileDropdownDept');
    const profileAvatar = document.getElementById('profileAvatar');
    
    if (profileName) profileName.textContent = me.name || '';
    if (profileEmail) profileEmail.textContent = me.email || '';
    if (profileDept) profileDept.textContent = me.department || '';
    if (profileAvatar && me.name) {
      profileAvatar.textContent = me.name.charAt(0).toUpperCase();
    }
  } catch(e) {
    console.log('Failed to load faculty profile metadata', e);
  }
}

// Initialize - AUTH REQUIRED
const token = localStorage.getItem('token');
const role = localStorage.getItem('role');

if (!token || !['faculty', 'dept_admin'].includes(role)) {
  alert('Unauthorized Access: You must be a verified Faculty member to view this page.');
  window.location.href = '/login.html';
} else {
  loadFacultyProfile();
  loadStudents();
  loadApplications();
  
  const createStudentForm = document.getElementById('createStudentForm');
  const studentMessage = document.getElementById('studentMessage');
  
  if(createStudentForm) {
    createStudentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(createStudentForm);
      const data = Object.fromEntries(fd.entries());
      
      const res = await fetch('/api/faculty/students', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'x-auth-token': token
         },
         body: JSON.stringify(data)
      });
      
      if (res.ok) {
         studentMessage.textContent = 'Student created and added to your class successfully!';
         studentMessage.classList.remove('hidden', 'text-red-600');
         studentMessage.classList.add('text-green-600');
         createStudentForm.reset();
         loadStudents(); // immediately refresh the list
         setTimeout(() => studentMessage.classList.add('hidden'), 3000);
      } else {
         const err = await res.json();
         studentMessage.textContent = err.error || 'Failed to create student.';
         studentMessage.classList.remove('hidden', 'text-green-600');
         studentMessage.classList.add('text-red-600');
      }
    });
  }
}

// Edit Student Handlers
window.closeEditStudentModal = function() {
  document.getElementById('editStudentModal').classList.add('hidden');
}

const editStudentForm = document.getElementById('editStudentForm');
if (editStudentForm) {
  editStudentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(editStudentForm);
    const payload = Object.fromEntries(fd.entries());
    const id = payload.id;
    delete payload.id;
    if (!payload.password) delete payload.password;

    const res = await fetch('/api/faculty/students/' + id, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeEditStudentModal();
      await loadStudents();
    } else {
      const err = await res.json();
      alert('Error updating student: ' + (err.error || ''));
    }
  });
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
