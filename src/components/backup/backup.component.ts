import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatabaseService } from '../../services/database.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-backup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './backup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackupComponent {
  private databaseService = inject(DatabaseService);
  private router = inject(Router);

  fileName = this.databaseService.dbFileName;

  async createNewDatabase(): Promise<void> {
    if (confirm('Are you sure? This will close the current database and start a new one. Unsaved changes will be lost.')) {
      const success = await this.databaseService.createNewDatabaseFile(true);
      if (success) {
        // A full reload is the simplest way to re-initialize the entire app state
        window.location.reload();
      }
    }
  }

  async openDatabase(): Promise<void> {
    if (confirm('Are you sure? This will close the current database and open another. Unsaved changes will be lost.')) {
      const success = await this.databaseService.loadDatabaseFromFile(true);
      if (success) {
        window.location.reload();
      }
    }
  }

  async saveAs(): Promise<void> {
    await this.databaseService.saveDatabaseAs();
  }
}