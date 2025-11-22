import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { InventoryItem } from '../../interfaces';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inventory.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryComponent {
  private dataService = inject(DataService);
  private fb = inject(FormBuilder);

  inventory = this.dataService.inventory;
  
  showModal = signal(false);
  isEditMode = signal(false);
  editingItemId = signal<string | null>(null);

  inventoryForm = this.fb.group({
    name: ['', Validators.required],
    quantity: [0, [Validators.required, Validators.min(0)]],
    isInfinite: [false],
    price: [0, [Validators.required, Validators.min(0)]],
    minStock: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    this.inventoryForm.get('isInfinite')?.valueChanges.subscribe(isInfinite => {
      const quantityControl = this.inventoryForm.get('quantity');
      if (isInfinite) {
        quantityControl?.disable();
        quantityControl?.setValue(0);
      } else {
        quantityControl?.enable();
      }
    });
  }

  openAddModal() {
    this.isEditMode.set(false);
    this.inventoryForm.reset({ quantity: 0, price: 0, minStock: 0, isInfinite: false });
    this.inventoryForm.get('quantity')?.enable();
    this.showModal.set(true);
  }

  openEditModal(item: InventoryItem) {
    this.isEditMode.set(true);
    this.editingItemId.set(item.id);
    this.inventoryForm.patchValue({
      name: item.name,
      price: item.price,
      minStock: item.minStock,
      isInfinite: item.quantity === -1,
      quantity: item.quantity === -1 ? 0 : item.quantity,
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingItemId.set(null);
  }

  async saveItem() {
    if (this.inventoryForm.invalid) {
      return;
    }

    const formValue = this.inventoryForm.getRawValue();

    const itemData = {
      name: formValue.name!,
      price: formValue.price!,
      minStock: formValue.minStock!,
      quantity: formValue.isInfinite ? -1 : formValue.quantity!,
    };

    if (this.isEditMode()) {
      const updatedItem: InventoryItem = {
        ...itemData,
        id: this.editingItemId()!,
      };
      await this.dataService.updateInventoryItem(updatedItem);
    } else {
      await this.dataService.addInventoryItem(itemData);
    }

    this.closeModal();
  }

  async deleteItem(id: string) {
    if (confirm('Are you sure you want to delete this item?')) {
      await this.dataService.deleteInventoryItem(id);
    }
  }
}