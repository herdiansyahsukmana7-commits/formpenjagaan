/**
 * assets/js/auth.js
 * E-Cuti Dinas Kesehatan Kota Tangerang Selatan
 * Modul Proteksi Sesi & Autentikasi Pengguna Multi-Role:
 * 1. Super Admin (Akses Penuh: Dashboard, Form Input, Cetak Surat, Master Pegawai, Edit Manual Saldo Cuti N-2/N-1/N)
 * 2. Admin Penginput (Akses Dashboard, Form Input, Cetak Surat, Riwayat)
 * 3. User / Pegawai Penginput (Hanya Akses Formulir Pengajuan Cuti & Riwayat Pengajuannya)
 */

const DEFAULT_ACCOUNTS = [
  {
    role: 'superadmin',
    nama: 'Super Admin Kepegawaian',
    username: 'superadmin',
    password: 'superadmin123',
    badge: 'SUPER ADMIN'
  },
  {
    role: 'admin',
    nama: 'Admin Kepegawaian',
    username: 'admin',
    password: 'dinkes123',
    badge: 'ADMIN'
  },
  {
    role: 'user',
    nama: 'Staf Penginput Cuti',
    username: 'user',
    password: 'user123',
    badge: 'USER PENGINPUT'
  }
];

function getAccountsList() {
  const saved = localStorage.getItem('DINKES_USER_ACCOUNTS');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  return DEFAULT_ACCOUNTS;
}

function saveAccountsList(list) {
  localStorage.setItem('DINKES_USER_ACCOUNTS', JSON.stringify(list));
}

// Info sesi aktif
let currentUserSession = JSON.parse(sessionStorage.getItem('DINKES_CURRENT_USER') || 'null');

function getCurrentUser() {
  if (!currentUserSession) {
    currentUserSession = JSON.parse(sessionStorage.getItem('DINKES_CURRENT_USER') || 'null');
  }
  return currentUserSession;
}

function isSuperAdmin() {
  const u = getCurrentUser();
  return u && u.role === 'superadmin';
}

function isAdminOrSuper() {
  const u = getCurrentUser();
  return u && (u.role === 'superadmin' || u.role === 'admin');
}

function isUserOnly() {
  const u = getCurrentUser();
  return u && u.role === 'user';
}

function checkAuthSession() {
  const loginScreen = document.getElementById('loginScreen');
  const u = getCurrentUser();

  if (state.isLoggedIn && u) {
    if (loginScreen) loginScreen.classList.add('hidden');
    applyRolePermissions(u);
  } else {
    if (loginScreen) loginScreen.classList.remove('hidden');
    setTimeout(() => {
      const userInp = document.getElementById('loginUsername');
      if (userInp) userInp.focus();
    }, 100);
  }
}

function applyRolePermissions(user) {
  // Update info user di Topbar & Sidebar
  const sidebarNama = document.getElementById('sidebarPetugasNama');
  const userBadgeEl = document.getElementById('currentUserRoleBadge');
  const mobileUserBadge = document.getElementById('mobileUserRoleBadge');
  const mobileUserName = document.getElementById('mobileUserName');

  if (sidebarNama) sidebarNama.textContent = user.nama || user.username;
  if (mobileUserName) mobileUserName.textContent = user.nama || user.username;

  let badgeColor = 'bg-teal-500/20 text-teal-300 border-teal-500/30';
  if (user.role === 'superadmin') {
    badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
  } else if (user.role === 'admin') {
    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  }

  const badgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${badgeColor}">${escapeHtml(user.badge || user.role)}</span>`;
  if (userBadgeEl) userBadgeEl.innerHTML = badgeHtml;
  if (mobileUserBadge) mobileUserBadge.innerHTML = badgeHtml;

  // Batasi Navigasi jika role 'user' (Hanya untuk penginputan pengajuan cuti saja)
  const navDaftar = document.getElementById('nav-daftar');
  const navLaporan = document.getElementById('nav-laporan');
  const navPegawai = document.getElementById('nav-pegawai');
  const navRekap = document.getElementById('nav-rekap');
  const navConfig = document.getElementById('nav-config');
  const adminSections = document.querySelectorAll('.admin-only-feature');
  const superAdminElements = document.querySelectorAll('.superadmin-only');

  if (user.role === 'user') {
    // Sembunyikan master data pegawai, cetak laporan dinas, konfigurasi API
    if (navPegawai) navPegawai.classList.add('hidden');
    if (navLaporan) navLaporan.classList.add('hidden');
    if (navConfig) navConfig.classList.add('hidden');

    adminSections.forEach(el => el.classList.add('hidden'));
    superAdminElements.forEach(el => el.classList.add('hidden'));

    // Jika user berada di menu terlarang, kembalikan ke dashboard / daftar permohonan
    if (['pegawai', 'laporan'].includes(state.activeMenu)) {
      switchMenu('dashboard');
    }
  } else {
    if (navPegawai) navPegawai.classList.remove('hidden');
    if (navLaporan) navLaporan.classList.remove('hidden');
    if (navConfig) navConfig.classList.remove('hidden');

    adminSections.forEach(el => el.classList.remove('hidden'));

    if (user.role === 'superadmin') {
      superAdminElements.forEach(el => el.classList.remove('hidden'));
    } else {
      superAdminElements.forEach(el => el.classList.add('hidden'));
    }
  }

  // Refresh ikon Lucide jika diperlukan
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function quickSelectAccount(role) {
  const accounts = getAccountsList();
  const acc = accounts.find(a => a.role === role);
  if (acc) {
    document.getElementById('loginUsername').value = acc.username;
    document.getElementById('loginPassword').value = acc.password;
  }
}

function togglePasswordVisibility() {
  const passInput = document.getElementById('loginPassword');
  const icon = document.getElementById('eyeIconLogin');
  if (passInput.type === 'password') {
    passInput.type = 'text';
    icon.setAttribute('data-lucide', 'eye-off');
  } else {
    passInput.type = 'password';
    icon.setAttribute('data-lucide', 'eye');
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function submitLogin(e) {
  e.preventDefault();
  const u = document.getElementById('loginUsername').value.trim();
  const p = document.getElementById('loginPassword').value;
  const errBox = document.getElementById('loginErrorAlert');

  const accounts = getAccountsList();
  const matched = accounts.find(a => a.username.toLowerCase() === u.toLowerCase() && a.password === p);

  if (matched) {
    if (errBox) errBox.classList.add('hidden');
    state.isLoggedIn = true;
    currentUserSession = matched;
    sessionStorage.setItem('DINKES_LOGGED_IN', 'true');
    sessionStorage.setItem('DINKES_CURRENT_USER', JSON.stringify(matched));

    document.getElementById('loginPassword').value = '';
    checkAuthSession();
    showToast(`Selamat datang, ${matched.nama} (${matched.badge})`);
  } else {
    if (errBox) errBox.classList.remove('hidden');
  }
}

function logoutPetugas() {
  if (!confirm('Keluar dari sesi E-Cuti?')) return;
  state.isLoggedIn = false;
  currentUserSession = null;
  sessionStorage.removeItem('DINKES_LOGGED_IN');
  sessionStorage.removeItem('DINKES_CURRENT_USER');
  checkAuthSession();
  showToast('Anda telah keluar dari sistem');
}
