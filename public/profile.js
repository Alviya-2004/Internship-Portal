const pfName = document.getElementById('pfName');
const pfEmail = document.getElementById('pfEmail');
const pfDept = document.getElementById('pfDept');
const pfCgpa = document.getElementById('pfCgpa');
const pfAdmNo = document.getElementById('pfAdmNo');
const pfBranch = document.getElementById('pfBranch');
const pfBatch = document.getElementById('pfBatch');
const pfSem = document.getElementById('pfSem');
const pfPhn = document.getElementById('pfPhn');
const pfLinkedin = document.getElementById('pfLinkedin');
const pfDomains = document.getElementById('pfDomains');
const pfProjects = document.getElementById('pfProjects');
const pfResume = document.getElementById('pfResume');
const pfGithub = document.getElementById('pfGithub');
const pfPortfolio = document.getElementById('pfPortfolio');
const profileForm = document.getElementById('profileForm');
const profileMessage = document.getElementById('profileMessage');
const domainSkillsList = document.getElementById('domainSkillsList');
const addDomainSkillsBtn = document.getElementById('addDomainSkills');

let domainSkillsInputs = {}; // {domainId: inputElement}

// Show skills input for selected domains
addDomainSkillsBtn.addEventListener('click', () => {
  const selectedDomains = Array.from(pfDomains.selectedOptions).map(opt => opt.value);
  if (selectedDomains.length === 0) {
    alert('Select domains first!');
    return;
  }

  selectedDomains.forEach(domainId => {
    if (!domainSkillsInputs[domainId]) {
      const div = document.createElement('div');
      div.className = 'p-2 border rounded bg-gray-50';
      div.innerHTML = `
        <div class="font-medium text-[11px] mb-1">${domainId.replace(/^\w/, c => c.toUpperCase())} Skills:</div>
        <input data-domain="${domainId}" class="domain-skills border rounded px-2 py-1 w-full text-[11px]" 
               placeholder="React, Node.js (comma separated)">
        <button type="button" class="text-red-600 text-[10px] mt-1 underline remove-domain" data-domain="${domainId}">Remove</button>
      `;
      domainSkillsList.appendChild(div);
      domainSkillsInputs[domainId] = div.querySelector('.domain-skills');
    }
  });
});

// Remove domain skills input
domainSkillsList.addEventListener('click', (e) => {
  if (e.target.classList.contains('remove-domain')) {
    const domainId = e.target.dataset.domain;
    const div = e.target.closest('div');
    div.remove();
    delete domainSkillsInputs[domainId];
  }
});

async function loadCurrentProfile() {
  // ... same login check as before ...
  
  const meRes = await fetch('/api/me', { headers: { 'x-auth-token': localStorage.getItem('token') } });
  if (!meRes.ok) {
    alert('Session expired. Please log in again.');
    window.location.href = '/login.html';
    return;
  }
  
  const me = await meRes.json();
  
  pfName.value = me.name || '';
  pfEmail.value = me.email || '';

  const profileRes = await fetch(`/api/profile`, { headers: { 'x-auth-token': localStorage.getItem('token') } });
  const profile = await profileRes.json();
  
  if (profile) {
    pfName.value = profile.studentName || me.name;
    pfEmail.value = profile.studentEmail || me.email;

    pfDept.value = profile.department || '';
    pfCgpa.value = profile.cgpa || '';
    pfAdmNo.value = profile.admission_no || '';
    pfBranch.value = profile.branch || '';
    pfBatch.value = profile.batch || '';
    pfSem.value = profile.sem || '';
    pfPhn.value = profile.phn || '';
    pfLinkedin.value = profile.linkedin || '';
    
    pfProjects.value = (profile.projects || []).map(p => p.title).join('\n');
    pfResume.value = profile.resume_url || '';
    pfGithub.value = profile.githubUrl || '';
    pfPortfolio.value = profile.portfolioUrl || '';
    
    // NEW: Select domains
    if (profile.domains) {
      Array.from(pfDomains.options).forEach(opt => {
        if (profile.domains.some(d => d._id === opt.value || d === opt.value)) {
          opt.selected = true;
        }
      });
      // Load existing domain skills correctly from the backend structure
      if(profile.domainSkills) {
        Object.entries(profile.domainSkills).forEach(([domainId, skillsArr]) => {
          if (!domainSkillsInputs[domainId]) {
            const div = document.createElement('div');
            div.className = 'p-2 border rounded bg-gray-50';
            div.innerHTML = `
              <div class="font-medium text-[11px] mb-1">${domainId.replace(/^\w/, c => c.toUpperCase())} Skills:</div>
              <input data-domain="${domainId}" class="domain-skills border rounded px-2 py-1 w-full text-[11px]" 
                     value="${skillsArr.join(', ')}">
              <button type="button" class="text-red-600 text-[10px] mt-1 underline remove-domain" data-domain="${domainId}">Remove</button>
            `;
            domainSkillsList.appendChild(div);
            domainSkillsInputs[domainId] = div.querySelector('.domain-skills');
          }
        });
      }
    }
  }
}

profileForm.addEventListener('submit', async e => {
  e.preventDefault();

  const selectedDomains = Array.from(pfDomains.selectedOptions).map(opt => opt.value);
  // (Optional) removed strict domain requirement

  // NEW: Skills per domain
  const domainSkills = {};
  document.querySelectorAll('.domain-skills').forEach(input => {
    const domainId = input.dataset.domain;
    const skills = input.value.split(',').map(s => s.trim()).filter(Boolean);
    if (skills.length > 0) {
      domainSkills[domainId] = skills;
    }
  });

  // (Optional) removed strict skill requirement

  const body = {
    // we don't send studentName / studentEmail because they are auto-fetched securely in the backend via token
    department: pfDept.value.trim(),
    cgpa: pfCgpa.value ? Number(pfCgpa.value) : undefined,
    admission_no: pfAdmNo.value.trim(),
    branch: pfBranch.value.trim(),
    batch: pfBatch.value.trim(),
    sem: pfSem.value ? Number(pfSem.value) : undefined,
    phn: pfPhn.value.trim(),
    linkedin: pfLinkedin.value.trim(),
    
    domains: selectedDomains,
    domainSkills,  
    projects: pfProjects.value.split('\n').filter(Boolean).map(line => ({ title: line.trim() })),
    resume_url: pfResume.value.trim(),
    githubUrl: pfGithub.value.trim(),
    portfolioUrl: pfPortfolio.value.trim(),
  };

  const res = await fetch('/api/profile', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-auth-token': localStorage.getItem('token')
    },
    body: JSON.stringify(body),
  });

  profileMessage.textContent = res.ok ? 'Profile saved with domain skills!' : 'Error';
  profileMessage.className = res.ok ? 'text-green-700' : 'text-red-700';
});

async function loadInternships() {
  const container = document.getElementById('studentInternshipsContainer');
  if (!container) return;
  
  try {
    const res = await fetch('/api/my-applications', {
      headers: { 'x-auth-token': localStorage.getItem('token') },
    });
    if (!res.ok) throw new Error();
    const apps = await res.json();
    
    // An internship is considered theirs if the admin marked it 'Selected'
    const selectedApps = apps.filter(a => a.status === 'Selected');
    if (selectedApps.length === 0) {
      container.innerHTML = '<div class="text-gray-500">No ongoing or past internships found.</div>';
      return;
    }
    
    // Ignore time by zeroing it out, just compare dates conceptually
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayTime = today.getTime();
    
    let html = '';
    
    selectedApps.forEach(app => {
      const int = app.internship_id;
      if (!int) return;
      
      const start = int.start_date ? new Date(int.start_date) : null;
      if (start) start.setHours(0,0,0,0);
      const startTime = start ? start.getTime() : 0;
      
      const end = int.end_date ? new Date(int.end_date) : null;
      if (end) end.setHours(0,0,0,0);
      const endTime = end ? end.getTime() : 0;
      
      let badge = '';
      if (endTime !== 0 && todayTime > endTime) {
        badge = '<span class="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-semibold ml-2">Past Internship</span>';
      } else if (startTime === 0 || todayTime >= startTime) {
        badge = '<span class="bg-green-100 text-green-800 px-2 py-0.5 rounded text-[10px] font-semibold ml-2 border border-green-200">Ongoing Internship</span>';
      } else {
        badge = '<span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-semibold ml-2 border border-blue-200">Upcoming Internship</span>';
      }
      
      html += `
        <div class="border rounded p-3 bg-gray-50 flex justify-between items-start">
          <div>
            <div class="font-semibold text-gray-800 flex items-center">${int.title} ${badge}</div>
            <div class="text-red-700 font-medium text-[11px] mt-0.5">${int.company_id ? int.company_id.name : 'Unknown Company'}</div>
          </div>
          <div class="text-right text-[10px] text-gray-500 mt-1 sm:mt-0">
            ${int.start_date ? new Date(int.start_date).toLocaleDateString() : 'TBD'} - 
            ${int.end_date ? new Date(int.end_date).toLocaleDateString() : 'TBD'}
          </div>
        </div>
      `;
    });
    
    if (!html) html = '<div class="text-gray-500">No internship data available.</div>';
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = '<div class="text-red-500">Error loading internships.</div>';
  }
}

loadCurrentProfile();
loadInternships();
