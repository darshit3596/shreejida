import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSettingsComponent {
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  
  settings = this.dataService.settings;
  
  showSuccessMessage = signal(false);
  showPasswordModal = signal(false);
  passwordError = signal<string | null>(null);

  passwordForm = this.fb.group({
    password: ['', Validators.required]
  });

  settingsForm = this.fb.group({
    shopName: ['', Validators.required],
    tagLine: [''],
    address: ['', Validators.required],
    signatory: ['', Validators.required],
    term1: [''],
    term2: [''],
    term3: [''],
  });

  constructor() {
    this.settingsForm.patchValue(this.settings()!);
  }
  
  promptForPassword() {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }
    this.passwordError.set(null);
    this.passwordForm.reset();
    this.showPasswordModal.set(true);
  }

  cancelSave() {
    this.showPasswordModal.set(false);
  }

  async confirmAndSaveSettings() {
    if (this.passwordForm.invalid) {
      return;
    }

    const password = this.passwordForm.value.password;
    if (!password) {
      this.passwordError.set("Password is required.");
      return;
    }

    const isValid = await this.authService.verifyPassword(password);
    if(isValid) {
      await this.dataService.updateSettings(this.settingsForm.getRawValue());
      this.showPasswordModal.set(false);
      this.showSuccessMessage.set(true);
      setTimeout(() => this.showSuccessMessage.set(false), 3000);
    } else {
      this.passwordError.set("The password you entered is incorrect.");
    }
  }
}