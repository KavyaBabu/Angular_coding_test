import { Component, ViewChild } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap,combineLatest, Subject, mergeMap, toArray } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TransactionService } from '../core/transaction/transaction.service';
import { ExtendedTransaction } from '../core/transaction/transaction.interface';
import { BankAccountService } from '../core/bank-account/bank-account.service';
import { TransactionEventService } from '../core/transaction/transaction-event.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';

@Component({
  selector: 'app-view-transaction',
  templateUrl: './view-transaction.component.html',
  styleUrls: ['./view-transaction.component.scss']
})
export class ViewTransactionComponent {

  transactions$!: Observable<ExtendedTransaction[]>;
  private unsubscribe$ = new Subject<void>();

  dataSource = new MatTableDataSource<ExtendedTransaction>();
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;


  displayedColumns: string[] = [
    'id',
    'transaction_type',
    'amount',
    'source_account_holder_name',
    'target_account_holder_name',
    'actions',
  ];

  constructor(
    private transactionService: TransactionService,
    private bankAccountService: BankAccountService,
    private transactionEventService: TransactionEventService) {}

  ngOnInit()
  {
    this.loadTransactions();
    this.transactionEventService.transactionCreated$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(() => {
        this.loadTransactions();
      });  
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
  
  deleteTransaction(transactionId: number) {
    this.transactionService.deleteTransaction(transactionId).subscribe(() => {
      this.loadTransactions();
    });
  }

  loadTransactions()
  {
    this.transactions$ = this.transactionService.getEnhancedTransactions().pipe(
      switchMap((transactions) => {
        const enhancedTransactions = transactions.map((transaction) => {
          const sourceAccount$ = transaction.source_bank_account_id
            ? this.bankAccountService.getBankAccountById(transaction.source_bank_account_id)
            : of(null);
  
          const targetAccount$ = transaction.target_bank_account_id
            ? this.bankAccountService.getBankAccountById(transaction.target_bank_account_id)
            : of(null);
  
          return combineLatest([sourceAccount$, targetAccount$]).pipe(
            map(([sourceAccount, targetAccount]) => ({
              ...transaction,
              source: sourceAccount,
              target: targetAccount,
            }))
          );
        });
  
        return forkJoin(enhancedTransactions).pipe(toArray());
      }),
      mergeMap((enhancedTransactions) => enhancedTransactions),
      takeUntil(this.unsubscribe$)
    );
    this.transactions$.subscribe((enhancedTransactions) => {
      this.dataSource.data = enhancedTransactions;
      this.dataSource.paginator = this.paginator;
      // this.dataSource.paginator.length = this.dataSource.data.length;
    });
  }
}
