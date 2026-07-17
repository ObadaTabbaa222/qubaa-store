'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markDelivered } from './actions';

type ReportRow = {
  order_id: string; status: string; created_at: string;
  product_id: string; product_name: string;
  student_id: string; student_name: string; student_balance: number;
  halaqah_id: string; halaqah_name: string;
  quantity: number; unit_price_points: number; line_total: number;
};

export function DeliverButton({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    if (!confirm('تأكيد أن الطالب استلم طلبه؟')) return;
    start(async () => {
      const res = await markDelivered(orderId);
      if (res?.error) alert(res.error);
      else router.refresh();
    });
  }

  return (
    <button onClick={onClick} disabled={pending} className="btn-ghost !px-2.5 !py-1 shrink-0 text-xs">
      {pending ? '...' : 'تم التسليم'}
    </button>
  );
}

const HEADER_FILL = 'FF9A1B1F';
const HEADER_TEXT = 'FFECE8DF';
const HALAQAH_FILL = 'FFAE494C';
const STUDENT_TINTS = ['FFECE8DF', 'FFE1D5C9', 'FFF5E6E4', 'FFF3E6D0'];
const BORDER: import('exceljs').Border = { style: 'thin', color: { argb: 'FFCBB9A6' } };

export function ReportActions({ rows }: { rows: ReportRow[] }) {
  const [exporting, setExporting] = useState(false);

  async function exportExcel() {
    setExporting(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('تقرير الطلبات', { views: [{ rightToLeft: true }] });

      ws.columns = [
        { header: 'الحلقة', key: 'halaqah', width: 22 },
        { header: 'الطالب', key: 'student', width: 20 },
        { header: 'المنتج', key: 'product', width: 26 },
        { header: 'الكمية', key: 'qty', width: 10 },
        { header: 'سعر الوحدة', key: 'unit', width: 12 },
        { header: 'الإجمالي', key: 'total', width: 12 },
        { header: 'الرصيد المتبقي', key: 'balance', width: 14 },
      ];

      const headerRow = ws.getRow(1);
      headerRow.height = 22;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: HEADER_TEXT } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
      });

      rows.forEach((r) => {
        ws.addRow({
          halaqah: r.halaqah_name,
          student: r.student_name,
          product: r.product_name,
          qty: r.quantity,
          unit: r.unit_price_points,
          total: r.line_total,
          balance: r.student_balance,
        });
      });

      const lastRow = rows.length + 1;
      for (let i = 2; i <= lastRow; i++) {
        ws.getRow(i).eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
          cell.alignment = { vertical: 'middle', horizontal: colNumber >= 4 ? 'center' : 'right' };
          if (colNumber >= 4) cell.numFmt = '#,##0';
        });
      }

      // تلوين متبادل لكل طالب + دمج خانتي الاسم والرصيد المتبقي عبر صفوفه
      let tintIndex = 0;
      for (let i = 2; i <= lastRow; ) {
        const studentId = rows[i - 2].student_id;
        let j = i;
        while (j <= lastRow && rows[j - 2].student_id === studentId) j++;
        const tint = STUDENT_TINTS[tintIndex % STUDENT_TINTS.length];
        for (let k = i; k < j; k++) {
          ws.getRow(k).eachCell({ includeEmpty: true }, (cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tint } };
          });
        }
        if (j - i > 1) {
          ws.mergeCells(i, 2, j - 1, 2);
          ws.mergeCells(i, 7, j - 1, 7);
        }
        tintIndex++;
        i = j;
      }

      // خانة الحلقة بلون أقوى، مدمجة عبر كل صفوف طلابها
      for (let i = 2; i <= lastRow; ) {
        const halaqahId = rows[i - 2].halaqah_id;
        let j = i;
        while (j <= lastRow && rows[j - 2].halaqah_id === halaqahId) j++;
        for (let k = i; k < j; k++) {
          const cell = ws.getCell(k, 1);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HALAQAH_FILL } };
          cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        }
        if (j - i > 1) ws.mergeCells(i, 1, j - 1, 1);
        i = j;
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'orders.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('تعذّر إنشاء ملف Excel: ' + (e?.message || 'خطأ غير متوقع'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex gap-2">
      <button onClick={() => window.print()} className="btn-ghost !px-3 !py-2 text-xs">طباعة</button>
      <button onClick={exportExcel} disabled={exporting || rows.length === 0} className="btn-ghost !px-3 !py-2 text-xs">
        {exporting ? 'جارٍ التصدير…' : 'تصدير Excel'}
      </button>
    </div>
  );
}
