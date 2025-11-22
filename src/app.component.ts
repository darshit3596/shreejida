import { Component, ChangeDetectionStrategy, inject, signal, afterNextRender } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { DataService } from './services/data.service';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { DatabaseService } from './services/database.service';

type AppStatus = 'initializing' | 'needs_file' | 'loading' | 'ready';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
})
export class AppComponent {
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private databaseService = inject(DatabaseService);
  private router = inject(Router);

  settings = this.dataService.settings;
  currentUser = this.authService.currentUser;
  isDirty = this.dataService.isDirty;
  
  appStatus = signal<AppStatus>('initializing');

  menuItems = [
    { name: 'Dashboard', icon: 'home', path: '/dashboard' },
    { name: 'New Invoice', icon: 'add_circle', path: '/new-invoice' },
    { name: 'View Invoices', icon: 'receipt_long', path: '/view-invoices' },
    { name: 'Inventory', icon: 'inventory_2', path: '/inventory' },
    { name: 'Reports', icon: 'bar_chart', path: '/reports' },
    { name: 'Data', icon: 'backup', path: '/backup' },
    { name: 'Profile Settings', icon: 'settings', path: '/profile-settings' }
  ];

  constructor() {
    afterNextRender(async () => {
      const dbStatus = await this.databaseService.init();
      if (dbStatus === 'ready') {
        await this.loadData();
      } else {
        this.appStatus.set('needs_file');
      }
    });
  }

  async createNewDatabase(): Promise<void> {
    const success = await this.databaseService.createNewDatabaseFile();
    if (success) {
      await this.loadData();
    }
  }

  async openDatabase(): Promise<void> {
    const success = await this.databaseService.loadDatabaseFromFile();
    if (success) {
      await this.loadData();
    }
  }
  
  private async loadData(): Promise<void> {
    this.appStatus.set('loading');
    await this.dataService.initFromDb();
    this.appStatus.set('ready');
     if (!this.authService.isLoggedIn()) {
        this.router.navigate(['/login']);
     }
  }

  async saveChanges(): Promise<void> {
    await this.databaseService.saveDatabaseToFile();
    this.dataService.isDirty.set(false);
  }

  logout() {
    if(this.isDirty()) {
      if(confirm('You have unsaved changes. Do you want to save before logging out?')) {
        this.saveChanges();
      }
    }
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}