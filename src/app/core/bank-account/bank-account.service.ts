import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BankAccount } from './bank-account.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BankAccountService {
  constructor(private http: HttpClient) {}

  getBankAccounts() {
    return this.http.get<BankAccount[]>('/api/bank_accounts');
  }

  getBankAccountById(accountId: number | null): Observable<BankAccount | null> {
    return this.http.get<BankAccount>(`/api/bank_accounts/${accountId}`);
  }
}