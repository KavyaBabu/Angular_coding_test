# Fundment Code Test

## Getting started

This project is built with Node.js v18 and Angular v16.

If you use `nvm`, run `nvm install` and `npm install` to install Node.js and all project dependencies.

To begin development, use the `npm run dev` command, which will serve the Angular application and run the mock API server.
The data returned by the API lives in `db.json`.

## Overview
 
The application is an administration dashboard for a simple financial services business.
Users should be able to create three types of transaction - deposits, withdrawals and transfers.
Users should also be able to view a simple table of transactions.

Create a reactive form component to add transactions of type `TransactionCreate`,
please use the interfaces and services within the `core` directory for reference.

Create a table component which takes an input of type `ExtendedTransactions[]` to display transactions.

Depending on the transaction type, the following form validation requirements should be met:

###  Deposits

 - Source bank account field is hidden.
 - Target bank account required.

###  Withdrawals

 - Target bank account field is hidden.
 - Source bank account required.
 - Amount should not exceed current value of source bank account.
 - Additional boolean field 'Would you like to withdraw the full value of this account?'
   - This field should default to `false`.
   - When `false`, display the amount field.
   - When `true`, the amount field should be hidden and the `transaction.amount` set to the `current_value` of the bank account.

###  Transfers

 - Target and source bank account fields are required.
 - Target and source bank account must have the same `client_id`.
 - Amount should not exceed current value of source bank account.

### All transactions

 - Optional description field.

## Considerations

Ensure you are displaying user-friendly data, i.e. clear validation messaging, displaying names as opposed to IDs, user feedback e.g. "deposit created".

Good form validation for the three different types of transactions - time can be focused on creating just the transfer form if validation and unit tests for the validation are prioritised.

Scalability of your form component should be considered - a reusable generic form component is ideal but not a requirement.

Using RxJS to populate source and target bank account details for the `ExtendedTransaction` type.

Optional usage of state management libraries, or mocking of state management principles.

Functionality should be prioritised, styling can be kept minimal.
