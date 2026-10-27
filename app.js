/**
 * HustleLokal - Frontend Engine Connected to PHP & MySQL API
 */

let dbProjects = [];
let dbUsers = [];
let dbBids = [];

let currentSelectedProjectId = null;

document.addEventListener('DOMContentLoaded', () => {
  loadDataFromMySQL();
  updateUserNavUI();
});

// 1. KONEKSI & AMBIL DATA LANGSUNG DARI MYSQL
async function loadDataFromMySQL() {
  try {
    const response = await fetch('api.php?action=get_all_data');
    const data = await response.json();

    if (data.status === 'success') {
      dbProjects = data.projects;
      dbUsers = data.users;
      dbBids = data.bids;
      refreshAllUI();
    }
  } catch (error) {
    console.error('Gagal mengambil data dari MySQL:', error);
  }
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('mantis_current_user')) || null;
}

function refreshAllUI() {
  renderHomeProjects();
  renderBrowseProjects();
  renderStats();
  renderAdminTables();
  renderClientDashboard();
  renderFreelancerDashboard();
}

function formatRupiah(num) {
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

// 2. USER NAVBAR AUTH UI
function updateUserNavUI() {
  const user = getCurrentUser();
  const authGroup = document.getElementById('auth-buttons-group');
  const loggedGroup = document.getElementById('logged-user-group');
  const btnUserProfile = document.getElementById('btn-user-profile');

  if (user) {
    authGroup.style.display = 'none';
    loggedGroup.style.display = 'flex';
    btnUserProfile.innerText = `${user.name} (${user.role})`;
  } else {
    authGroup.style.display = 'flex';
    loggedGroup.style.display = 'none';
  }
}

function goToUserDashboard() {
  const user = getCurrentUser();
  if (!user) return;

  if (user.role === 'Klien') switchView('dashboard-klien');
  else if (user.role === 'Freelancer') switchView('dashboard-freelancer');
  else if (user.role === 'Admin') switchView('dashboard-admin');
}

function handleLogout() {
  localStorage.removeItem('mantis_current_user');
  updateUserNavUI();
  alert('Anda telah keluar dari akun.');
  switchView('home');
}

// 3. LOGIN VIA PHP & MYSQL
async function handleLoginSubmit(e) {
  e.preventDefault();
  const roleSelect = document.getElementById('login-role').value;
  const emailInput = document.getElementById('login-email').value.trim();
  const passwordInput = document.getElementById('login-password').value;

  try {
    const res = await fetch('api.php?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: roleSelect, email: emailInput, password: passwordInput })
    });
    const result = await res.json();

    if (result.status === 'success') {
      localStorage.setItem('mantis_current_user', JSON.stringify(result.user));
      updateUserNavUI();
      closeModal();
      alert(`Selamat datang kembali, ${result.user.name}!`);

      await loadDataFromMySQL();

      goToUserDashboard();
    } else {
      alert(result.message);
    }
  } catch (err) {
    alert('Koneksi ke api.php gagal. Pastikan file api.php dan db.php sudah ada di folder htdocs.');
  }
}

// 4. REGISTER VIA PHP & MYSQL
async function handleRegisterSubmit(e, role) {
  e.preventDefault();
  const form = e.target;
  const name = form.querySelector('.reg-fullname').value.trim();
  const email = form.querySelector('.reg-email').value.trim();
  const password = form.querySelector('.reg-password').value;

  try {
    const res = await fetch('api.php?action=register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email, password: password, role: role })
    });
    const result = await res.json();

    if (result.status === 'success') {
      localStorage.setItem('mantis_current_user', JSON.stringify(result.user));
      updateUserNavUI();
      closeModal();
      alert(`Pendaftaran Akun ${role} Berhasil tersimpan di MySQL!`);
      await loadDataFromMySQL();
      goToUserDashboard();
    } else {
      alert(result.message);
    }
  } catch (err) {
    alert('Gagal mendaftar ke server.');
  }
}

// 5. POSTING PROYEK BARU KE MYSQL
async function handlePostProject(e) {
  e.preventDefault();
  const user = getCurrentUser();

  if (!user || user.role !== 'Klien') {
    alert('Hanya akun Klien yang dapat memasukkan proyek!');
    return;
  }

  // Ambil semua checkbox yang dicentang lalu gabungkan dengan koma
  const checkedCats = Array.from(document.querySelectorAll('.cat-checkbox:checked')).map(cb => cb.value);
  
  if (checkedCats.length === 0) {
    alert('Pilih minimal satu kategori!');
    return;
  }

  const payload = {
    clientId: user.id,
    title: document.getElementById('post-title').value,
    category: checkedCats.join(', '), // Hasilnya misal: "Desain, Video"
    deadline: document.getElementById('post-deadline').value,
    budgetMin: parseInt(document.getElementById('post-budget-min').value),
    budgetMax: parseInt(document.getElementById('post-budget-max').value),
    description: document.getElementById('post-desc').value
  };

  try {
    const res = await fetch('api.php?action=create_project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.status === 'success') {
      alert('Proyek berhasil disimpan ke Database MySQL!');
      document.getElementById('post-project-form').reset();
      await loadDataFromMySQL();
      switchView('browse');
    } else {
      alert(result.message);
    }
  } catch (err) {
    alert('Gagal menyimpan proyek ke MySQL.');
  }
}

// 6. KIRIM PENAWARAN (BID) KE MYSQL
async function handlePostBid(e) {
  e.preventDefault();
  const user = getCurrentUser();

  if (!user || user.role !== 'Freelancer') {
    alert('Hanya Freelancer yang dapat mengirim penawaran!');
    return;
  }

  const payload = {
    projectId: currentSelectedProjectId,
    freelancerId: user.id,
    price: parseInt(document.getElementById('bid-price').value),
    proposal: document.getElementById('bid-proposal').value
  };

  try {
    const res = await fetch('api.php?action=create_bid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.status === 'success') {
      alert('Proposal penawaran berhasil tersimpan di MySQL!');
      document.getElementById('bid-price').value = '';
      document.getElementById('bid-proposal').value = '';
      await loadDataFromMySQL();
      openProjectDetail(currentSelectedProjectId);
    } else {
      alert(result.message);
    }
  } catch (err) {
    alert('Gagal mengirim penawaran.');
  }
}

// Fungsi untuk mengirim data ke API saat klien memilih freelancer
async function acceptBid(projectId, freelancerName) {
  if (!confirm(`Yakin ingin memilih ${freelancerName} untuk mengerjakan proyek ini?`)) {
    return;
  }
  
  try {
    const res = await fetch('api.php?action=accept_bid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: projectId, freelancerName: freelancerName })
    });
    const result = await res.json();

    if (result.status === 'success') {
      alert(`Berhasil! Proyek kini dikerjakan oleh ${freelancerName}.`);
      await loadDataFromMySQL(); // Refresh data terbaru
      openProjectDetail(projectId); // Reload halaman detail
    } else {
      alert(result.message);
    }
  } catch (err) {
    alert('Gagal terhubung ke server saat menyetujui penawaran.');
  }
}


// RENDER & NAVIGASI
function openProjectDetail(id) {
  const p = dbProjects.find(item => item.id === id);
  if (!p) return;

  currentSelectedProjectId = p.id;
  const user = getCurrentUser();

  // Update informasi dasar proyek
  document.getElementById('detail-category').innerText = p.category;
  document.getElementById('detail-status').innerText = p.status;
  document.getElementById('detail-title').innerText = p.title;
  document.getElementById('detail-client').innerText = p.client;
  document.getElementById('detail-budget').innerText = `${formatRupiah(p.budgetMin)} – ${formatRupiah(p.budgetMax)}`;
  document.getElementById('detail-deadline').innerText = p.deadline;
  document.getElementById('detail-description').innerText = p.description;

  const bidSection = document.getElementById('freelancer-bid-section');
  const alertBox = document.getElementById('bid-restricted-info');
  const alertMsg = document.getElementById('bid-restricted-msg');
  
  const actionButtons = document.getElementById('project-action-buttons');
  const btnComplete = document.getElementById('btn-complete-project');
  const btnCancel = document.getElementById('btn-cancel-freelancer');

  // Deteksi status proyek (Dideklarasikan SEKALI saja di sini)
  const isOpen = (p.status === 'Buka penawaran');
  const isProjectOwner = (user && user.role === 'Klien' && p.clientId === user.id);
  const isWorking = p.status.includes('Dikerjakan');

  // Logika tampilan form penawaran dan tombol selesai
  // Logika tampilan form penawaran dan tombol selesai
if (!isOpen) {
    bidSection.style.display = 'none';
    alertBox.style.display = 'block';
    
    // Jika user adalah Klien yang punya proyek & status Dikerjakan
    if (isProjectOwner && isWorking) {
        alertMsg.innerHTML = `Proyek ini sedang <strong>${p.status}</strong>.`;
        actionButtons.style.display = 'flex';
        
        // Attach event listener
        btnComplete.onclick = () => completeProject(p.id);
        btnCancel.onclick = () => cancelFreelancer(p.id);
    } else {
        // Status Selesai atau user bukan owner
        alertMsg.innerHTML = `Proyek ini sudah ditutup atau sedang dikerjakan.`;
        actionButtons.style.display = 'none';
    }
} else if (user && user.role === 'Freelancer') {
    bidSection.style.display = 'block';
    alertBox.style.display = 'none';
    document.getElementById('bid-freelancer-name').value = user.name;
} else if (!user) {
    bidSection.style.display = 'none';
    alertBox.style.display = 'block';
    alertMsg.innerHTML = 'Silakan <strong><a href="#" onclick="openModal(\'login\')">Masuk</a></strong> sebagai <strong>Freelancer</strong> untuk mengirim proposal penawaran.';
} else {
    bidSection.style.display = 'none';
    alertBox.style.display = 'block';
    alertMsg.innerHTML = `Akun Anda adalah <strong>${user.role}</strong>. Hanya akun <strong>Freelancer</strong> yang dapat mengirim proposal penawaran.`;
}

  // Logika tampilan daftar penawaran (bids)
  const bids = dbBids.filter(b => b.projectId === p.id);
  document.getElementById('detail-bids-count').innerText = `${bids.length} Penawaran`;

  const bidsContainer = document.getElementById('project-bids-list');

  if (bids.length === 0) {
    bidsContainer.innerHTML = `<p class="text-gray text-xs" style="margin-top:10px;">Belum ada penawaran masuk.</p>`;
  } else {
    bidsContainer.innerHTML = bids.map(b => `
      <div class="bid-item-card margin-top-sm">
        <div style="display:flex; justify-content:space-between; font-weight:700;">
          <span>👤 ${b.freelancerName}</span>
          <span class="price-coral">${formatRupiah(b.price)}</span>
        </div>
        <p class="text-xs margin-top-xs" style="color:#374151;">"${b.proposal}"</p>
        
        <!-- Render tombol pilih hanya untuk Klien pemilik proyek -->
        ${(isProjectOwner && isOpen) ? `
          <button class="btn btn-navy btn-sm margin-top-sm" onclick="acceptBid(${p.id}, '${b.freelancerName}')">Pilih Freelancer Ini</button>
        ` : ''}
      </div>
    `).join('');
  }

  switchView('detail');
}

async function cancelFreelancer(projectId) {
    if (!confirm('⚠️ PERHATIAN!\n\nAnda akan membatalkan freelancer yang sedang mengerjakan proyek ini.\n\nSetelah dibatalkan:\n• Status proyek akan kembali menjadi "Buka penawaran"\n• Freelancer yang dipilih akan kehilangan akses ke proyek ini\n• Freelancer lain dapat mengirim penawaran baru\n\nApakah Anda yakin ingin melanjutkan?')) {
        return;
    }
    
    try {
        const res = await fetch('api.php?action=cancel_freelancer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: projectId })
        });
        const result = await res.json();
        
        if (result.status === 'success') {
            alert('✅ Freelancer berhasil dibatalkan. Proyek kini kembali membuka penawaran.');
            await loadDataFromMySQL();
            openProjectDetail(projectId);
        } else {
            alert(result.message);
        }
    } catch (err) {
        alert('Gagal menghubungi server saat membatalkan freelancer.');
    }
}

function renderStats() {
  document.getElementById('stat-total-projects').innerText = dbProjects.length;
  document.getElementById('stat-total-users').innerText = dbUsers.length;
  document.getElementById('stat-total-bids').innerText = dbBids.length;
  document.getElementById('stat-hero-projects').innerText = `${dbProjects.length} proyek aktif`;
  document.getElementById('stat-hero-users').innerText = `${dbUsers.length} pengguna`;

  if (dbProjects.length > 0) {
    const latest = dbProjects[0];
    document.getElementById('featured-title').innerText = latest.title;
    document.getElementById('featured-desc').innerText = latest.description;
    document.getElementById('featured-cat').innerText = latest.category;
    document.getElementById('featured-budget').innerText = `${formatRupiah(latest.budgetMin)} - ${formatRupiah(latest.budgetMax)}`;
  }
}

function renderHomeProjects() {
  const container = document.getElementById('home-projects-list');
  if (!container) return;

  const activeProjects = dbProjects.filter(p => p.status !== 'Selesai');
  
  const latestThree = activeProjects.slice(0, 3);
  
  if (latestThree.length === 0) {
    container.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#6B7280; padding:20px;">Belum ada proyek aktif terdaftar di MySQL.</p>`;
    return;
  }
  
  container.innerHTML = latestThree.map(p => createProjectCardHTML(p)).join('');
}

function renderBrowseProjects() {
  const container = document.getElementById('browse-projects-list');
  if (!container) return;
  
  const keyword = document.getElementById('search-keyword')?.value.toLowerCase() || '';
  const categorySelect = document.getElementById('category-filter')?.value || 'semua';
  
  let filtered = dbProjects.filter(p => {
    // FILTER: Sembunyikan proyek yang sudah "Selesai"
    const isActive = p.status !== 'Selesai';
    const matchKey = p.title.toLowerCase().includes(keyword) || p.description.toLowerCase().includes(keyword);
    const matchCat = (categorySelect === 'semua') || p.category.includes(categorySelect);
    return isActive && matchKey && matchCat;
  });
  
  if (filtered.length === 0) {
    container.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#6B7280; padding:20px;">Proyek tidak ditemukan.</p>`;
    return;
  }
  
  container.innerHTML = filtered.map(p => createProjectCardHTML(p)).join('');
}

function createProjectCardHTML(p) {
  return `
    <div class="project-card">
      <div>
        <div class="card-meta">
          <span class="badge-tag-yellow">${p.category}</span>
          <span class="badge-status-pink">${p.status}</span>
        </div>
        <h3 class="proj-title">${p.title}</h3>
        <p class="proj-desc">${p.description}</p>
      </div>
      <div>
        <div class="proj-client-row">
          <span class="proj-lbl">Client</span>
          <span class="proj-val">${p.client}</span>
        </div>
        <div class="proj-budget-row">
          <span class="proj-lbl">Budget</span>
          <span class="proj-val price-coral">${formatRupiah(p.budgetMin)} – ${formatRupiah(p.budgetMax).replace('Rp ', '')}</span>
        </div>
        <button class="btn btn-coral w-100 margin-top-sm" onclick="openProjectDetail(${p.id})">Detail / Tawari</button>
      </div>
    </div>
  `;
}

function renderClientDashboard() {
  const user = getCurrentUser();
  const container = document.getElementById('client-projects-list');
  if (!container) return;

  if (!user || user.role !== 'Klien') {
    container.innerHTML = `<p class="text-gray text-sm">Silakan login sebagai Klien untuk melihat daftar proyek Anda.</p>`;
    return;
  }

  document.getElementById('dash-client-name').innerText = `Dashboard Klien — ${user.name}`;

  const myProjects = dbProjects.filter(p => p.clientId === user.id || p.client === user.name);
  if (myProjects.length === 0) {
    container.innerHTML = `<p class="text-gray text-sm">Anda belum pernah memposting proyek di database.</p>`;
    return;
  }

  container.innerHTML = myProjects.map(p => `
    <div style="border:1px solid #E5E0D2; padding:16px; border-radius:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong>${p.title}</strong>
        <p class="text-xs text-gray">${p.category} | ${formatRupiah(p.budgetMin)} - ${formatRupiah(p.budgetMax)}</p>
      </div>
      <button class="btn btn-navy btn-sm" onclick="openProjectDetail(${p.id})">Lihat Proyek</button>
    </div>
  `).join('');
}

function renderFreelancerDashboard() {
  const user = getCurrentUser();
  const container = document.getElementById('freelancer-bids-list');
  if (!container) return;

  if (!user || user.role !== 'Freelancer') {
    container.innerHTML = `<p class="text-gray text-sm">Silakan login sebagai Freelancer untuk melihat penawaran Anda.</p>`;
    return;
  }

  document.getElementById('dash-freelancer-name').innerText = `Dashboard Freelancer — ${user.name}`;

  const myBids = dbBids.filter(b => b.freelancerId === user.id || b.freelancerName === user.name);
  if (myBids.length === 0) {
    container.innerHTML = `<p class="text-gray text-sm">Anda belum pernah mengirim proposal penawaran.</p>`;
    return;
  }

  container.innerHTML = myBids.map(b => `
    <div style="border:1px solid #E5E0D2; padding:16px; border-radius:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong>Proposal: ${formatRupiah(b.price)}</strong>
        <p class="text-xs text-gray">Pesan: "${b.proposal}"</p>
      </div>
      <button class="btn btn-navy btn-sm" onclick="openProjectDetail(${b.projectId})">Buka Proyek</button>
    </div>
  `).join('');
}

function renderAdminTables() {
  const uTable = document.getElementById('admin-user-table');
  if (uTable) {
    uTable.innerHTML = dbUsers.map(u => `
      <tr>
        <td>${u.id}</td>
        <td><strong>${u.name}</strong></td>
        <td>${u.email}</td>
        <td><span class="badge-tag-yellow">${u.role}</span></td>
        <td>${u.role !== 'Admin' ? `<button class="btn btn-coral btn-sm" onclick="deleteUser(${u.id})">Hapus</button>` : '-'}</td>
      </tr>
    `).join('');
  }

  const pTable = document.getElementById('admin-project-table');
  if (pTable) {
    pTable.innerHTML = dbProjects.map(p => `
      <tr>
        <td>${p.id}</td>
        <td><strong>${p.title}</strong></td>
        <td>${p.category}</td>
        <td>${p.client}</td>
        <td>${formatRupiah(p.budgetMax)}</td>
        <td><button class="btn btn-coral btn-sm" onclick="deleteProject(${p.id})">Hapus</button></td>
      </tr>
    `).join('');
  }
}

async function deleteProject(id) {
  await fetch('api.php?action=delete_project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: id })
  });
  loadDataFromMySQL();
}

async function deleteUser(id) {
  await fetch('api.php?action=delete_user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: id })
  });
  loadDataFromMySQL();
}

function switchView(viewId) {
  const user = getCurrentUser();

  if (viewId === 'post') {
    if (!user) {
      alert('Silakan Masuk terlebih dahulu.');
      openModal('login');
      return;
    }
    if (user.role !== 'Klien') {
      alert('Hanya akun Klien yang dapat memposting proyek.');
      return;
    }
    document.getElementById('post-client').value = user.name;
  }

  if (viewId === 'dashboard-klien' && (!user || user.role !== 'Klien')) {
    alert('Halaman ini khusus untuk akun Klien.');
    return;
  }
  if (viewId === 'dashboard-freelancer' && (!user || user.role !== 'Freelancer')) {
    alert('Halaman ini khusus untuk akun Freelancer.');
    return;
  }
  if (viewId === 'dashboard-admin' && (!user || user.role !== 'Admin')) {
    alert('Halaman ini khusus untuk Administrator.');
    return;
  }

  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  const target = document.getElementById(`view-${viewId}`);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
  const navBtn = document.getElementById(`nav-${viewId}`);
  if (navBtn) navBtn.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}


function openModal(modalType) {
  document.getElementById('auth-modal').classList.add('active');
  document.querySelectorAll('.modal-view').forEach(m => m.classList.remove('active'));
  const target = document.getElementById(`modal-content-${modalType}`);
  if (target) target.classList.add('active');
}

function closeModal() {
  document.getElementById('auth-modal').classList.remove('active');
}

function closeModalOnOverlay(e) {
  if (e.target.id === 'auth-modal') closeModal();
}

function resetFilters() {
  document.getElementById('search-keyword').value = '';
  document.getElementById('category-filter').value = 'semua';
  renderBrowseProjects();
}

async function completeProject(projectId) {
  if (!confirm('Apakah freelancer sudah mengirimkan hasil kerja dan Anda ingin menyelesaikan proyek ini?')) {
    return;
  }
  
  try {
    const res = await fetch('api.php?action=complete_project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: projectId })
    });
    const result = await res.json();

    if (result.status === 'success') {
      alert('Proyek berhasil diselesaikan!');
      await loadDataFromMySQL();
      openProjectDetail(projectId);
    } else {
      alert(result.message);
    }
  } catch (err) {
    alert('Gagal menghubungi server.');
  }
}

function handleCariCuanClick() {
  const user = getCurrentUser();

  if (user && user.role === 'Klien') {
    alert('Akun Klien difokuskan untuk membuat proyek. Silakan gunakan akun Freelancer jika Anda ingin mencari cuan (mengambil proyek).');
    return;
  }

  switchView('browse');
}