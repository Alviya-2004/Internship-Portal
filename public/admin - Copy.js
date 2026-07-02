const form = document.getElementById('internshipForm');
const list = document.getElementById('internshipList');
const searchBox = document.getElementById('searchBox');

let allInternships = [];

// ---------- INTERNSHIPS (admin) ----------

function renderInternships(data) {
  list.innerHTML = '';

  if (!data.length) {
    list.innerHTML = '<p class="text-gray-500 text-xs">No internships posted yet.</p>';
    return;
  }

  data.forEach(int => {
    const tags = (int.skills || []).join(', ');
    const deadline = int.deadline
      ? new Date(int.deadline).toLocaleDateString()
      : 'Not specified';

    const card = document.createElement('div');
    card.className =
      'border border-gray-200 rounded-lg p-3 hover:border-red-300 transition flex justify-between items-center';

    card.innerHTML = `
      <div class="space-y-1">
        <div class="flex items-center space-x-2">
          <span class="text-sm font-semibold text-gray-900">${int.title}</span>
          <span class="text-[11px] text-red-700 font-medium px-1.5 py-0.5 bg-red-50 rounded">
            ${int.company}
          </span>
        </div>
        <div class="text-[11px] text-gray-600">
          ${int.department || 'All Departments'} ·
          ${int.location || 'Location flexible'} ·
          ${int.mode || 'Mode not specified'}
        </div>
        <div class="text-[11px] text-gray-600">
          Stipend: ${int.stipend || 'N/A'} · Duration: ${int.duration || 'N/A'}
        </div>
        <div class="text-[11px] text-gray-500">
          Skills: ${tags || 'Not specified'}
        </div>
        <div class="text-[11px] text-gray-500">
          Deadline: <span class="text-gray-800 font-medium">${deadline}</span>
        </div>
      </div>
      <div class="flex flex-col items-end space-y-1">
        ${
          int.link
            ? `<a href="${int.link}" target="_blank"
                 class="text-xs text-red-700 border border-red-200 px-2 py-0.5 rounded hover:bg-red-50">
                 View Form
               </a>`
            : ''
        }
        <span class="text-[10px] text-gray-400">
          ID: ${int._id.slice(-6)}
        </span>
      </div>
    `;

    list.appendChild(card);
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

  payload.skills = payload.skills
    ? payload.skills.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const res = await fetch('/api/internships', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    form.reset();
    await loadInternships();
  } else {
    alert('Error saving internship');
  }
});

// simple search on title/company
if (searchBox) {
  searchBox.addEventListener('input', () => {
    const q = searchBox.value.toLowerCase();
    const filtered = allInternships.filter(int =>
      (int.title || '').toLowerCase().includes(q) ||
      (int.company || '').toLowerCase().includes(q)
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

  const res = await fetch('/api/applications?' + params.toString());
  const apps = await res.json();

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

    const appliedAt = app.appliedAt
      ? new Date(app.appliedAt).toLocaleString()
      : '-';

    row.innerHTML = `
      <td class="px-3 py-2">
        <div class="font-semibold text-gray-900">${app.studentName}</div>
        <div class="text-[11px] text-gray-500">${app.studentEmail}</div>
      </td>
      <td class="px-3 py-2 text-[11px] text-gray-700">
        ${app.department || '-'}<br>
        CGPA: ${app.cgpa ?? '-'}
      </td>
      <td class="px-3 py-2 text-[11px] text-gray-700">
        ${app.internshipId?.title || '-'}<br>
        <span class="text-gray-500">${app.internshipId?.company || ''}</span>
      </td>
      <td class="px-3 py-2 text-[11px] text-gray-700">
        ${(app.skills || []).join(', ') || '-'}
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
          headers: { 'Content-Type': 'application/json' },
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

// initial loads
loadApplications();
loadInternships();
