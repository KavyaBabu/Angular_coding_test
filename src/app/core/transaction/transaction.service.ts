import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { ExtendedTransaction, Transaction, TransactionCreate } from './transaction.interface';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {

  constructor(private http: HttpClient) {}

  getTransactions() {
    return this.http.get<Transaction[]>('/api/transactions');
  }

  createTransaction(data: TransactionCreate) {
    return this.http.post<Transaction>('/api/transactions', data);
  }

  deleteTransaction(transactionId: number) {
    return this.http.delete<Transaction>(`/api/transactions/${transactionId}`);
  }

  getEnhancedTransactions(): Observable<ExtendedTransaction[]> {
    return this.getTransactions().pipe(
      map(transactions => transactions.map(transaction => ({
        ...transaction,
        source: null,
        target: null,
      } as ExtendedTransaction)))
    );
  }
}