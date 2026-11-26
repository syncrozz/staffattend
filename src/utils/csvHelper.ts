import { Staff } from '../types';
import { buildStaffImageUrl } from './staffUtils';

export interface CSVImportResult {
  added: Staff[];
  updated: Staff[];
  skipped: number;
  errors: string[];
}

export interface CSVImportContext {
  institutionId: string;
  defaultEmailDomain?: string;
  avatarBaseUrl?: string;
}

/**
 * Neutralize CSV formula injection characters when exporting cells
 */
export function sanitizeCSVCell(value: string): string {
  const safe = value.replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(safe)) {
    return `'${safe}`;
  }
  return safe;
}

/**
 * Helper to parse CSV string into headers and rows.
 */
export function parseCSV(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/);
  const rows: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    const row: string[] = [];
    let insideQuote = false;
    let currentValue = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        row.push(currentValue.trim().replace(/^"|"$/g, ''));
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    row.push(currentValue.trim().replace(/^"|"$/g, ''));
    rows.push(row);
  }

  return rows;
}

/**
 * Process CSV rows and merge with existing institution staff list.
 */
export function processStaffCSV(
  csvText: string,
  currentStaffList: Staff[],
  context: CSVImportContext
): CSVImportResult {
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    return {
      added: [],
      updated: [],
      skipped: 0,
      errors: ['File CSV tidak mengandungi sekurang-kurangnya 1 baris tajuk (header) dan 1 baris data.']
    };
  }

  const headers = rows[0].map((h) => h.toLowerCase().trim());

  const idIndex = headers.findIndex((h) =>
    ['id', 'staf id', 'id staf', 'no staf', 'staff_id', 'staffid'].some((k) => h.includes(k))
  );
  const nameIndex = headers.findIndex((h) =>
    ['name', 'nama', 'nama penuh', 'full name'].some((k) => h.includes(k))
  );
  const deptIndex = headers.findIndex((h) =>
    ['department', 'jabatan', 'unit', 'bahagian'].some((k) => h.includes(k))
  );
  const posIndex = headers.findIndex((h) =>
    ['position', 'jawatan', 'pangkat', 'role'].some((k) => h.includes(k))
  );
  const emailIndex = headers.findIndex((h) =>
    ['email', 'emel', 'e-mel'].some((k) => h.includes(k))
  );
  const phoneIndex = headers.findIndex((h) =>
    ['phone', 'telefon', 'no tel', 'hp', 'mobile'].some((k) => h.includes(k))
  );

  if (idIndex === -1 || nameIndex === -1) {
    return {
      added: [],
      updated: [],
      skipped: 0,
      errors: ['Lajur utama "ID" dan "Nama" tidak ditemui dalam pengepala CSV. Sila pastikan tajuk lajur mengandungi ID dan Nama.']
    };
  }

  const added: Staff[] = [];
  const updated: Staff[] = [];
  const errors: string[] = [];
  let skipped = 0;

  const staffMap = new Map<string, Staff>();
  currentStaffList.forEach((s) => staffMap.set(s.id.toUpperCase(), { ...s }));

  const fallbackEmail = context.defaultEmailDomain
    ? `staff@${context.defaultEmailDomain.replace(/^@/, '')}`
    : '';

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rawId = row[idIndex]?.trim();
    const rawName = row[nameIndex]?.trim();

    if (!rawId || !rawName) {
      skipped++;
      continue;
    }

    const id = rawId.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!id) {
      skipped++;
      continue;
    }

    const department = ((deptIndex !== -1 && row[deptIndex]?.trim()) || 'Pentadbiran').slice(0, 120);
    const position = ((posIndex !== -1 && row[posIndex]?.trim()) || 'Staf').slice(0, 120);
    const email = ((emailIndex !== -1 && row[emailIndex]?.trim()) || fallbackEmail).slice(0, 254);
    const phone = ((phoneIndex !== -1 && row[phoneIndex]?.trim()) || '').slice(0, 40);

    const existing = staffMap.get(id);

    const staffObj: Staff = {
      id,
      institutionId: context.institutionId,
      name: rawName.slice(0, 150),
      department,
      position,
      email,
      ...(phone ? { phone } : {}),
      status: existing?.status || 'ACTIVE',
      avatarUrl: existing?.avatarUrl || buildStaffImageUrl(id, context.avatarBaseUrl)
    };

    if (existing) {
      updated.push(staffObj);
    } else {
      added.push(staffObj);
    }

    staffMap.set(id, staffObj);
  }

  return {
    added,
    updated,
    skipped,
    errors
  };
}

/**
 * Generate CSV text for Staff List export
 */
export function exportStaffToCSV(staffList: Staff[]): string {
  const headers = ['ID Staf', 'Nama Penuh', 'Jabatan / Unit', 'Jawatan', 'Emel', 'No Telefon', 'Status'];
  const rows = staffList.map((s) => [
    `"${sanitizeCSVCell(s.id)}"`,
    `"${sanitizeCSVCell(s.name)}"`,
    `"${sanitizeCSVCell(s.department)}"`,
    `"${sanitizeCSVCell(s.position)}"`,
    `"${sanitizeCSVCell(s.email)}"`,
    `"${sanitizeCSVCell(s.phone || '')}"`,
    `"${sanitizeCSVCell(s.status)}"`
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Generate sample CSV template for download
 */
export function getSampleStaffCSV(defaultDomain: string = 'institusi.edu.my'): string {
  const cleanDomain = defaultDomain.replace(/^@/, '') || 'institusi.edu.my';
  return [
    'ID Staf,Nama Penuh,Jabatan / Unit,Jawatan,Emel,No Telefon',
    `ST010,"Dr. Amirul Husni","Jabatan Sains Komputer","Pensyarah Kanan","amirul@${cleanDomain}","+60 19-333 4455"`,
    `ST011,"Nurul Huda Abdullah","Teknologi Maklumat (IT)","Analisis Sistem","huda@${cleanDomain}","+60 17-222 8899"`
  ].join('\n');
}
