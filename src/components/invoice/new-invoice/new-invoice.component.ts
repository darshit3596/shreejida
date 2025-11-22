import { Component, ChangeDetectionStrategy, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { DataService } from '../../../services/data.service';
import { Subscription } from 'rxjs';
import { Invoice } from '../../../interfaces';

@Component({
  selector: 'app-new-invoice',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './new-invoice.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewInvoiceComponent implements OnDestroy {
  private dataService = inject(DataService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  
  private itemsSub: Subscription | undefined;
  private taxSub: Subscription | undefined;
  private discountSub: Subscription | undefined;

  invoiceNumber = this.dataService.nextInvoiceNumber;
  inventory = this.dataService.inventory;

  invoiceForm = this.fb.group({
    customerName: ['', Validators.required],
    vehicle: [''],
    vehicleNo: [''],
    mobileNo: ['', [Validators.pattern('^[0-9]{10}$')]],
    km: [''],
    date: [formatDate(new Date(), 'yyyy-MM-dd', 'en-US'), Validators.required],
    items: this.fb.array([], [Validators.required, Validators.minLength(1)]),
    taxPercent: [0, [Validators.required, Validators.min(0)]],
    discountAmount: [0, [Validators.required, Validators.min(0)]],
    status: ['Paid', Validators.required]
  });

  subTotal = signal(0);
  taxAmount = signal(0);
  grandTotal = signal(0);

  constructor() {
    this.addItem();
    this.itemsSub = this.items.valueChanges.subscribe(() => this.recalculateTotals());
    this.taxSub = this.invoiceForm.get('taxPercent')?.valueChanges.subscribe(() => this.recalculateTotals());
    this.discountSub = this.invoiceForm.get('discountAmount')?.valueChanges.subscribe(() => this.recalculateTotals());
    this.recalculateTotals();
  }

  ngOnDestroy(): void {
    this.itemsSub?.unsubscribe();
    this.taxSub?.unsubscribe();
    this.discountSub?.unsubscribe();
  }

  get items(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  addItem() {
    const itemForm = this.fb.group({
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      rate: [0, [Validators.required, Validators.min(0)]],
      amount: [{ value: 0, disabled: true }]
    });

    itemForm.get('description')?.valueChanges.subscribe(desc => {
      const selectedItem = this.inventory().find(i => i.name === desc);
      if (selectedItem) {
        itemForm.get('rate')?.setValue(selectedItem.price);
      }
    });

    itemForm.get('quantity')?.valueChanges.subscribe(() => this.updateAmount(itemForm));
    itemForm.get('rate')?.valueChanges.subscribe(() => this.updateAmount(itemForm));

    this.items.push(itemForm);
    this.updateAmount(itemForm);
  }

  removeItem(index: number) {
    this.items.removeAt(index);
  }

  updateAmount(itemForm: AbstractControl) {
    const qty = itemForm.get('quantity')?.value || 0;
    const rate = itemForm.get('rate')?.value || 0;
    itemForm.patchValue({ amount: qty * rate }, { emitEvent: false });
  }
  
  recalculateTotals() {
    const itemsValue = this.items.getRawValue();
    const sub = itemsValue.reduce((acc, item) => {
      const quantity = item.quantity || 0;
      const rate = item.rate || 0;
      return acc + (quantity * rate);
    }, 0);
    this.subTotal.set(sub);

    const taxPercent = this.invoiceForm.get('taxPercent')?.value || 0;
    const tax = sub * (taxPercent / 100);
    this.taxAmount.set(tax);

    const discount = this.invoiceForm.get('discountAmount')?.value || 0;
    
    const grand = sub + tax - discount;
    this.grandTotal.set(grand);
  }

  private async saveInvoice(): Promise<string | null> {
    this.invoiceForm.markAllAsTouched();
    if (this.invoiceForm.invalid) {
      return null;
    }
    
    const formValue = this.invoiceForm.getRawValue();

    const invoiceToSave: Omit<Invoice, 'id'> = {
      customerName: formValue.customerName,
      vehicle: formValue.vehicle,
      vehicleNo: formValue.vehicleNo,
      mobileNo: formValue.mobileNo,
      km: formValue.km,
      date: formValue.date || new Date().toISOString(),
      items: formValue.items.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: (item.quantity || 0) * (item.rate || 0)
      })),
      subTotal: this.subTotal(),
      taxPercent: formValue.taxPercent!,
      discountAmount: formValue.discountAmount!,
      total: this.grandTotal(),
      status: formValue.status! as 'Paid' | 'Unpaid'
    };
    
    const savedInvoiceId = await this.dataService.addInvoice(invoiceToSave);

    return savedInvoiceId;
  }

  async generateAndSaveInvoice() {
    const savedInvoiceId = await this.saveInvoice();
    if (savedInvoiceId) {
      this.router.navigate(['/view-invoices']);
    }
  }

  async generateAndPrintInvoice() {
    const savedInvoiceId = await this.saveInvoice();
    if (savedInvoiceId) {
      this.router.navigate(['/print-invoice', savedInvoiceId]);
    }
  }
}