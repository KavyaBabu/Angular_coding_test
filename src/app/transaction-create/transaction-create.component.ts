import { Component, ViewEncapsulation } from '@angular/core';
import { Subscription, of, switchMap, forkJoin } from 'rxjs';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';

import { MatSnackBar } from '@angular/material/snack-bar';
import { TransactionType } from '../core/transaction/transaction.interface';
import { BankAccount, NestedBankAccount } from '../core/bank-account/bank-account.interface';
import { TransactionService } from '../core/transaction/transaction.service';
import { BankAccountService } from '../core/bank-account/bank-account.service';
import { numberOrFloatValidator } from '../Validators/numberOrFloat.validator';
import { TransactionEventService } from '../core/transaction/transaction-event.service';

@Component({
  selector: 'app-transaction-create',
  templateUrl: './transaction-create.component.html',
  styleUrls: ['./transaction-create.component.scss']
})
export class TransactionCreateComponent {
  transactionForm!: FormGroup;
  transactionTypes = Object.values(TransactionType);
  sourceBankAccounts: NestedBankAccount[] = [];
  targetBankAccounts: NestedBankAccount[] = [];
  isDeposit: boolean = false;
  isWithdraw: boolean = false;
  isTransfer: boolean = false;
  sourceAccountSubscription: Subscription | undefined;
  currentAccountValue: Number = 0;
  isTextboxReadonly = false;
  srcClientID: number = 0;
  targetClientID: number = 0;

  constructor(
    private transactionService: TransactionService,
    private fb: FormBuilder, 
    private bankAccountService: BankAccountService,
    private snackBar: MatSnackBar,
    private transactionEventService: TransactionEventService) {}

  ngOnInit()
  {
    this.loadBankAccounts();
    this.initializeForm(); 
  }
  private loadBankAccounts(): void {
    this.bankAccountService.getBankAccounts().subscribe((bankAccounts) => {
      const transformedBankAccounts: NestedBankAccount[] = bankAccounts.map((bankAccount) => {
        return {
          id: bankAccount.id,
          bank_name: bankAccount.bank_name,
          account_holder_name: bankAccount.account_holder_name,
          sort_code: bankAccount.sort_code,
          account_number: bankAccount.account_number
        };
      });
      this.sourceBankAccounts = transformedBankAccounts;
      this.targetBankAccounts = transformedBankAccounts;
    });
  }
  initializeForm(): void {
    this.transactionForm = this.fb.group({
      transaction_type: ['', Validators.required],
      source_bank_account_id: [''],
      target_bank_account_id: [''],
      amount: ['', [Validators.required, numberOrFloatValidator()]],
      withdrawFullValue: [],
      description:['']
    });
    this.transactionForm.get('transaction_type')?.valueChanges.subscribe((transaction_type) => {
      this.handleTransactionTypeChange(transaction_type);
    });
    this.sourceAccountSubscription = this.transactionForm.get('source_bank_account_id')?.valueChanges.subscribe(
      (newSourceAccountId) => {
        if(newSourceAccountId)
        {
          this.handleSourceAccountChange(newSourceAccountId);
        }
      }
    );
  }
  
  handleSourceAccountChange(newSourceAccountId: number): void {
    const accountId = Number(newSourceAccountId)
    this.bankAccountService.getBankAccountById(accountId).subscribe((bankAccounts) => {
      this.currentAccountValue = bankAccounts?.current_value || 0;
      this.transactionForm.get('amount')?.setValue(this.currentAccountValue);
    },
    (error) => {
          console.error('Error fetching current account value:', error);
    });
  }
  handleTransactionTypeChange(transactionType: string): void {
    this.isDeposit = transactionType === 'DEPOSIT';
    this.isWithdraw = transactionType === 'WITHDRAW';
    this.isTransfer = transactionType === 'TRANSFER';

    const source_bank_account_idControl = this.transactionForm.get('source_bank_account_id');
    const target_bank_account_idControl = this.transactionForm.get('target_bank_account_id');
    const amountControl = this.transactionForm.get('amount');
    const withdrawFullValueControl = this.transactionForm.get('withdrawFullValue');

    source_bank_account_idControl?.clearValidators();
    target_bank_account_idControl?.clearValidators();
    amountControl?.clearValidators();
    withdrawFullValueControl?.clearValidators();

    source_bank_account_idControl?.setValue('');
    target_bank_account_idControl?.setValue('');
    amountControl?.setValue('');
    withdrawFullValueControl?.setValue('');

    this.isTextboxReadonly = false;

    if (this.isDeposit) {
      target_bank_account_idControl?.setValidators([Validators.required]);
      amountControl?.setValidators([Validators.required, numberOrFloatValidator()]);
    } else if (this.isWithdraw) {
      source_bank_account_idControl?.setValidators([Validators.required]);
      amountControl?.setValidators([Validators.required, numberOrFloatValidator()]);

      amountControl?.setValidators([
        Validators.required,
        this.validateWithdrawalAmount.bind(this),
      ]);

      withdrawFullValueControl?.setValidators([]);
    } else if (this.isTransfer) {
      source_bank_account_idControl?.setValidators([Validators.required]);
      target_bank_account_idControl?.setValidators([Validators.required]);
      amountControl?.setValidators([Validators.required, numberOrFloatValidator()]);

      amountControl?.setValidators([
        Validators.required,
        this.validateWithdrawalAmount.bind(this),
      ]);
    }

    source_bank_account_idControl?.updateValueAndValidity();
    target_bank_account_idControl?.updateValueAndValidity();
    amountControl?.updateValueAndValidity();
    withdrawFullValueControl?.updateValueAndValidity();
  }

  onWithdrawFullValueChange() {
    const withdrawFullValue = this.transactionForm.get('withdrawFullValue')?.value;
    const amountControl = this.transactionForm.get('amount');
    if (withdrawFullValue) {
      amountControl?.setValue(this.currentAccountValue);
      this.isTextboxReadonly = !this.isTextboxReadonly;
    } else {
      this.isTextboxReadonly = !this.isTextboxReadonly;
    }
  }

  validateWithdrawalAmount(control: AbstractControl): ValidationErrors | null {
    const amount = control.value;
    const withdrawFullValue = this.transactionForm.get('withdrawFullValue')?.value;
    if(amount > 0)
    {
      if (withdrawFullValue) {
        if (amount == this.currentAccountValue) {
          return null;
        } else {
          return { invalidAmount: true, message: 'Amount does not match the current value.' };
        }
      } else {
        if (amount <= this.currentAccountValue) {
          return null;
        } else {
          return { invalidAmount: true, message: 'Amount exceeds the current value.' };
        }
      }
    }
    else
    {
        return { invalidAmount: true, message: 'Amount must be greater than 0.' };
    }
  }

  onSourceChange()
  {
  if (this.isTransfer) {
    const sourceId = this.transactionForm.get('source_bank_account_id')?.value;
    const targetId = this.transactionForm.get('target_bank_account_id')?.value;
    forkJoin([
      this.bankAccountService.getBankAccountById(sourceId),
      this.bankAccountService.getBankAccountById(targetId)
    ]).subscribe(([sourceAccounts, targetAccounts]) => {
      this.srcClientID = sourceAccounts?.client_id || 0;
      this.targetClientID = targetAccounts?.client_id || 0;
      if (!sourceId || !targetId || this.srcClientID !== this.targetClientID) {
        this.transactionForm.get('source_bank_account_id')?.setErrors({ transferValidation: true, message: 'Source and Target accounts must be selected and have the same client ID for a transfer.' });
        this.transactionForm.get('target_bank_account_id')?.setErrors({ transferValidation: true, message: 'Source and Target accounts must be selected and have the same client ID for a transfer.' });
      }
      else
      {
        const source_bank_account_idControl = this.transactionForm.get('source_bank_account_id');
        const target_bank_account_idControl = this.transactionForm.get('target_bank_account_id');

        source_bank_account_idControl?.setErrors(null);
        target_bank_account_idControl?.setErrors(null);

        source_bank_account_idControl?.clearValidators();
        target_bank_account_idControl?.clearValidators();

        source_bank_account_idControl?.updateValueAndValidity();
        target_bank_account_idControl?.updateValueAndValidity();
      }
    });
     
    }
  }

  hasError(controlName: string, errorType: string): boolean | undefined {
    const control = this.transactionForm.get(controlName);
    return control?.hasError(errorType) && control.touched;
  }
  
  onSubmit(): void {
    if (this.transactionForm.valid) {
      const formData = this.transactionForm.value;
      this.transactionService.createTransaction(formData).subscribe(
        (response) => {
          const successMessage = this.generateSuccessMessage(this.transactionForm.get('transaction_type')?.value);
          this.transactionService.getEnhancedTransactions();
          this.showSuccessMessage(successMessage);
          this.resetForm()
          this.transactionEventService.notifyTransactionCreated();
        },
        (error) => {
          this.showErrorMessage('Error Creating Transaction');
        }
      );
      
    }
  }

  resetForm(): void {
    this.showSuccessMessage('Form has been resetted successfully!');
    this.transactionForm.reset();
  }

  private generateSuccessMessage(transactionType: string): string {
    switch (transactionType) {
      case 'DEPOSIT':
        return 'Deposit has been created.';
      case 'WITHDRAW':
        return 'Withdraw has been created.';
      default:
        return 'Transaction has been created.';
    }
  }

  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Success', {
      duration: 2000,
      verticalPosition: 'top',
      panelClass: ['snackbar-success'], 
    });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Error', {
      duration: 2000,
      verticalPosition: 'top',
      panelClass: ['snackbar-error'], 
    });
  }

  ngOnDestroy() {
    if (this.sourceAccountSubscription) {
      this.sourceAccountSubscription.unsubscribe();
    }
}
}
