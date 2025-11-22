import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DataService } from '../../../services/data.service';
import { Invoice } from '../../../interfaces';
import { toWords } from '../../../utils/number-to-words';

@Component({
  selector: 'app-print-invoice',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './print-invoice.component.html',
  styleUrls: ['./print-invoice.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintInvoiceComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dataService = inject(DataService);
  
  invoice = signal<Invoice | null>(null);
  settings = this.dataService.settings;

  amountInWords = computed(() => {
    const total = this.invoice()?.total;
    if (total === undefined || total === null) {
      return '';
    }
    return toWords(total);
  });

  constructor() {
    const invoiceId = this.route.snapshot.paramMap.get('id');
    if (invoiceId) {
      const foundInvoice = this.dataService.getInvoiceById(invoiceId);
      if (foundInvoice) {
        this.invoice.set(foundInvoice);
      } else {
        // Handle invoice not found
        this.router.navigate(['/view-invoices']);
      }
    }
  }

  print() {
    if (confirm('Are you sure you want to print this invoice?')) {
      window.print();
    }
  }
}
