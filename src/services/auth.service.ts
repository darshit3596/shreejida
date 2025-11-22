import { Injectable, signal, inject } from '@angular/core';
import { DataService } from './data.service';
import { User } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private dataService = inject(DataService);

  currentUser = signal<User | null>(this.getInitialUser());
  
  private getInitialUser(): User | null {
    try {
      const userJson = sessionStorage.getItem('currentUser');
      return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return !!this.currentUser();
  }

  async login(username: string, password: string): Promise<boolean> {
    const users = await this.dataService.getUsers();
    const user = users.find(u => u.username === username);

    if (user && await this.verifyPassword(password, user.passwordHash)) {
      this.setCurrentUser(user);
      return true;
    }
    
    // For the very first user, allow login with any password and save it.
    if(users.length === 0) {
        const registrationResult = await this.register(username, password);
        return registrationResult.success;
    }
    
    return false;
  }

  async register(username: string, password: string): Promise<{ success: boolean; message: string }> {
    const users = await this.dataService.getUsers();
    if (users.find(u => u.username === username)) {
      return { success: false, message: 'Username already exists.' };
    }

    const passwordHash = await this.hashPassword(password);
    const newUser: User = { username, passwordHash };
    
    await this.dataService.addUser(newUser);
    this.setCurrentUser(newUser);
    return { success: true, message: 'Registration successful!' };
  }

  logout() {
    sessionStorage.removeItem('currentUser');
    this.currentUser.set(null);
  }

  private setCurrentUser(user: User) {
    this.currentUser.set(user);
    sessionStorage.setItem('currentUser', JSON.stringify(user));
  }
  
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    // FIX: Corrected hashing algorithm from non-existent 'SHA-265' to 'SHA-256'.
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  public async verifyPassword(password: string, hash?: string): Promise<boolean> {
      if(!hash) {
          const user = this.currentUser();
          if(!user) return false;
          hash = user.passwordHash;
      }
    const passwordHash = await this.hashPassword(password);
    return passwordHash === hash;
  }
}