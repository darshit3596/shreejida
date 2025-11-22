import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../services/data.service';
import { Invoice } from '../../../interfaces';

@Component({
  selector: 'app-view-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './view-invoices.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewInvoicesComponent {
  private dataService = inject(DataService);
  
  invoices = this.dataService.invoices;
  searchTerm = signal('');

  filteredInvoices = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) {
      return this.invoices();
    }
    return this.invoices().filter(inv => 
      inv.customerName.toLowerCase().includes(term) || 
      inv.id.toLowerCase().includes(term)
    );
  });

  // Delete confirmation
  showDeleteModal = signal(false);
  invoiceToDelete = signal<Invoice | null>(null);
  deleteConfirmationInput = signal('');
  isDeleteConfirmed = computed(() => this.deleteConfirmationInput() === this.invoiceToDelete()?.id);

  openDeleteModal(invoice: Invoice) {
    this.invoiceToDelete.set(invoice);
    this.deleteConfirmationInput.set('');
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.invoiceToDelete.set(null);
  }

  async confirmDelete() {
    if (this.isDeleteConfirmed()) {
      await this.dataService.deleteInvoice(this.invoiceToDelete()!.id);
      this.closeDeleteModal();
    }
  }

  async toggleInvoiceStatus(invoice: Invoice) {
    const newStatus = invoice.status === 'Paid' ? 'Unpaid' : 'Paid';
    await this.dataService.updateInvoiceStatus(invoice.id, newStatus);
  }

  shareOnWhatsApp(invoice: Invoice) {
    const customerNumber = invoice.mobileNo.replace(/[^0-9]/g, '');
    if (customerNumber.length >= 10) {
      const settings = this.dataService.settings();
      if (!settings) return;
      const shopName = settings.shopName;
      
      const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { 
        style: 'currency', 
        currency: 'INR',
      }).format(value);

      let message = `*Invoice from ${shopName}*\n\n`;
      message += `Invoice No: *${invoice.id}*\n`;
      message += `Date: ${formatDate(invoice.date, 'dd-MM-yyyy', 'en-US')}\n\n`;

      message += `*Billed to:*\n`;
      message += `Name: ${invoice.customerName}\n`;
      if (invoice.vehicle) message += `Vehicle: ${invoice.vehicle}\n`;
      if (invoice.vehicleNo) message += `Vehicle No: ${invoice.vehicleNo}\n`;
      if (invoice.mobileNo) message += `Mobile: ${invoice.mobileNo}\n\n`;

      message += `-----------------------------------\n`;
      message += `*Items:*\n`;

      invoice.items.forEach((item, index) => {
        const itemAmount = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.amount);
        const itemRate = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.rate);

        message += `${index + 1}. *${item.description}*\n`;
        message += `   Qty: ${item.quantity}, Rate: ${itemRate}, Amount: ${itemAmount}\n`;
      });
      
      message += `-----------------------------------\n`;

      message += `Subtotal: ${formatCurrency(invoice.subTotal)}\n`;
      if (invoice.taxPercent > 0) {
        const taxAmount = invoice.subTotal * (invoice.taxPercent / 100);
        message += `Tax (${invoice.taxPercent}%): ${formatCurrency(taxAmount)}\n`;
      }
      if (invoice.discountAmount > 0) {
        message += `Discount: -${formatCurrency(invoice.discountAmount)}\n`;
      }
      message += `\n*Total Amount: ${formatCurrency(invoice.total)}*\n\n`;
      message += `Thank you for your business!`;

      const whatsappUrl = `https://wa.me/91${customerNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      alert('Valid 10-digit mobile number not available for this customer.');
    }
  }
}