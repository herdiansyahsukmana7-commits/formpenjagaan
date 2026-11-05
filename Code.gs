/**
 * BACKEND API GOOGLE APPS SCRIPT - SISTEM PENGAJUAN CUTI
 * DINAS KESEHATAN KOTA TANGERANG SELATAN
 * Simpan kode ini di Google Sheet -> Extensions -> Apps Script -> Code.gs
 */

const SHEET_NAMES = {
  CUTI: 'pengajuancuti',
  PEGAWAI: 'masterpegawai',
  REKAP: 'masterdatarekap'
};

// Header standar untuk masing-masing sheet
const SHEET_HEADERS = {
  CUTI: [
    'id_pengajuan', 'tanggal_surat', 'nomor_surat', 'status_kepegawaian', 'nip', 'nama', 'jabatan', 'pangkat_gol',
    'jenis_cuti', 'tanggal_mulai', 'tanggal_selesai', 'lama_cuti',
    'alasan_cuti', 'alamat_cuti', 'status_pengajuan', 'catatan_atasan',
    'is_deleted', 'created_at', 'updated_at',
    'masa_kerja', 'unit_kerja', 'telp', 'sisa_cuti_tahunan',
    'jenis_pejabat', 'atasan_nama', 'atasan_nip', 'pejabat_nama', 'pejabat_nip'
  ],
  PEGAWAI: ['NIP', 'Nama', 'Jabatan', 'Pangkat', 'Masa Kerja', 'Unit Kerja', 'Telp', 'Atasan Nama', 'Atasan NIP', 'Status'],
  REKAP: ['NIP', 'Nama', 'Jatah Cuti', 'N-2', 'N-1', 'N', 'Sisa Cuti Saat Ini']
};

/**
 * JALANKAN FUNGSI INI SEKALI DI APPS SCRIPT (Klik tombol Run -> setupSheets)
 * Untuk membuat 3 sheet beserta judul kolom (header) secara otomatis jika belum ada.
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(SHEET_NAMES).forEach(key => {
    const sheetName = SHEET_NAMES[key];
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    const maxCols = Math.max(sheet.getLastColumn(), SHEET_HEADERS[key].length);
    const firstRow = sheet.getRange(1, 1, 1, maxCols).getValues()[0];
    const isEmpty = firstRow.every(cell => String(cell).trim() === '');

    if (isEmpty) {
      sheet.getRange(1, 1, 1, SHEET_HEADERS[key].length).setValues([SHEET_HEADERS[key]]);
      sheet.getRange(1, 1, 1, SHEET_HEADERS[key].length).setFontWeight('bold');
    } else {
      // Tambahkan kolom baru di ujung kanan apabila belum ada di sheet eksisting
      const existingLower = firstRow.map(c => String(c || '').trim().toLowerCase());
      SHEET_HEADERS[key].forEach(h => {
        if (!existingLower.includes(h.toLowerCase())) {
          const nextCol = sheet.getLastColumn() + 1;
          sheet.getRange(1, nextCol).setValue(h).setFontWeight('bold');
        }
      });
    }
  });
}

// Response Helper
function jsonResponse(data, status = 200) {
  return ContentService.createTextOutput(JSON.stringify({
    status: status,
    ...data
  }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * GET Handler: Mengambil data cuti, master pegawai, dan rekap
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getAllCuti';

    if (action === 'getAllCuti') {
      const sheet = ss.getSheetByName(SHEET_NAMES.CUTI);
      if (!sheet) return jsonResponse({ error: 'Sheet pengajuancuti belum dibuat. Jalankan fungsi setupSheets() terlebih dahulu.' }, 404);

      const rows = sheet.getDataRange().getValues();
      if (rows.length <= 1) return jsonResponse({ data: [] });

      const headers = rows[0].map(h => String(h || '').trim().toLowerCase());
      const data = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const isRowEmpty = row.every(cell => String(cell || '').trim() === '');
        if (isRowEmpty) continue;

        const delIdx = headers.indexOf('is_deleted');
        const isDeleted = delIdx !== -1 ? row[delIdx] : false;
        if (isDeleted === true || String(isDeleted).toLowerCase() === 'true') continue;

        let item = {};
        headers.forEach((header, index) => {
          if (!header) return;
          let val = row[index];
          if (val instanceof Date) {
            val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
          }
          item[header] = val;
        });
        data.push(item);
      }
      return jsonResponse({ data: data });
    }

    if (action === 'getPegawai') {
      const sheet = ss.getSheetByName(SHEET_NAMES.PEGAWAI);
      if (!sheet) return jsonResponse({ error: 'Sheet masterpegawai belum dibuat.' }, 404);

      const rows = sheet.getDataRange().getValues();
      if (rows.length <= 1) return jsonResponse({ data: [] });

      const headers = rows[0].map(h => String(h || '').trim());
      const data = [];

      for (let i = 1; i < rows.length; i++) {
        const isRowEmpty = rows[i].every(cell => String(cell || '').trim() === '');
        if (isRowEmpty) continue;

        let item = {};
        headers.forEach((header, index) => {
          if (!header) return;
          item[header] = String(rows[i][index] || '');
        });
        data.push(item);
      }
      return jsonResponse({ data: data });
    }

    if (action === 'getRekap') {
      const nip = e.parameter.nip;
      const sheet = ss.getSheetByName(SHEET_NAMES.REKAP);
      if (!sheet) return jsonResponse({ error: 'Sheet masterdatarekap belum dibuat.' }, 404);

      const rows = sheet.getDataRange().getValues();
      const headers = rows[0].map(h => String(h || '').trim());
      const nipIndex = headers.findIndex(h => h.toLowerCase() === 'nip');

      if (nipIndex === -1) {
        return jsonResponse({ error: 'Kolom NIP tidak ditemukan di masterdatarekap' }, 400);
      }

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][nipIndex]).trim() === String(nip).trim()) {
          let item = {};
          headers.forEach((header, idx) => {
            if (!header) return;
            item[header] = rows[i][idx];
          });
          return jsonResponse({ data: item });
        }
      }
      return jsonResponse({ error: 'Data rekap NIP tidak ditemukan' }, 404);
    }

    return jsonResponse({ error: 'Aksi tidak valid' }, 400);

  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

/**
 * POST Handler: Create, Update, Delete (Soft-delete), & Status Update
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAMES.CUTI);

    if (!sheet) {
      setupSheets();
      sheet = ss.getSheetByName(SHEET_NAMES.CUTI);
    }

    // Pastikan seluruh kolom terbaru sudah ada di header
    setupSheets();

    const rows = sheet.getDataRange().getValues();
    const headers = rows[0].map(h => String(h || '').trim().toLowerCase());
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

    // 1. CREATE DATA CUTI
    if (action === 'create') {
      const newId = 'CUTI-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-") +
        Math.floor(1000 + Math.random() * 9000);

      const record = {
        id_pengajuan: newId,
        tanggal_surat: payload.tanggal_surat || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
        nomor_surat: payload.nomor_surat || '',
        status_kepegawaian: payload.status_kepegawaian || 'PPPK',
        nip: String(payload.nip || ''),
        nama: payload.nama || '',
        jabatan: payload.jabatan || '',
        pangkat_gol: payload.pangkat_gol || '',
        jenis_cuti: payload.jenis_cuti || '',
        tanggal_mulai: payload.tanggal_mulai || '',
        tanggal_selesai: payload.tanggal_selesai || '',
        lama_cuti: Number(payload.lama_cuti || 0),
        alasan_cuti: payload.alasan_cuti || '',
        alamat_cuti: payload.alamat_cuti || '',
        status_pengajuan: payload.status_pengajuan || 'Menunggu',
        catatan_atasan: payload.catatan_atasan || '',
        is_deleted: false,
        created_at: now,
        updated_at: now,
        masa_kerja: payload.masa_kerja || '',
        unit_kerja: payload.unit_kerja || 'Dinas Kesehatan',
        telp: String(payload.telp || ''),
        sisa_cuti_tahunan: payload.sisa_cuti_tahunan || 'N=12',
        jenis_pejabat: payload.jenis_pejabat || 'kadinkes',
        atasan_nama: payload.atasan_nama || '',
        atasan_nip: String(payload.atasan_nip || ''),
        pejabat_nama: payload.pejabat_nama || '',
        pejabat_nip: String(payload.pejabat_nip || '')
      };

      const newRow = headers.map(h => record[h] !== undefined ? record[h] : '');
      sheet.appendRow(newRow);

      // Sinkronisasi otomatis ke Master Pegawai jika belum ada / kosong
      syncPegawaiFromCuti(ss, record);

      return jsonResponse({ message: 'Pengajuan cuti berhasil dibuat', id: newId });
    }

    // 2. UPDATE DATA CUTI
    if (action === 'update') {
      const id = payload.id_pengajuan;
      const idIndex = headers.indexOf('id_pengajuan');
      let rowIndex = -1;

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][idIndex]).trim() === String(id).trim()) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex === -1) {
        return jsonResponse({ error: 'ID Pengajuan tidak ditemukan' }, 404);
      }

      const updateFields = [
        'tanggal_surat', 'nomor_surat', 'status_kepegawaian', 'nip', 'nama', 'jabatan', 'pangkat_gol',
        'jenis_cuti', 'tanggal_mulai', 'tanggal_selesai', 'lama_cuti',
        'alasan_cuti', 'alamat_cuti', 'status_pengajuan', 'catatan_atasan',
        'masa_kerja', 'unit_kerja', 'telp', 'sisa_cuti_tahunan',
        'jenis_pejabat', 'atasan_nama', 'atasan_nip', 'pejabat_nama', 'pejabat_nip'
      ];

      updateFields.forEach(field => {
        if (payload[field] !== undefined) {
          const colIdx = headers.indexOf(field) + 1;
          if (colIdx > 0) {
            sheet.getRange(rowIndex, colIdx).setValue(payload[field]);
          }
        }
      });

      const updatedAtCol = headers.indexOf('updated_at') + 1;
      if (updatedAtCol > 0) {
        sheet.getRange(rowIndex, updatedAtCol).setValue(now);
      }

      // Sinkronisasi otomatis ke Master Pegawai jika ada data baru / kosong yang diisi
      syncPegawaiFromCuti(ss, payload);

      return jsonResponse({ message: 'Data pengajuan cuti berhasil diperbarui' });
    }

    // 3. DELETE (SOFT DELETE)
    if (action === 'delete') {
      const id = payload.id_pengajuan;
      const idIndex = headers.indexOf('id_pengajuan');
      let rowIndex = -1;

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][idIndex]).trim() === String(id).trim()) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex === -1) {
        return jsonResponse({ error: 'ID Pengajuan tidak ditemukan' }, 404);
      }

      const isDeletedCol = headers.indexOf('is_deleted') + 1;
      const updatedAtCol = headers.indexOf('updated_at') + 1;

      if (isDeletedCol > 0) sheet.getRange(rowIndex, isDeletedCol).setValue(true);
      if (updatedAtCol > 0) sheet.getRange(rowIndex, updatedAtCol).setValue(now);

      return jsonResponse({ message: 'Pengajuan cuti berhasil dihapus' });
    }

    return jsonResponse({ error: 'Aksi POST tidak valid' }, 400);

  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Sinkronisasi otomatis dari permohonan cuti yang diisi manual ke Master Pegawai.
 * Jika pegawai belum ada di sheet masterpegawai, akan dibuatkan baris baru.
 * Jika sudah ada, kolom-kolom yang masih kosong akan diisi dengan data manual ini.
 */
function syncPegawaiFromCuti(ss, item) {
  try {
    const nip = String(item.nip || '').trim();
    const nama = String(item.nama || '').trim();
    if (!nip && !nama) return;

    let pegSheet = ss.getSheetByName(SHEET_NAMES.PEGAWAI);
    if (!pegSheet) {
      setupSheets();
      pegSheet = ss.getSheetByName(SHEET_NAMES.PEGAWAI);
    }
    if (!pegSheet) return;

    const data = pegSheet.getDataRange().getValues();
    if (data.length === 0) return;

    const headers = data[0].map(h => String(h || '').trim().toLowerCase());
    const nipIdx = headers.findIndex(h => h === 'nip' || h === 'ni pppk');
    const namaIdx = headers.indexOf('nama');
    const statusIdx = headers.indexOf('status');
    const jabIdx = headers.indexOf('jabatan');
    const pangIdx = headers.findIndex(h => h === 'pangkat' || h === 'gol' || h === 'golongan');
    const masaIdx = headers.findIndex(h => h === 'masa kerja');
    const unitIdx = headers.findIndex(h => h === 'unit kerja' || h === 'perangkat daerah');
    const telpIdx = headers.findIndex(h => h === 'telp' || h === 'no hp' || h === 'telepon');
    const atasanNamaIdx = headers.findIndex(h => h === 'atasan nama');
    const atasanNipIdx = headers.findIndex(h => h === 'atasan nip');

    let matchedRow = -1;
    for (let i = 1; i < data.length; i++) {
      const rowNip = nipIdx !== -1 ? String(data[i][nipIdx] || '').trim() : '';
      const rowNama = namaIdx !== -1 ? String(data[i][namaIdx] || '').trim().toLowerCase() : '';

      if (nip && rowNip && rowNip === nip) {
        matchedRow = i + 1;
        break;
      }
      if (nama && rowNama && rowNama === nama.toLowerCase()) {
        matchedRow = i + 1;
        break;
      }
    }

    if (matchedRow > 0) {
      // Baris pegawai sudah ada: periksa jika ada field yang masih kosong, isi dengan data input manual
      const checkAndFill = (colIdx, val) => {
        if (colIdx >= 0 && val) {
          const currentVal = String(data[matchedRow - 1][colIdx] || '').trim();
          if (!currentVal) {
            pegSheet.getRange(matchedRow, colIdx + 1).setValue(val);
          }
        }
      };

      checkAndFill(nipIdx, item.nip);
      checkAndFill(namaIdx, item.nama);
      checkAndFill(statusIdx, item.status_kepegawaian);
      checkAndFill(jabIdx, item.jabatan);
      checkAndFill(pangIdx, item.pangkat_gol);
      checkAndFill(masaIdx, item.masa_kerja);
      checkAndFill(unitIdx, item.unit_kerja);
      checkAndFill(telpIdx, item.telp);
      checkAndFill(atasanNamaIdx, item.atasan_nama);
      checkAndFill(atasanNipIdx, item.atasan_nip);
    } else {
      // Pegawai belum pernah ada: tambahkan baris baru ke Master Pegawai
      const newPegRow = headers.map(h => {
        if (h === 'nip' || h === 'ni pppk') return item.nip || '';
        if (h === 'nama') return item.nama || '';
        if (h === 'status') return item.status_kepegawaian || 'PPPK';
        if (h === 'jabatan') return item.jabatan || '';
        if (h === 'pangkat' || h === 'gol' || h === 'golongan') return item.pangkat_gol || '';
        if (h === 'masa kerja') return item.masa_kerja || '';
        if (h === 'unit kerja' || h === 'perangkat daerah') return item.unit_kerja || 'Dinas Kesehatan';
        if (h === 'telp' || h === 'no hp' || h === 'telepon') return item.telp || '';
        if (h === 'atasan nama') return item.atasan_nama || '';
        if (h === 'atasan nip') return item.atasan_nip || '';
        return '';
      });
      pegSheet.appendRow(newPegRow);
    }

    // Sinkronisasi juga ke sheet Rekap Cuti jika belum ada
    let rekapSheet = ss.getSheetByName(SHEET_NAMES.REKAP);
    if (rekapSheet && nip) {
      const rekapData = rekapSheet.getDataRange().getValues();
      const rekapHeaders = rekapData[0].map(h => String(h || '').trim().toLowerCase());
      const rekapNipIdx = rekapHeaders.indexOf('nip');
      let rekapFound = false;

      if (rekapNipIdx !== -1) {
        for (let r = 1; r < rekapData.length; r++) {
          if (String(rekapData[r][rekapNipIdx] || '').trim() === nip) {
            rekapFound = true;
            break;
          }
        }
        if (!rekapFound) {
          const newRekapRow = rekapHeaders.map(h => {
            if (h === 'nip') return nip;
            if (h === 'nama') return nama;
            if (h === 'jatah cuti') return 12;
            if (h === 'n-2') return 0;
            if (h === 'n-1') return 0;
            if (h === 'n') return 12;
            if (h === 'sisa cuti saat ini') return 12;
            return '';
          });
          rekapSheet.appendRow(newRekapRow);
        }
      }
    }
  } catch (err) {
    console.error('syncPegawaiFromCuti error:', err);
  }
}
