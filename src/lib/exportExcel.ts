/**
 * exportReportExcel — Génère un fichier Excel (.xlsx) mis en forme
 * pour les rapports SNECEA, avec feuilles multiples et couleurs.
 */
import ExcelJS from 'exceljs';
import type { ReportStats, HabitatStats, HabitatRow } from '@/lib/api/reports';

// ── Palette ──────────────────────────────────────────────────────────
const C = {
  navy:        'FF1E3A5F',  // Entête principale
  blue:        'FF2563EB',  // Sous-entête section
  blueLight:   'FFDBEAFE',  // Ligne paire bleue claire
  green:       'FF16A34A',  // Positif
  greenLight:  'FFDCFCE7',
  amber:       'FFD97706',  // Alerte
  amberLight:  'FFFEF3C7',
  red:         'FFDC2626',  // Critique
  redLight:    'FFFEE2E2',
  purple:      'FF7C3AED',
  purpleLight: 'FFEDE9FE',
  white:       'FFFFFFFF',
  gray50:      'FFF8FAFC',
  gray200:     'FFE2E8F0',
  gray600:     'FF475569',
} as const;

type HexColor = typeof C[keyof typeof C];

// ── Helpers de style ─────────────────────────────────────────────────

function fill(fgColor: HexColor): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: fgColor } };
}

function border(): Partial<ExcelJS.Borders> {
  const side: ExcelJS.BorderStyle = 'thin';
  const color = { argb: C.gray200 };
  return { top: { style: side, color }, bottom: { style: side, color }, left: { style: side, color }, right: { style: side, color } };
}

function applyHeader(row: ExcelJS.Row, bgColor: HexColor, fontSize = 11) {
  row.eachCell((cell) => {
    cell.fill = fill(bgColor);
    cell.font = { bold: true, color: { argb: C.white }, size: fontSize };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = border();
  });
  row.height = fontSize === 14 ? 32 : 22;
}

function applyDataRow(row: ExcelJS.Row, even: boolean, numCols: number) {
  for (let i = 1; i <= numCols; i++) {
    const cell = row.getCell(i);
    cell.fill = fill(even ? C.blueLight : C.white);
    cell.font = { size: 10, color: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: i === 1 ? 'left' : 'center' };
    cell.border = border();
  }
  row.height = 18;
}

function addSectionTitle(ws: ExcelJS.Worksheet, title: string, colSpan: number) {
  ws.addRow([]);
  const row = ws.addRow([title]);
  ws.mergeCells(row.number, 1, row.number, colSpan);
  const cell = row.getCell(1);
  cell.fill = fill(C.blue);
  cell.font = { bold: true, color: { argb: C.white }, size: 11 };
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  cell.border = border();
  row.height = 22;
}

function addTableData(
  ws: ExcelJS.Worksheet,
  headers: string[],
  rows: (string | number)[][],
) {
  const hRow = ws.addRow(headers);
  applyHeader(hRow, C.navy);
  rows.forEach((r, idx) => {
    const dataRow = ws.addRow(r);
    applyDataRow(dataRow, idx % 2 === 0, headers.length);
  });
}

// ── Feuille Résumé ────────────────────────────────────────────────────

function buildSummarySheet(wb: ExcelJS.Workbook, stats: ReportStats, period: string, company: string) {
  const ws = wb.addWorksheet('Résumé', { properties: { tabColor: { argb: C.navy } } });
  ws.columns = [
    { width: 32 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
  ];

  // ── Titre principal ──
  const title = ws.addRow(['S.N.E.C.E.A — Rapport de statistiques']);
  ws.mergeCells(1, 1, 1, 4);
  const titleCell = title.getCell(1);
  titleCell.fill = fill(C.navy);
  titleCell.font = { bold: true, size: 16, color: { argb: C.white } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.border = border();
  title.height = 40;

  // ── Sous-titre ──
  const periodLabel: Record<string, string> = { week: 'Cette semaine', month: 'Ce mois', quarter: 'Ce trimestre', year: 'Cette année', all: 'Toutes périodes' };
  const sub = ws.addRow([
    `Période : ${periodLabel[period] ?? period}`,
    `Entreprise : ${company === 'all' ? 'Toutes' : company}`,
    '',
    `Généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
  ]);
  ws.mergeCells(2, 1, 2, 2);
  sub.eachCell((cell) => {
    cell.fill = fill(C.blueLight);
    cell.font = { italic: true, size: 10, color: { argb: C.gray600 } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = border();
  });
  sub.height = 20;

  ws.addRow([]);

  // ── KPI cards (2×3 grid) ──
  const kpis = [
    { label: 'Total requêtes',          value: stats.total,                suffix: '',  color: C.navy,   bg: C.blueLight },
    { label: 'En cours',                value: stats.in_progress,           suffix: '',  color: C.amber,  bg: C.amberLight },
    { label: 'Résolus',                 value: stats.resolved,              suffix: '',  color: C.green,  bg: C.greenLight },
    { label: 'Taux de résolution',      value: stats.resolution_rate,       suffix: '%', color: C.green,  bg: C.greenLight },
    { label: 'Temps moyen résolution',  value: stats.avg_resolution_days,   suffix: 'j', color: C.blue,   bg: C.blueLight },
    { label: 'Tendance (total)',         value: stats.total_trend >= 0 ? `+${stats.total_trend}` : String(stats.total_trend), suffix: '%', color: stats.total_trend >= 0 ? C.green : C.red, bg: stats.total_trend >= 0 ? C.greenLight : C.redLight },
  ];

  const kpiHeader = ws.addRow(['Indicateur', 'Valeur', 'Indicateur', 'Valeur']);
  applyHeader(kpiHeader, C.blue);

  for (let i = 0; i < kpis.length; i += 2) {
    const left = kpis[i];
    const right = kpis[i + 1];
    const row = ws.addRow([
      left.label,
      `${left.value}${left.suffix}`,
      right ? right.label : '',
      right ? `${right.value}${right.suffix}` : '',
    ]);

    const setKpiCell = (colIdx: number, kpi: typeof left) => {
      const labelCell = row.getCell(colIdx);
      labelCell.fill = fill(C.gray50);
      labelCell.font = { bold: false, size: 10, color: { argb: C.gray600 } };
      labelCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      labelCell.border = border();

      const valCell = row.getCell(colIdx + 1);
      valCell.fill = fill(kpi.bg);
      valCell.font = { bold: true, size: 13, color: { argb: kpi.color } };
      valCell.alignment = { vertical: 'middle', horizontal: 'center' };
      valCell.border = border();
    };

    setKpiCell(1, left);
    if (right) setKpiCell(3, right);
    row.height = 28;
  }
}

// ── Feuille générique avec données ───────────────────────────────────

function buildDataSheet(
  wb: ExcelJS.Workbook,
  name: string,
  tabColor: HexColor,
  sections: { title: string; headers: string[]; rows: (string | number)[][] }[],
) {
  const ws = wb.addWorksheet(name, { properties: { tabColor: { argb: tabColor } } });

  // Calcul largeur colonnes
  const maxCols = Math.max(...sections.map(s => s.headers.length));
  ws.columns = Array.from({ length: maxCols }, (_, i) => ({ width: i === 0 ? 35 : 18 }));

  // Titre de la feuille
  const titleRow = ws.addRow([name]);
  ws.mergeCells(1, 1, 1, maxCols);
  const tc = titleRow.getCell(1);
  tc.fill = fill(C.navy);
  tc.font = { bold: true, size: 14, color: { argb: C.white } };
  tc.alignment = { vertical: 'middle', horizontal: 'center' };
  tc.border = border();
  titleRow.height = 30;

  for (const section of sections) {
    addSectionTitle(ws, section.title, maxCols);
    addTableData(ws, section.headers, section.rows);
  }
}

// ── Feuille Tendance mensuelle ────────────────────────────────────────

function buildTrendSheet(wb: ExcelJS.Workbook, stats: ReportStats) {
  const ws = wb.addWorksheet('Tendance mensuelle', { properties: { tabColor: { argb: C.purple } } });
  ws.columns = [{ width: 20 }, { width: 16 }, { width: 16 }, { width: 16 }];

  const titleRow = ws.addRow(['Tendance mensuelle des requêtes']);
  ws.mergeCells(1, 1, 1, 4);
  const tc = titleRow.getCell(1);
  tc.fill = fill(C.navy);
  tc.font = { bold: true, size: 14, color: { argb: C.white } };
  tc.alignment = { vertical: 'middle', horizontal: 'center' };
  tc.border = border();
  titleRow.height = 30;

  ws.addRow([]);
  const hRow = ws.addRow(['Mois', 'Nouveaux', 'Résolus', 'En cours']);
  applyHeader(hRow, C.navy);

  stats.monthly_trend.forEach((m, idx) => {
    const row = ws.addRow([m.month, m.nouveaux, m.resolus, m.enCours]);
    const even = idx % 2 === 0;
    row.getCell(1).fill = fill(even ? C.purpleLight : C.white);
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(1).border = border();

    const colColors: [number, HexColor][] = [
      [2, C.blueLight],
      [3, C.greenLight],
      [4, C.amberLight],
    ];
    colColors.forEach(([col, bg]) => {
      const cell = row.getCell(col);
      cell.fill = fill(even ? bg : C.white);
      cell.font = { bold: false, size: 10 };
      cell.alignment = { horizontal: 'center' };
      cell.border = border();
    });
    row.height = 18;
  });

  ws.addRow([]);
  const hRow2 = ws.addRow(['Jour de la semaine', 'Tickets']);
  applyHeader(hRow2, C.blue);
  stats.weekly_distribution.forEach((w, idx) => {
    const row = ws.addRow([w.jour, w.tickets]);
    applyDataRow(row, idx % 2 === 0, 2);
  });
}

// ── Export principal ──────────────────────────────────────────────────

export async function exportReportExcel(stats: ReportStats, period: string, company: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'S.N.E.C.E.A';
  wb.created = new Date();

  // Feuille 1 : Résumé KPIs
  buildSummarySheet(wb, stats, period, company);

  // Feuille 2 : Urgence + Statut
  buildDataSheet(wb, 'Urgences & Statuts', C.amber, [
    {
      title: 'Répartition par niveau d\'urgence',
      headers: ['Urgence', 'Nombre de tickets'],
      rows: stats.by_urgency.map(u => [u.name, u.value]),
    },
    {
      title: 'Répartition par statut',
      headers: ['Statut', 'Nombre de tickets'],
      rows: stats.by_status.map(s => [s.name, s.value]),
    },
  ]);

  // Feuille 3 : Entreprises
  buildDataSheet(wb, 'Par entreprise', C.green, [
    {
      title: 'Requêtes par entreprise',
      headers: ['Entreprise', 'Nombre de tickets'],
      rows: stats.by_company.map(c => [c.company_name, c.count]),
    },
  ]);

  // Feuille 4 : Pôles & Types
  buildDataSheet(wb, 'Pôles & Types', C.blue, [
    {
      title: 'Requêtes par pôle',
      headers: ['Pôle', 'Nombre de tickets'],
      rows: stats.by_pole.map(p => [p.pole_name, p.count]),
    },
    {
      title: 'Requêtes par type',
      headers: ['Type de requête', 'Nombre de tickets'],
      rows: stats.by_type.map(t => [t.type_label, t.count]),
    },
    {
      title: 'Temps de résolution par type',
      headers: ['Type de requête', 'Jours moyens'],
      rows: stats.resolution_by_type.map(r => [r.type, r.jours]),
    },
  ]);

  // Feuille 5 : Tendance mensuelle
  buildTrendSheet(wb, stats);

  // ── Téléchargement ──
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const periodLabel: Record<string, string> = { week: 'semaine', month: 'mois', quarter: 'trimestre', year: 'annee', all: 'complet' };
  a.download = `rapport-snecea-${periodLabel[period] ?? period}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Habitat Excel ─────────────────────────────────────────────────────

function fmt(v: string | number | undefined): string | number {
  if (v === undefined || v === null || v === '') return '—';
  return v;
}

function numFmt(v: string | number | undefined): number | string {
  if (v === undefined || v === null || v === '') return '';
  const n = Number(v);
  return isNaN(n) ? '' : n;
}

function buildHabitatSummary(wb: ExcelJS.Workbook, stats: HabitatStats, period: string) {
  const ws = wb.addWorksheet('Tableau de bord', { properties: { tabColor: { argb: C.navy } } });
  ws.columns = [{ width: 36 }, { width: 24 }, { width: 24 }, { width: 24 }];

  const periodLabel: Record<string, string> = { month: 'Ce mois', quarter: 'Ce trimestre', year: 'Cette année', all: 'Toutes périodes' };

  // Titre
  const t = ws.addRow(['S.N.E.C.E.A — Rapport Décisionnel Pôle Habitat']);
  ws.mergeCells(1, 1, 1, 4);
  const tc = t.getCell(1);
  tc.fill = fill(C.navy); tc.font = { bold: true, size: 16, color: { argb: C.white } };
  tc.alignment = { vertical: 'middle', horizontal: 'center' }; tc.border = border(); t.height = 42;

  const sub = ws.addRow([`Période : ${periodLabel[period] ?? period}`, '', '', `Généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`]);
  ws.mergeCells(2, 1, 2, 3);
  sub.eachCell(c => { c.fill = fill(C.blueLight); c.font = { italic: true, size: 10, color: { argb: C.gray600 } }; c.alignment = { vertical: 'middle', horizontal: 'center' }; c.border = border(); });
  sub.height = 20;
  ws.addRow([]);

  // KPIs principaux
  const kpiH = ws.addRow(['Indicateur clé', 'Valeur', 'Indicateur clé', 'Valeur']);
  applyHeader(kpiH, C.blue);

  const kpis = [
    { label: 'Total demandes reçues',         value: stats.total,                                          bg: C.blueLight,   color: C.navy },
    { label: 'Budget global mobilisable',      value: stats.budget_total.toLocaleString('fr-FR') + ' FCFA', bg: C.greenLight,  color: C.green },
    { label: 'Budget moyen / demande',         value: stats.budget_moyen.toLocaleString('fr-FR') + ' FCFA', bg: C.amberLight,  color: C.amber },
    { label: 'Mensualité moyenne',             value: stats.mensualite_moyenne.toLocaleString('fr-FR') + ' FCFA', bg: C.purpleLight, color: C.purple },
    { label: 'Superficie moyenne demandée',    value: stats.superficie_moyenne > 0 ? stats.superficie_moyenne.toLocaleString('fr-FR') + ' m²' : '—', bg: C.blueLight, color: C.navy },
    { label: 'Total terrains déclarés',        value: (stats.nb_terrains_total ?? 0) > 0 ? (stats.nb_terrains_total ?? 0).toLocaleString('fr-FR') : '—', bg: C.greenLight, color: C.green },
    { label: 'Demandes avec budget renseigné', value: `${stats.nb_with_budget} / ${stats.total}`, bg: C.gray50, color: C.gray600 },
    { label: 'Demandes avec nb terrains',      value: `${stats.nb_with_terrains ?? 0} / ${stats.total}`, bg: C.gray50, color: C.gray600 },
  ];

  for (let i = 0; i < kpis.length; i += 2) {
    const L = kpis[i], R = kpis[i + 1];
    const row = ws.addRow([L.label, L.value, R?.label ?? '', R?.value ?? '']);
    ([[1, L], [3, R]] as [number, typeof L][]).forEach(([col, k]) => {
      if (!k) return;
      const lc = row.getCell(col); lc.fill = fill(C.gray50); lc.font = { size: 10, color: { argb: C.gray600 } }; lc.alignment = { vertical: 'middle', indent: 1 }; lc.border = border();
      const vc = row.getCell(col + 1); vc.fill = fill(k.bg); vc.font = { bold: true, size: 13, color: { argb: k.color } }; vc.alignment = { vertical: 'middle', horizontal: 'center' }; vc.border = border();
    });
    row.height = 28;
  }

  ws.addRow([]);

  // Top régions
  addSectionTitle(ws, '🗺  Zones les plus demandées (Régions)', 4);
  addTableData(ws, ['Région', 'Nb demandes', 'Part (%)'], stats.by_region.map(r => [
    r.label,
    r.count,
    stats.total > 0 ? Math.round((r.count / stats.total) * 100) + '%' : '—',
  ]));

  ws.addRow([]);

  // Type de bien
  addSectionTitle(ws, '🏠  Répartition par type de bien', 4);
  addTableData(ws, ['Type de bien', 'Nb demandes', 'Part (%)'], stats.by_type_bien.map(r => [
    r.label,
    r.count,
    stats.total > 0 ? Math.round((r.count / stats.total) * 100) + '%' : '—',
  ]));
}

function buildHabitatZones(wb: ExcelJS.Workbook, stats: HabitatStats) {
  const ws = wb.addWorksheet('Analyse géographique', { properties: { tabColor: { argb: C.green } } });
  ws.columns = [{ width: 30 }, { width: 18 }, { width: 18 }, { width: 18 }];

  const t = ws.addRow(['Analyse Géographique — Pôle Habitat']);
  ws.mergeCells(1, 1, 1, 4);
  const tc = t.getCell(1); tc.fill = fill(C.navy); tc.font = { bold: true, size: 14, color: { argb: C.white } };
  tc.alignment = { vertical: 'middle', horizontal: 'center' }; tc.border = border(); t.height = 30;

  addSectionTitle(ws, 'Par Région', 4);
  addTableData(ws, ['Région', 'Nb demandes', 'Part (%)'], stats.by_region.map((r, _, arr) => {
    const total = arr.reduce((s, x) => s + x.count, 0);
    return [r.label, r.count, total > 0 ? Math.round((r.count / total) * 100) + '%' : '—'];
  }));

  ws.addRow([]);
  addSectionTitle(ws, 'Par Ville (Top 10)', 4);
  addTableData(ws, ['Ville', 'Nb demandes', 'Part (%)'], stats.by_ville.map((v, _, arr) => {
    const total = arr.reduce((s, x) => s + x.count, 0);
    return [v.label, v.count, total > 0 ? Math.round((v.count / total) * 100) + '%' : '—'];
  }));

  ws.addRow([]);
  addSectionTitle(ws, 'Par Commune (Top 10)', 4);
  const byCommune = stats.by_commune ?? [];
  if (byCommune.length === 0) {
    ws.addRow(['Aucune commune renseignée']);
  } else {
    addTableData(ws, ['Commune', 'Nb demandes', 'Part (%)'], byCommune.map((c, _, arr) => {
      const total = arr.reduce((s, x) => s + x.count, 0);
      return [c.label, c.count, total > 0 ? Math.round((c.count / total) * 100) + '%' : '—'];
    }));
  }
}

function buildHabitatFinancier(wb: ExcelJS.Workbook, stats: HabitatStats, rows: HabitatRow[]) {
  const ws = wb.addWorksheet('Analyse financière', { properties: { tabColor: { argb: C.green } } });
  ws.columns = [{ width: 26 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }];

  const t = ws.addRow(['Analyse Financière — Pôle Habitat']);
  ws.mergeCells(1, 1, 1, 5);
  const tc = t.getCell(1); tc.fill = fill(C.navy); tc.font = { bold: true, size: 14, color: { argb: C.white } };
  tc.alignment = { vertical: 'middle', horizontal: 'center' }; tc.border = border(); t.height = 30;

  addSectionTitle(ws, 'Synthèse financière', 5);
  addTableData(ws, ['Indicateur', 'Valeur'], [
    ['Budget global mobilisable',        stats.budget_total.toLocaleString('fr-FR') + ' FCFA'],
    ['Budget moyen par demande',         stats.budget_moyen.toLocaleString('fr-FR') + ' FCFA'],
    ['Mensualité moyenne à rembourser',  stats.mensualite_moyenne.toLocaleString('fr-FR') + ' FCFA'],
    ['Superficie moyenne demandée',      stats.superficie_moyenne > 0 ? stats.superficie_moyenne.toLocaleString('fr-FR') + ' m²' : '—'],
    ['Total terrains déclarés',          (stats.nb_terrains_total ?? 0) > 0 ? (stats.nb_terrains_total ?? 0).toLocaleString('fr-FR') : '—'],
    ['Demandes avec budget renseigné',   `${stats.nb_with_budget} / ${stats.total}`],
  ]);

  ws.addRow([]);
  addSectionTitle(ws, 'Distribution des budgets par tranche (FCFA)', 5);
  const budgetTranches = stats.budget_tranches ?? [];
  if (budgetTranches.length === 0) {
    ws.addRow(['Aucune donnée disponible']);
  } else {
    addTableData(ws, ['Tranche de budget', 'Nb demandes', 'Part (%)'], budgetTranches.map((t, _, arr) => {
      const total = arr.reduce((s, x) => s + x.count, 0);
      return [t.label, t.count, total > 0 ? Math.round((t.count / total) * 100) + '%' : '—'];
    }));
  }

  ws.addRow([]);
  addSectionTitle(ws, 'Budget moyen par type de bien', 5);
  const budgetByType = stats.budget_by_type ?? [];
  if (budgetByType.length === 0) {
    ws.addRow(['Aucune donnée disponible']);
  } else {
    addTableData(ws, ['Type de bien', 'Budget moyen (FCFA)'], budgetByType.map(b => [
      b.label, b.budget_moyen.toLocaleString('fr-FR') + ' FCFA',
    ]));
  }

  ws.addRow([]);
  addSectionTitle(ws, 'Mensualité moyenne par type de bien', 5);
  const mensualiteByType = stats.mensualite_by_type ?? [];
  if (mensualiteByType.length === 0) {
    ws.addRow(['Aucune donnée disponible']);
  } else {
    addTableData(ws, ['Type de bien', 'Mensualité moyenne (FCFA/mois)'], mensualiteByType.map(m => [
      m.label, m.mensualite_moyenne.toLocaleString('fr-FR') + ' FCFA',
    ]));
  }

  ws.addRow([]);
  addSectionTitle(ws, 'Budget par zone (Top régions)', 5);

  // Calcul budget moyen par région depuis les lignes brutes
  const regionBudget: Record<string, { total: number; count: number }> = {};
  for (const row of rows) {
    const b = Number(row.budget);
    if (row.region && !isNaN(b) && b > 0) {
      if (!regionBudget[row.region]) regionBudget[row.region] = { total: 0, count: 0 };
      regionBudget[row.region].total += b;
      regionBudget[row.region].count += 1;
    }
  }
  const regionBudgetRows = Object.entries(regionBudget)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([region, { total, count }]) => [
      region,
      count,
      Math.round(total).toLocaleString('fr-FR') + ' FCFA',
      Math.round(total / count).toLocaleString('fr-FR') + ' FCFA',
    ]);
  addTableData(ws, ['Région', 'Nb demandes', 'Budget total', 'Budget moyen'], regionBudgetRows);
}

function buildHabitatFoncier(wb: ExcelJS.Workbook, stats: HabitatStats) {
  const ws = wb.addWorksheet('Foncier & Type de bien', { properties: { tabColor: { argb: C.amber } } });
  ws.columns = [{ width: 28 }, { width: 18 }, { width: 18 }];

  const t = ws.addRow(['Analyse Foncière et Type de Bien — Pôle Habitat']);
  ws.mergeCells(1, 1, 1, 3);
  const tc = t.getCell(1); tc.fill = fill(C.navy); tc.font = { bold: true, size: 14, color: { argb: C.white } };
  tc.alignment = { vertical: 'middle', horizontal: 'center' }; tc.border = border(); t.height = 30;

  addSectionTitle(ws, 'Type de bien demandé', 3);
  addTableData(ws, ['Type de bien', 'Nb demandes', 'Part (%)'], stats.by_type_bien.map((r, _, arr) => {
    const total = arr.reduce((s, x) => s + x.count, 0);
    return [r.label, r.count, total > 0 ? Math.round((r.count / total) * 100) + '%' : '—'];
  }));

  ws.addRow([]);
  addSectionTitle(ws, 'Titre du terrain', 3);
  addTableData(ws, ['Titre foncier', 'Nb demandes', 'Part (%)'], stats.by_titre_foncier.map((r, _, arr) => {
    const total = arr.reduce((s, x) => s + x.count, 0);
    return [r.label, r.count, total > 0 ? Math.round((r.count / total) * 100) + '%' : '—'];
  }));

  ws.addRow([]);
  addSectionTitle(ws, 'Données foncières', 3);
  addTableData(ws, ['Indicateur', 'Valeur'], [
    ['Superficie moyenne demandée', stats.superficie_moyenne > 0 ? stats.superficie_moyenne.toLocaleString('fr-FR') + ' m²' : '—'],
    ['Total terrains déclarés', (stats.nb_terrains_total ?? 0) > 0 ? (stats.nb_terrains_total ?? 0).toLocaleString('fr-FR') : '—'],
    ['Demandes avec nb terrains renseigné', `${stats.nb_with_terrains ?? 0} / ${stats.total}`],
  ]);
}

function buildHabitatRawData(wb: ExcelJS.Workbook, rows: HabitatRow[]) {
  const ws = wb.addWorksheet('Données individuelles', { properties: { tabColor: { argb: C.purple } } });
  ws.columns = [
    { header: 'Date',             width: 14 },
    { header: 'Demandeur',        width: 24 },
    { header: 'Compagnie',        width: 22 },
    { header: 'Type de bien',     width: 16 },
    { header: 'Budget (FCFA)',    width: 18 },
    { header: 'Titre foncier',    width: 18 },
    { header: 'Superficie (m²)',  width: 16 },
    { header: 'Nb terrains',      width: 13 },
    { header: 'Mensualité (FCFA)', width: 18 },
    { header: 'Région',           width: 18 },
    { header: 'Ville',            width: 16 },
    { header: 'Commune',          width: 16 },
  ];

  const t = ws.addRow(['Données individuelles — Demandes Habitat']);
  ws.mergeCells(1, 1, 1, 12);
  const tc = t.getCell(1); tc.fill = fill(C.navy); tc.font = { bold: true, size: 14, color: { argb: C.white } };
  tc.alignment = { vertical: 'middle', horizontal: 'center' }; tc.border = border(); t.height = 30;
  ws.addRow([]);

  const hRow = ws.addRow(['Date','Demandeur','Compagnie','Type de bien','Budget (FCFA)','Titre foncier','Superficie (m²)','Nb terrains','Mensualité (FCFA)','Région','Ville','Commune']);
  applyHeader(hRow, C.navy);

  rows.forEach((r, idx) => {
    const row = ws.addRow([
      fmt(r.date), fmt(r.demandeur), fmt(r.company),
      fmt(r.type_bien), numFmt(r.budget), fmt(r.titre_foncier),
      numFmt(r.superficie), numFmt(r.nb_terrains), numFmt(r.mensualite),
      fmt(r.region), fmt(r.ville), fmt(r.commune),
    ]);
    const even = idx % 2 === 0;
    row.eachCell((cell, col) => {
      const numCols = [5, 7, 8, 9];
      cell.fill = fill(even ? (numCols.includes(col) ? C.greenLight : C.blueLight) : C.white);
      cell.font = { size: 10, color: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: numCols.includes(col) ? 'right' : col === 1 ? 'center' : 'left' };
      cell.border = border();
      if (numCols.includes(col)) {
        const n = typeof cell.value === 'number' ? cell.value : Number(cell.value);
        if (!isNaN(n) && n > 0) cell.numFmt = '#,##0';
      }
    });
    row.height = 18;
  });

  // Ligne total budget
  if (rows.length > 0) {
    ws.addRow([]);
    const budgets = rows.map(r => Number(r.budget)).filter(n => !isNaN(n) && n > 0);
    const totalRow = ws.addRow(['TOTAL', `${rows.length} demandes`, '', '', budgets.reduce((a, b) => a + b, 0), '', '', '', '', '', '', '']);
    totalRow.eachCell((cell, col) => {
      cell.fill = fill(C.navy); cell.font = { bold: true, color: { argb: C.white }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: col === 5 ? 'right' : 'center' };
      cell.border = border();
      if (col === 5) cell.numFmt = '#,##0';
    });
    totalRow.height = 24;
  }
}

export async function exportHabitatExcel(
  stats: HabitatStats,
  rows: HabitatRow[],
  period: string,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'S.N.E.C.E.A — Pôle Habitat';
  wb.created = new Date();

  buildHabitatSummary(wb, stats, period);
  buildHabitatZones(wb, stats);
  buildHabitatFinancier(wb, stats, rows);
  buildHabitatFoncier(wb, stats);
  buildHabitatRawData(wb, rows);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const periodLabel: Record<string, string> = { month: 'mois', quarter: 'trimestre', year: 'annee', all: 'complet' };
  a.download = `habitat-snecea-${periodLabel[period] ?? period}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
