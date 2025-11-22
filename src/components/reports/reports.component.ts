
import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reports.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsComponent {
  private dataService = inject(DataService);
  private fb = inject(FormBuilder);

  reportForm = this.fb.group({
    reportType: ['daily'],
    customStartDate: [formatDate(new Date(), 'yyyy-MM-dd', 'en-US')],
    customEndDate: [formatDate(new Date(), 'yyyy-MM-dd', 'en-US')],
  });

  filteredInvoices = computed(() => {
    const allInvoices = this.dataService.invoices();
    const { reportType, customStartDate, customEndDate } = this.reportForm.value;
    const today = new Date();

    let startDate: Date;
    let endDate: Date;

    switch (reportType) {
      case 'daily':
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        break;
      case 'monthly':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'yearly':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'custom':
        if (!customStartDate || !customEndDate) return [];
        startDate = new Date(customStartDate);
        startDate.setHours(0,0,0,0);
        endDate = new Date(customEndDate);
        endDate.setHours(23,59,59,999);
        break;
      default:
        return [];
    }

    return allInvoices.filter(invoice => {
      // Ensure invoice date is parsed correctly, assuming yyyy-MM-dd format
      const invoiceDate = new Date(invoice.date + 'T00:00:00');
      return invoiceDate >= startDate && invoiceDate <= endDate;
    });
  });

  reportSummary = computed(() => {
    const invoices = this.filteredInvoices();
    const totalSales = invoices.reduce((acc, inv) => acc + inv.total, 0);
    const totalTax = invoices.reduce((acc, inv) => acc + (inv.subTotal * inv.taxPercent / 100), 0);
    const totalDiscount = invoices.reduce((acc, inv) => acc + inv.discountAmount, 0);
    return {
      totalSales,
      totalTax,
      totalDiscount,
      invoiceCount: invoices.length,
    };
  });

  private escapeCsvCell(cell: any): string {
    const cellStr = String(cell ?? '');
    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
      return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return cellStr;
  }
  
  downloadReport() {
    const invoices = this.filteredInvoices();
    if (invoices.length === 0) return;

    const headers = [
      'Invoice #', 'Customer Name', 'Date', 'Status', 
      'Subtotal', 'Tax %', 'Tax Amount', 'Discount', 'Total'
    ];
    
    const rows = invoices.map(inv => [
      inv.id,
      inv.customerName,
      formatDate(inv.date, 'dd-MM-yyyy', 'en-US'),
      inv.status,
      inv.subTotal.toFixed(2),
      inv.taxPercent,
      (inv.subTotal * inv.taxPercent / 100).toFixed(2),
      inv.discountAmount.toFixed(2),
      inv.total.toFixed(2)
    ].map(this.escapeCsvCell).join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${this.getFormattedDateRange()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private getFormattedDateRange(): string {
    const { reportType, customStartDate, customEndDate } = this.reportForm.value;
    const today = new Date();
    switch(reportType) {
      case 'daily':
        return formatDate(today, 'yyyy-MM-dd', 'en-US');
      case 'monthly':
        return formatDate(today, 'yyyy-MM', 'en-US');
      case 'yearly':
        return formatDate(today, 'yyyy', 'en-US');
      case 'custom':
        return `${customStartDate}_to_${customEndDate}`;
      default:
        return formatDate(today, 'yyyy-MM-dd', 'en-US');
    }
  }
}
