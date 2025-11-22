
import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { DataService } from '../../services/data.service';
import { Invoice } from '../../interfaces';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private dataService = inject(DataService);
  
  today = new Date();
  
  todayStats = computed(() => {
    const todayStr = this.today.toISOString().split('T')[0];
    const todaysInvoices = this.dataService.invoices().filter(inv => inv.date.startsWith(todayStr));
    const totalSales = todaysInvoices.reduce((acc, inv) => acc + inv.total, 0);
    return {
      sales: totalSales,
      invoiceCount: todaysInvoices.length,
    };
  });

  lowStockItems = computed(() => {
    return this.dataService.inventory().filter(item => 
      item.quantity !== -1 && item.quantity <= item.minStock
    );
  });
  
  unpaidInvoices = computed(() => {
    return this.dataService.invoices().filter(inv => inv.status === 'Unpaid');
  });

  totalUnpaidAmount = computed(() => {
    return this.unpaidInvoices().reduce((acc, inv) => acc + inv.total, 0);
  });

  sendPaymentReminder(invoice: Invoice) {
    const customerNumber = invoice.mobileNo.replace(/[^0-9]/g, '');
    if (customerNumber.length >= 10) {
        const settings = this.dataService.settings();
        const shopName = settings.shopName;
        
        const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { 
            style: 'currency', 
            currency: 'INR',
        }).format(value);

        let message = `*Payment Reminder from ${shopName}*\n\n`;
        message += `Hello ${invoice.customerName},\n\n`;
        message += `This is a friendly reminder regarding your unpaid invoice.\n\n`;
        message += `*Invoice No:* ${invoice.id}\n`;
        message += `*Date:* ${formatDate(invoice.date, 'dd-MM-yyyy', 'en-US')}\n`;
        message += `*Amount Due:* *${formatCurrency(invoice.total)}*\n\n`;
        message += `Please make the payment at your earliest convenience.\n\n`;
        message += `Thank you,\n${shopName}`;

        const whatsappUrl = `https://wa.me/91${customerNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    } else {
        alert('Valid 10-digit mobile number not available for this customer to send a reminder.');
    }
  }
}