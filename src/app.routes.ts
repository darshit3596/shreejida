
import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { NewInvoiceComponent } from './components/invoice/new-invoice/new-invoice.component';
import { ViewInvoicesComponent } from './components/invoice/view-invoices/view-invoices.component';
import { InventoryComponent } from './components/inventory/inventory.component';
import { PrintInvoiceComponent } from './components/invoice/print-invoice/print-invoice.component';
import { ProfileSettingsComponent } from './components/profile-settings/profile-settings.component';
import { ReportsComponent } from './components/reports/reports.component';
import { BackupComponent } from './components/backup/backup.component';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { authGuard } from './guards/auth.guard';

export const APP_ROUTES: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { 
    path: '', 
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'new-invoice', component: NewInvoiceComponent },
      { path: 'view-invoices', component: ViewInvoicesComponent },
      { path: 'inventory', component: InventoryComponent },
      { path: 'print-invoice/:id', component: PrintInvoiceComponent },
      { path: 'profile-settings', component: ProfileSettingsComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'backup', component: BackupComponent },
    ]
  },
  { path: '**', redirectTo: 'login' } 
];
