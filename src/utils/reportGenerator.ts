import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';

// Extend jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

// Fetches data for the report
const getReportData = async (year: number, month: number) => {
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0).toISOString();

  const { data, error } = await supabase
    .from('payment_transactions')
    .select('created_at, amount, status, user_id')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (error) {
    console.error('Error fetching report data:', error);
    return [];
  }

  return data;
};

// Generates a CSV report
export const generateCsvReport = async (year: number, month: number) => {
  const data = await getReportData(year, month);
  const csv = Papa.unparse(data);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `report-${year}-${month}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Generates a PDF report
export const generatePdfReport = async (year: number, month: number) => {
  const data = await getReportData(year, month);
  const doc = new jsPDF() as jsPDFWithAutoTable;

  doc.text(`Report for ${year}-${month}`, 14, 16);

  doc.autoTable({
    head: [['Date', 'Amount', 'Status', 'User ID']],
    body: data.map(row => [
      new Date(row.created_at).toLocaleDateString(),
      row.amount,
      row.status,
      row.user_id
    ]),
    startY: 20
  });

  doc.save(`report-${year}-${month}.pdf`);
};
