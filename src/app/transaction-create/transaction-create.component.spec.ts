import { ComponentFixture, TestBed, fakeAsync } from '@angular/core/testing';
import { TransactionCreateComponent } from './transaction-create.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BankAccountService } from '../core/bank-account/bank-account.service';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('TransactionCreateComponent', () => {
  let component: TransactionCreateComponent;
  let fixture: ComponentFixture<TransactionCreateComponent>;

  const mockBankAccounts = [
    { 
    "id": 1,
    "bank_name": "Bank A",
    "account_holder_name": "Miss Jane A Smith",
    "sort_code": "111111",
    "account_number": "11111111",
    "client_id": 1,
    "current_value": 128746.281 
  }, 
  {  
    "id": 2,
    "bank_name": "Bank B",
    "account_holder_name": "Thomas Christopher Wright",
    "sort_code": "222222",
    "account_number": "22222222",
    "client_id": 1,
    "current_value": 46.2 
  },
  {
    "id": 3,
    "bank_name": "Bank C",
    "account_holder_name": "Mr John Doe",
    "sort_code": "333333",
    "account_number": "33333333",
    "client_id": 2,
    "current_value": 123.82
  }];

  beforeEach(async() => {
    
    const spy = jasmine.createSpyObj('BankAccountService', ['getBankAccounts', 'getBankAccountById']);
    
    TestBed.configureTestingModule({
      declarations: [TransactionCreateComponent],
      imports: [ReactiveFormsModule, MatSnackBarModule, HttpClientTestingModule],
      providers: [
        ReactiveFormsModule,
        { provide: BankAccountService, useValue: spy },
      ],
    });
    
    const mockBankAccountsMap: Record<number, any> = {};
        mockBankAccounts.forEach(account => {
          mockBankAccountsMap[account.id] = account;
    });

    fixture = TestBed.createComponent(TransactionCreateComponent);
    component = fixture.componentInstance;
    spy.getBankAccounts.and.returnValue(of(mockBankAccounts));    
  
    spy.getBankAccountById.and.callFake((id: any) => {
      const account = mockBankAccountsMap[id];
      return of(account || null);
    });

    fixture.detectChanges();

    component.transactionForm.setValue({
      transaction_type: 'DEPOSIT',
      source_bank_account_id: null,
      target_bank_account_id: 1,
      amount: 500,
      withdrawFullValue: false,
      description: '',
    });

  });

  const validateFormFields = (formGroup: FormGroup, fieldNames: string[]) => {
    for (const fieldName of fieldNames) {
      const control = formGroup.get(fieldName);
      expect(control?.validator).toBeTruthy();
    }
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should handle transaction type change for DEPOSIT', () => {
    component.transactionForm.get('transaction_type')?.setValue('DEPOSIT');
    component.handleTransactionTypeChange('DEPOSIT');
    validateFormFields(component.transactionForm, ['target_bank_account_id', 'amount']);

  });

  it('should handle transaction type change for WITHDRAW', () => {
    component.transactionForm.get('transaction_type')?.setValue('WITHDRAW');
    component.handleTransactionTypeChange('WITHDRAW');
    validateFormFields(component.transactionForm, ['source_bank_account_id', 'amount']);

  });

  it('should handle transaction type change for TRANSFER', () => {    
    component.transactionForm.get('transaction_type')?.setValue('TRANSFER');
    component.handleTransactionTypeChange('TRANSFER');
    validateFormFields(component.transactionForm, ['target_bank_account_id','target_bank_account_id', 'amount']);
  });

  
  it('should withdraw and update current value correctly', () => {
    performWithdraw(2,46.2)
    expect(component.currentAccountValue).toBe(46.2);
    expect(component.transactionForm.get('amount')?.value).toBe(46.2);
  });

  it('should set amount as current value + 10 and check for an error for WITHDRAW', () => {
    performWithdraw(2,46.2)
    expect(component.currentAccountValue).toBe(46.2);
    const currentValue = component.currentAccountValue;
    component.transactionForm.controls['amount'].setValue(currentValue.valueOf() + 10);
    expect(component.transactionForm.controls['amount'].hasError('invalidAmount')).toBeTruthy();
  });
  
  it('should handle withdrawal full value change', () => {
    toggleWithdrawFullValue(true);
    expect(component.isTextboxReadonly).toBeTruthy();
    expect(component.transactionForm.get('amount')?.value).toBe(component.currentAccountValue);
  
    toggleWithdrawFullValue(false);
    expect(component.isTextboxReadonly).toBeFalsy();
  });
  
  it('should check client ids and allow transfer if source and target client ids are equal', () => {
    performTransfer(1, 2);
    expect(component.srcClientID).toEqual(component.targetClientID);
    expect(component.transactionForm.get('source_bank_account_id')?.getError('transferValidation')).toBeNull();
    expect(component.transactionForm.get('target_bank_account_id')?.getError('transferValidation')).toBeNull();
  });
  
  it('should show validation messages for unequal client IDs in a transfer', () => {
    performTransfer(1, 3);
    expect(component.srcClientID).not.toEqual(component.targetClientID);
    expect(component.transactionForm.controls['source_bank_account_id'].hasError('transferValidation')).toBeTruthy();
  });
  
  it('should handle source account change', () => {
    spyOn(component, 'handleSourceAccountChange').and.callThrough();
    updateSourceAccount(2);
    expect(component.handleSourceAccountChange).toHaveBeenCalled();
    expect(component.currentAccountValue).toBe(46.2);
    expect(component.transactionForm.get('amount')?.value).toBe(46.2);
  });
  

  it('should call onSubmit method', () => {
    spyOn(component, 'onSubmit');

    component.onSubmit();

    expect(component.onSubmit).toHaveBeenCalled();
  });

  // Helper functions

  function performWithdraw(sourceAccountId: number, initialCurrentValue: number) {
    component.transactionForm.controls['transaction_type'].setValue('WITHDRAW');
    spyOn(component, 'handleSourceAccountChange').and.callThrough();
    updateSourceAccount(sourceAccountId);
    expect(component.handleSourceAccountChange).toHaveBeenCalled();
  }
  
  function toggleWithdrawFullValue(value: boolean) {
    component.transactionForm.get('withdrawFullValue')?.setValue(value);
    component.onWithdrawFullValueChange();
  }
  
  function performTransfer(sourceAccountId: number, targetAccountId: number) {
    component.transactionForm.controls['transaction_type'].setValue('TRANSFER');
    component.handleTransactionTypeChange('TRANSFER');
    component.transactionForm.controls['source_bank_account_id'].setValue(sourceAccountId);
    component.transactionForm.controls['target_bank_account_id'].setValue(targetAccountId);
    spyOn(component, 'onSourceChange').and.callThrough();
    component.onSourceChange();
  }
  
  function updateSourceAccount(sourceAccountId: number) {
    component.transactionForm.get('source_bank_account_id')?.setValue(sourceAccountId);
  }
});
