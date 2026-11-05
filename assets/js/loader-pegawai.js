/**
 * assets/js/loader-pegawai.js
 * E-Cuti Dinas Kesehatan Kota Tangerang Selatan
 * Modul Khusus Master Data Pegawai, Live Auto-Suggest & Cek Rekapitulasi Cuti
 */

function getPegawaiField(obj, keys) {
      for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== '') return String(obj[k]);
        const foundKey = Object.keys(obj).find(actual => actual.toLowerCase().trim() === k.toLowerCase());
        if (foundKey && obj[foundKey] !== '') return String(obj[foundKey]);
      }
      return '';
    }

    function populatePegawaiDropdowns() {
      // Dropdown lama sudah digantikan dengan sistem live-search (searchable ketik manual)
    }

    // =========================================================================
    // SISTEM SEARCHABLE (AUTO-SUGGEST KETIK MANUAL) PEGAWAI & PEJABAT
    // =========================================================================
    const ALL_SUGGEST_BOXES = [
      'suggestBoxFormMain', 'suggestBoxFormNip', 'suggestBoxFormNama',
      'suggestBoxFormAtasan', 'suggestBoxFormPejabat',
      'suggestBoxCfgKadinkes', 'suggestBoxCfgAtasan',
      'suggestBoxRekap', 'suggestBoxCetak'
    ];

    function closeAllSuggestBoxes() {
      ALL_SUGGEST_BOXES.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });
    }

    // Tutup daftar saran saat klik di luar input pencarian
    document.addEventListener('click', (e) => {
      if (!e.target.closest('input') && !e.target.closest('[id^="suggestBox"]')) {
        closeAllSuggestBoxes();
      }
    });

    // Gabungkan direktori pegawai dari Master Pegawai, riwayat pengajuan, & pejabat default
    function getUnifiedPegawaiPool() {
      const map = new Map();

      // 1. Dari Master Pegawai
      state.pegawaiList.forEach(p => {
        const nip = getPegawaiField(p, ['NIP', 'NI PPPK', 'nip']).trim();
        const nama = getPegawaiField(p, ['Nama', 'nama']).trim();
        if (!nama && !nip) return;
        const key = (nip || nama).toLowerCase();
        map.set(key, {
          nip: nip,
          nama: nama,
          jabatan: getPegawaiField(p, ['Jabatan', 'jabatan']) || 'Penata Layanan Operasional',
          pangkat: getPegawaiField(p, ['Pangkat', 'pangkat_gol', 'Golongan']) || 'IX',
          masa_kerja: getPegawaiField(p, ['Masa Kerja', 'masa_kerja']) || '01 Tahun 03 Bulan',
          unit_kerja: getPegawaiField(p, ['Unit Kerja', 'unit_kerja']) || 'Dinas Kesehatan',
          telp: getPegawaiField(p, ['Telp', 'telp', 'Telepon']) || ''
        });
      });

      // 2. Dari Riwayat Pengajuan Cuti (jika belum ada di masterpegawai)
      state.cutiList.forEach(c => {
        const nip = String(c.nip || '').trim();
        const nama = String(c.nama || '').trim();
        if (!nama) return;
        const key = (nip || nama).toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            nip: nip,
            nama: nama,
            jabatan: c.jabatan || 'Penata Layanan Operasional',
            pangkat: c.pangkat_gol || 'IX',
            masa_kerja: c.masa_kerja || '01 Tahun 03 Bulan',
            unit_kerja: c.unit_kerja || 'Dinas Kesehatan',
            telp: c.telp || ''
          });
        }
      });

      // 3. Tambahkan kandidat Pejabat Default agar selalu muncul saat dicari di Pengaturan / Form Pejabat
      const officials = [
        { nip: pejabatDefault.kadinkesNip, nama: pejabatDefault.kadinkesNama, jabatan: 'Kepala Dinas Kesehatan', pangkat: 'IV/b' },
        { nip: pejabatDefault.atasanNip, nama: pejabatDefault.atasanNama, jabatan: 'Atasan Langsung', pangkat: 'III/d' },
        { nip: '197610152007012007', nama: 'dr. Allin Hendalin Mahdaniar, M.K.M.', jabatan: 'Kepala Dinas Kesehatan', pangkat: 'IV/b' },
        { nip: '197801081998031002', nama: 'Ikhsan Permana, SKM', jabatan: 'Kasubag Umum dan Kepegawaian', pangkat: 'III/d' },
        { nip: '', nama: 'Benyamin Davnie', jabatan: 'Wali Kota Tangerang Selatan', pangkat: '-' }
      ];
      officials.forEach(o => {
        if (!o.nama) return;
        const key = (o.nip || o.nama).toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            nip: o.nip || '',
            nama: o.nama,
            jabatan: o.jabatan,
            pangkat: o.pangkat || 'IX',
            masa_kerja: '-',
            unit_kerja: 'Dinas Kesehatan',
            telp: ''
          });
        }
      });

      return Array.from(map.values());
    }

    function highlightMatch(text, query) {
      const safeText = escapeHtml(text || '');
      if (!query) return safeText;
      const escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return safeText.replace(new RegExp(`(${escapedQ})`, 'gi'), '<mark class="bg-teal-100 text-teal-900 font-bold rounded px-0.5">$1</mark>');
    }

    function showSuggestPegawai(query, targetMode) {
      const boxMap = {
        form_main: 'suggestBoxFormMain',
        form_nip: 'suggestBoxFormNip',
        form_nama: 'suggestBoxFormNama',
        form_atasan: 'suggestBoxFormAtasan',
        form_pejabat: 'suggestBoxFormPejabat',
        cfg_kadinkes: 'suggestBoxCfgKadinkes',
        cfg_atasan: 'suggestBoxCfgAtasan',
        rekap: 'suggestBoxRekap'
      };

      const boxId = boxMap[targetMode];
      if (!boxId) return;

      ALL_SUGGEST_BOXES.forEach(id => {
        if (id !== boxId) {
          const el = document.getElementById(id);
          if (el) el.classList.add('hidden');
        }
      });

      const box = document.getElementById(boxId);
      const q = String(query || '').trim().toLowerCase();
      const pool = getUnifiedPegawaiPool();

      const matches = pool.filter(p => {
        if (!q) return true;
        return p.nama.toLowerCase().includes(q) ||
               p.nip.toLowerCase().includes(q) ||
               p.jabatan.toLowerCase().includes(q);
      }).slice(0, 20);

      if (matches.length === 0) {
        box.innerHTML = `<div class="px-3.5 py-2.5 text-[11px] text-slate-400 italic">Tidak ada kecocokan di Master Pegawai (tetap bisa diketik manual)</div>`;
        box.classList.remove('hidden');
        return;
      }

      box.innerHTML = matches.map((p, idx) => `
        <button type="button" onclick="applySelectedPegawai(${idx}, '${escapeAttr(q)}', '${targetMode}')" class="w-full text-left px-3.5 py-2 hover:bg-teal-50/80 transition flex items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="text-xs font-bold text-slate-800 truncate">${highlightMatch(p.nama, query.trim())}</div>
            <div class="text-[10px] text-slate-500 truncate">${p.nip ? 'NI PPPK/NIP: ' + highlightMatch(p.nip, query.trim()) : 'Pejabat'} • ${escapeHtml(p.jabatan)}</div>
          </div>
          <span class="shrink-0 text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">Pilih</span>
        </button>
      `).join('');

      box.classList.remove('hidden');
    }

    function applySelectedPegawai(matchIndex, queryLower, targetMode) {
      const pool = getUnifiedPegawaiPool();
      const matches = pool.filter(p => {
        if (!queryLower) return true;
        return p.nama.toLowerCase().includes(queryLower) ||
               p.nip.toLowerCase().includes(queryLower) ||
               p.jabatan.toLowerCase().includes(queryLower);
      }).slice(0, 20);

      const chosen = matches[matchIndex];
      closeAllSuggestBoxes();
      if (!chosen) return;

      if (targetMode === 'form_main' || targetMode === 'form_nip' || targetMode === 'form_nama') {
        const qInput = document.getElementById('quickSearchPegawaiInput');
        if (qInput) qInput.value = `${chosen.nama}${chosen.nip ? ' (' + chosen.nip + ')' : ''}`;
        document.getElementById('f_nip').value = chosen.nip || '';
        document.getElementById('f_nama').value = chosen.nama || '';
        document.getElementById('f_jabatan').value = chosen.jabatan || 'Penata Layanan Operasional';
        document.getElementById('f_pangkat_gol').value = chosen.pangkat || 'IX';
        if (chosen.masa_kerja && chosen.masa_kerja !== '-') {
          document.getElementById('f_masa_kerja').value = chosen.masa_kerja;
        }
        document.getElementById('f_unit_kerja').value = chosen.unit_kerja || 'Dinas Kesehatan';
        if (chosen.telp) document.getElementById('f_telp').value = chosen.telp;
      } else if (targetMode === 'form_atasan') {
        document.getElementById('f_atasan_nama').value = chosen.nama || '';
        document.getElementById('f_atasan_nip').value = chosen.nip || '';
      } else if (targetMode === 'form_pejabat') {
        document.getElementById('f_pejabat_nama').value = chosen.nama || '';
        document.getElementById('f_pejabat_nip').value = chosen.nip || '';
      } else if (targetMode === 'cfg_kadinkes') {
        document.getElementById('cfgKadinkesNama').value = chosen.nama || '';
        document.getElementById('cfgKadinkesNip').value = chosen.nip || '';
      } else if (targetMode === 'cfg_atasan') {
        document.getElementById('cfgAtasanNama').value = chosen.nama || '';
        document.getElementById('cfgAtasanNip').value = chosen.nip || '';
      } else if (targetMode === 'rekap') {
        document.getElementById('rekapNipInput').value = chosen.nip || chosen.nama;
        cariRekapNip(chosen.nip, chosen.nama);
      }
    }

    function onSelectMasterPegawai(nip) {
      if (!nip) return;
      const pool = getUnifiedPegawaiPool();
      const chosen = pool.find(item => item.nip === nip);
      if (!chosen) return;

      const qInput = document.getElementById('quickSearchPegawaiInput');
      if (qInput) qInput.value = `${chosen.nama} (${chosen.nip})`;
      document.getElementById('f_nip').value = chosen.nip;
      document.getElementById('f_nama').value = chosen.nama;
      document.getElementById('f_jabatan').value = chosen.jabatan || 'Penata Layanan Operasional';
      document.getElementById('f_pangkat_gol').value = chosen.pangkat || 'IX';
      document.getElementById('f_masa_kerja').value = chosen.masa_kerja || '01 Tahun 03 Bulan';
      document.getElementById('f_unit_kerja').value = chosen.unit_kerja || 'Dinas Kesehatan';
      document.getElementById('f_telp').value = chosen.telp || '';

      const statusField = document.getElementById('f_status_kepegawaian');
      if (statusField) {
        const rawStatus = (chosen.status || chosen.Status || '').toUpperCase();
        if (rawStatus.includes('PNS') || (!chosen.nip.includes('202521') && !chosen.nip.includes('202421') && (chosen.pangkat || '').includes('/'))) {
          statusField.value = 'PNS';
        } else {
          statusField.value = 'PPPK';
        }
      }
    }

    // State Pagination untuk Tabel-Tabel
    let pageMasterPegawai = 1;
    let pageTableRekap = 1;
    const PER_PAGE_DEFAULT = 20;

    function renderPegawaiTable(resetPage = false) {
      if (resetPage) pageMasterPegawai = 1;
      const q = (document.getElementById('searchPegawaiInput').value || '').toLowerCase();
      const tbody = document.getElementById('pegawaiTableBody');
      const paginationEl = document.getElementById('pegawaiTablePagination');

      const filtered = state.pegawaiList.filter(p => {
        const nip = getPegawaiField(p, ['NIP', 'NI PPPK', 'nip']).toLowerCase();
        const nama = getPegawaiField(p, ['Nama', 'nama']).toLowerCase();
        const jabatan = getPegawaiField(p, ['Jabatan', 'jabatan']).toLowerCase();
        return !q || nip.includes(q) || nama.includes(q) || jabatan.includes(q);
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400">Data pegawai tidak ditemukan</td></tr>`;
        if (paginationEl) paginationEl.innerHTML = '';
        return;
      }

      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / PER_PAGE_DEFAULT) || 1;
      if (pageMasterPegawai > totalPages) pageMasterPegawai = totalPages;
      if (pageMasterPegawai < 1) pageMasterPegawai = 1;

      const startIndex = (pageMasterPegawai - 1) * PER_PAGE_DEFAULT;
      const pagedItems = filtered.slice(startIndex, startIndex + PER_PAGE_DEFAULT);

      tbody.innerHTML = pagedItems.map(p => {
        const nip = getPegawaiField(p, ['NIP', 'NI PPPK', 'nip']);
        const nama = getPegawaiField(p, ['Nama', 'nama']);
        const jabatan = getPegawaiField(p, ['Jabatan', 'jabatan']) || 'Penata Layanan Operasional';
        const pangkat = getPegawaiField(p, ['Pangkat', 'pangkat_gol']) || 'IX';
        const mk = getPegawaiField(p, ['Masa Kerja', 'masa_kerja']) || '-';

        // Deteksi status PNS vs PPPK
        const rawStatus = (getPegawaiField(p, ['Status', 'status']) || '').toUpperCase();
        let isPNS = false;
        if (rawStatus.includes('PNS')) {
          isPNS = true;
        } else if (!rawStatus.includes('PPPK')) {
          // Fallback cerdas: NIP PNS biasanya 18 digit tanpa kode 202521/202421 dan format gol PNS
          if (!nip.includes('202521') && !nip.includes('202421') && (pangkat.includes('/') || nip.startsWith('1985') || nip.startsWith('1980') || nip.startsWith('197') || nip.startsWith('196'))) {
            isPNS = true;
          }
        }

        const labelBadge = isPNS
          ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">PNS</span>`
          : `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/60">PPPK</span>`;

        const nipHtml = isPNS
          ? `<div class="font-mono font-bold text-slate-800">${escapeHtml(nip)}</div><div class="text-[10px] text-blue-600 font-semibold tracking-wider">NIP</div>`
          : `<div class="font-mono font-bold text-slate-800">${escapeHtml(nip)}</div><div class="text-[10px] text-teal-600 font-semibold tracking-wider">NI PPPK</div>`;

        return `
          <tr class="hover:bg-slate-50/80 transition">
            <td class="py-3 px-4">${nipHtml}</td>
            <td class="py-3 px-4 font-bold text-slate-900">${escapeHtml(nama)}</td>
            <td class="py-3 px-4">${labelBadge}</td>
            <td class="py-3 px-4 text-slate-600">${escapeHtml(jabatan)}</td>
            <td class="py-3 px-4 text-slate-500">Gol. ${escapeHtml(pangkat)} • ${escapeHtml(mk)}</td>
            <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
              <button onclick="cekRekapDariPegawai('${escapeAttr(nip)}')" class="px-2.5 py-1 rounded-lg font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition">Rekap</button>
              <button onclick="buatCutiDariPegawai('${escapeAttr(nip)}')" class="px-2.5 py-1 rounded-lg font-bold bg-teal-50 text-teal-700 hover:bg-teal-100 transition">+ Buat Cuti</button>
            </td>
          </tr>
        `;
      }).join('');

      if (paginationEl) {
        paginationEl.innerHTML = `
          <div>Menampilkan <b>${startIndex + 1}</b> - <b>${Math.min(startIndex + PER_PAGE_DEFAULT, totalItems)}</b> dari <b>${totalItems}</b> pegawai</div>
          <div class="flex items-center gap-1.5">
            <button onclick="changePageMasterPegawai(${pageMasterPegawai - 1})" ${pageMasterPegawai === 1 ? 'disabled' : ''} class="px-2.5 py-1 rounded-lg border border-slate-200 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Sebelumnya</button>
            <span class="px-2 font-bold text-slate-700">Hal ${pageMasterPegawai} / ${totalPages}</span>
            <button onclick="changePageMasterPegawai(${pageMasterPegawai + 1})" ${pageMasterPegawai === totalPages ? 'disabled' : ''} class="px-2.5 py-1 rounded-lg border border-slate-200 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Selanjutnya</button>
          </div>
        `;
      }
    }

    function changePageMasterPegawai(newPage) {
      pageMasterPegawai = newPage;
      renderPegawaiTable();
    }

    // =========================================================================
    // TABEL REKAPITULASI CUTI SELURUH PEGAWAI (20 PER HALAMAN)
    // =========================================================================
    function renderTableRekapPegawai(resetPage = false) {
      if (resetPage) pageTableRekap = 1;
      const qInput = document.getElementById('searchTableRekapInput');
      const q = (qInput ? qInput.value : '').toLowerCase().trim();
      const tbody = document.getElementById('tableRekapPegawaiBody');
      const paginationEl = document.getElementById('tableRekapPagination');
      if (!tbody) return;

      const pool = getUnifiedPegawaiPool();
      const filtered = pool.filter(p => {
        if (!q) return true;
        return (p.nama && p.nama.toLowerCase().includes(q)) ||
               (p.nip && p.nip.toLowerCase().includes(q)) ||
               (p.jabatan && p.jabatan.toLowerCase().includes(q));
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-center text-slate-400">Pegawai tidak ditemukan di rekap</td></tr>`;
        if (paginationEl) paginationEl.innerHTML = '';
        return;
      }

      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / PER_PAGE_DEFAULT) || 1;
      if (pageTableRekap > totalPages) pageTableRekap = totalPages;
      if (pageTableRekap < 1) pageTableRekap = 1;

      const startIndex = (pageTableRekap - 1) * PER_PAGE_DEFAULT;
      const pagedItems = filtered.slice(startIndex, startIndex + PER_PAGE_DEFAULT);

      tbody.innerHTML = pagedItems.map((p, idx) => {
        const nip = p.nip;
        const nama = p.nama;
        const jabatan = p.jabatan || 'Penata Layanan Operasional';

        // Deteksi status PNS vs PPPK
        const rawStatus = (p.status || p.Status || '').toUpperCase();
        let isPNS = false;
        if (rawStatus.includes('PNS')) {
          isPNS = true;
        } else if (!rawStatus.includes('PPPK')) {
          if (!nip.includes('202521') && !nip.includes('202421') && ((p.pangkat || '').includes('/') || nip.startsWith('1985') || nip.startsWith('1980') || nip.startsWith('197') || nip.startsWith('196'))) {
            isPNS = true;
          }
        }

        const labelBadge = isPNS
          ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">PNS</span>`
          : `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/60">PPPK</span>`;

        const nipLabel = isPNS ? 'NIP.' : 'NI PPPK.';

        // Hitung saldo BKN FIFO
        let n2 = 0, n1 = 0, n = 12, sisaTotal = 12;
        if (typeof hitungSaldoCutiBKN === 'function') {
          const rawRekap = (typeof DEMO_REKAP !== 'undefined' && DEMO_REKAP[nip]) ? DEMO_REKAP[nip] : null;
          const pegHistory = state.cutiList.filter(c => String(c.nip).trim() === String(nip).trim());
          const saldo = hitungSaldoCutiBKN(rawRekap, pegHistory);
          n2 = saldo.sisaN2;
          n1 = saldo.sisaN1;
          n = saldo.sisaN;
          sisaTotal = saldo.sisaTotal;
        }

        return `
          <tr class="hover:bg-slate-50/80 transition">
            <td class="py-2.5 px-3 text-center text-slate-400 font-semibold">${startIndex + idx + 1}</td>
            <td class="py-2.5 px-3">
              <div class="font-bold text-slate-900">${escapeHtml(nama)}</div>
              <div class="text-[10px] font-mono text-slate-500">${nipLabel} ${escapeHtml(nip)}</div>
            </td>
            <td class="py-2.5 px-3">${labelBadge}</td>
            <td class="py-2.5 px-3 text-slate-600 truncate max-w-[200px]">${escapeHtml(jabatan)}</td>
            <td class="py-2.5 px-3 text-center font-semibold text-slate-700">${n2} HK</td>
            <td class="py-2.5 px-3 text-center font-semibold text-slate-700">${n1} HK</td>
            <td class="py-2.5 px-3 text-center font-bold text-teal-700">${n} HK</td>
            <td class="py-2.5 px-3 text-center">
              <span class="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200/60">${sisaTotal} Hari</span>
            </td>
            <td class="py-2.5 px-3 text-right">
              <button onclick="cariRekapNip('${escapeAttr(nip)}', '${escapeAttr(nama)}')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-600 text-white hover:bg-teal-700 transition">Rincian</button>
            </td>
          </tr>
        `;
      }).join('');

      if (paginationEl) {
        paginationEl.innerHTML = `
          <div>Menampilkan <b>${startIndex + 1}</b> - <b>${Math.min(startIndex + PER_PAGE_DEFAULT, totalItems)}</b> dari <b>${totalItems}</b> pegawai</div>
          <div class="flex items-center gap-1.5">
            <button onclick="changePageTableRekap(${pageTableRekap - 1})" ${pageTableRekap === 1 ? 'disabled' : ''} class="px-2.5 py-1 rounded-lg border border-slate-200 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Sebelumnya</button>
            <span class="px-2 font-bold text-slate-700">Hal ${pageTableRekap} / ${totalPages}</span>
            <button onclick="changePageTableRekap(${pageTableRekap + 1})" ${pageTableRekap === totalPages ? 'disabled' : ''} class="px-2.5 py-1 rounded-lg border border-slate-200 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Selanjutnya</button>
          </div>
        `;
      }
    }

    function changePageTableRekap(newPage) {
      pageTableRekap = newPage;
      renderTableRekapPegawai();
    }

    function buatCutiDariPegawai(nip) {
      openFormModal();
      onSelectMasterPegawai(nip);
    }

    function cekRekapDariPegawai(nip) {
      switchMenu('rekap');
      document.getElementById('rekapNipInput').value = nip;
      cariRekapNip(nip);
    }

    // Perhitungan Cuti Tahunan Sesuai Peraturan BKN No. 24 Th 2017 jo. Peraturan BKN No. 7 Th 2021
    // Tahun N: 12 hari
    // Tahun N-1: max 6 hari
    // Tahun N-2: max 6 hari (penangguhan dinas / akumulasi)
    // Batas Normal: max 18 hari (12 + 6), Penangguhan: max 24 hari (12 + 6 + 6)
    // Pengurangan FIFO: N-2 -> N-1 -> N
    function hitungSaldoCutiBKN(dataRekap, daftarCutiPegawai) {
      // 1. Inisialisasi saldo awal hak cuti
      let initN2 = 0;
      let initN1 = 0;
      let initN = 12;

      if (dataRekap) {
        // Ambil nilai jika ada di sheet/demo
        const valN2 = dataRekap['N-2'] ?? dataRekap['Sisa Cuti N-2'] ?? 0;
        const valN1 = dataRekap['N-1'] ?? dataRekap['Sisa Cuti N-1'] ?? 0;
        const valN = dataRekap['N'] ?? dataRekap['Jatah Cuti'] ?? dataRekap['Jatah Cuti N'] ?? 12;

        initN2 = Math.min(Math.max(0, parseInt(valN2, 10) || 0), 6); // Max 6 hari
        initN1 = Math.min(Math.max(0, parseInt(valN1, 10) || 0), 6); // Max 6 hari
        initN = Math.min(Math.max(0, parseInt(valN, 10) || 12), 12); // Max 12 hari
      }

      // Hitung akumulasi cuti tahunan yang telah diambil (Status selain Ditolak/Tidak Disetujui)
      // Hanya menghitung cuti bertipe 'Cuti Tahunan'
      let totalDiambil = 0;
      if (Array.isArray(daftarCutiPegawai)) {
        totalDiambil = daftarCutiPegawai
          .filter(c => {
            const isTahunan = String(c.jenis_cuti || '').toLowerCase().includes('tahunan');
            const status = String(c.status_pengajuan || '').toLowerCase();
            const tidakDihitung = status.includes('tolak') || status.includes('tidak');
            return isTahunan && !tidakDihitung;
          })
          .reduce((sum, c) => sum + (parseInt(c.lama_cuti, 10) || 0), 0);
      }

      // FIFO Deduction: N-2 -> N-1 -> N
      let remainingToDeduct = totalDiambil;

      // Potong N-2
      let potongN2 = Math.min(initN2, remainingToDeduct);
      let sisaN2 = initN2 - potongN2;
      remainingToDeduct -= potongN2;

      // Potong N-1
      let potongN1 = Math.min(initN1, remainingToDeduct);
      let sisaN1 = initN1 - potongN1;
      remainingToDeduct -= potongN1;

      // Potong N
      let potongN = Math.min(initN, remainingToDeduct);
      let sisaN = initN - potongN;
      remainingToDeduct -= potongN;

      const totalHakCuti = initN2 + initN1 + initN;
      const sisaTotal = sisaN2 + sisaN1 + sisaN;

      return {
        initN2, initN1, initN,
        potongN2, potongN1, potongN,
        sisaN2, sisaN1, sisaN,
        totalDiambil,
        totalHakCuti,
        sisaTotal
      };
    }

    async function cariRekapNip(forcedNip, forcedNama) {
      let rawInput = (forcedNip !== undefined ? forcedNip : document.getElementById('rekapNipInput').value).trim();
      if (!rawInput && !forcedNama) {
        showToast('Ketik Nama Pegawai atau NI PPPK / NIP terlebih dahulu', true);
        return;
      }

      // Jika pengguna mengetik nama pegawai secara manual, cari NIP yang cocok dari pool pegawai
      let nip = rawInput;
      let matchedPerson = null;
      const pool = getUnifiedPegawaiPool();
      if (forcedNama) {
        matchedPerson = pool.find(p => p.nama.toLowerCase() === forcedNama.toLowerCase());
      }
      if (!matchedPerson) {
        matchedPerson = pool.find(p =>
          p.nip.toLowerCase() === rawInput.toLowerCase() ||
          p.nama.toLowerCase().includes(rawInput.toLowerCase())
        );
      }
      if (matchedPerson && matchedPerson.nip) {
        nip = matchedPerson.nip;
      }

      try {
        const res = await apiGet({ action: 'getRekap', nip: nip });
        const container = document.getElementById('rekapResultContainer');
        const grid = document.getElementById('rekapKeyValueGrid');
        const historyBody = document.getElementById('rekapHistoryBody');

        container.classList.remove('hidden');
        const titleLabel = matchedPerson ? `${matchedPerson.nama} (${nip})` : nip;
        const nipVal = matchedPerson ? matchedPerson.nip : nip;
        const namaVal = matchedPerson ? matchedPerson.nama : (res.data ? res.data['Nama'] : '-');

        // Filter riwayat pengajuan cuti pegawai ini
        const riwayat = state.cutiList.filter(c =>
          String(c.nip).trim() === nip ||
          (matchedPerson && String(c.nama).toLowerCase().includes(matchedPerson.nama.toLowerCase()))
        );

        document.getElementById('rekapHeaderTitle').textContent = titleLabel;

        // Ambil data mentah sheet/demo
        let rawRekap = null;
        if (res.status === 200 && res.data) {
          rawRekap = res.data;
        }

        // Lakukan perhitungan BKN FIFO
        const saldo = hitungSaldoCutiBKN(rawRekap, riwayat);

        // Deteksi status PNS vs PPPK untuk label NIP di hasil cek sisa
        let isPersonPNS = false;
        if (matchedPerson) {
          const st = (matchedPerson.status || matchedPerson.Status || '').toUpperCase();
          if (st.includes('PNS') || (!matchedPerson.nip.includes('202521') && !matchedPerson.nip.includes('202421') && (matchedPerson.pangkat || '').includes('/'))) {
            isPersonPNS = true;
          }
        } else if (res.data && res.data['NIP'] && !res.data['NI PPPK']) {
          isPersonPNS = true;
        } else if (nip && !nip.includes('202521') && !nip.includes('202421')) {
          isPersonPNS = true;
        }

        const labelNipCek = isPersonPNS ? 'NIP' : 'NI PPPK';

        // Siapkan field display: Hapus Diambil & Catatan Cuti, tampilkan N, N-1, N-2
        const displayData = {
          [labelNipCek]: nipVal,
          'Nama': namaVal,
          'Status': isPersonPNS ? 'PNS' : 'PPPK',
          'Jatah Cuti': saldo.initN,
          'N-2': `${saldo.sisaN2} Hari`,
          'N-1': `${saldo.sisaN1} Hari`,
          'N': `${saldo.sisaN} Hari`
        };

        grid.innerHTML = Object.entries(displayData).map(([k, v]) => `
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
            <div class="text-[11px] text-slate-400 font-bold uppercase tracking-wider">${escapeHtml(k)}</div>
            <div class="text-base font-black text-slate-900 mt-1">${escapeHtml(String(v ?? '-'))}</div>
          </div>
        `).join('') + `
          <div class="col-span-2 sm:col-span-4 p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/80 text-xs text-teal-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
            <div>
              <span class="font-bold">Regulasi BKN:</span> Hak total cuti: <b>${saldo.totalHakCuti} hari</b> (Maks 18/24 hari). Total Cuti Tahunan terpakai: <b>${saldo.totalDiambil} hari</b> (Pengurangan FIFO: N-2 &rarr; N-1 &rarr; N).
            </div>
            <div class="font-bold text-teal-800 text-sm whitespace-nowrap">
              Sisa Total: <span class="text-teal-700 font-extrabold text-base">${saldo.sisaTotal}</span> Hari
            </div>
          </div>
        `;

        if (riwayat.length === 0) {
          historyBody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400">Belum ada riwayat permohonan cuti</td></tr>`;
        } else {
          historyBody.innerHTML = riwayat.map(r => `
            <tr>
              <td class="py-2.5 px-3 font-mono text-teal-700 font-bold">${escapeHtml(r.id_pengajuan)}</td>
              <td class="py-2.5 px-3 font-semibold">${escapeHtml(r.jenis_cuti)}</td>
              <td class="py-2.5 px-3">${formatSlashDate(r.tanggal_mulai)} s.d. ${formatSlashDate(r.tanggal_selesai)}</td>
              <td class="py-2.5 px-3 font-bold">${escapeHtml(String(r.lama_cuti))} Hari</td>
              <td class="py-2.5 px-3 text-slate-500">${escapeHtml(r.alasan_cuti)}</td>
              <td class="py-2.5 px-3">${getStatusBadge(r.status_pengajuan)}</td>
              <td class="py-2.5 px-3 text-right">
                <button onclick="bukaCetakUntuk('${escapeAttr(r.id_pengajuan)}')" class="font-bold text-teal-600 hover:underline">Cetak</button>
              </td>
            </tr>
          `).join('');
        }
      } catch (err) {
        showToast('Gagal mengambil data rekap: ' + err.message, true);
      }
    }
