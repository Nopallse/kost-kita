# Financial Domain Rules

- Keep transaction, allocation, payment, and settlement separate.
- Never use floating-point arithmetic for money.
- Every item's allocation must sum exactly to its subtotal.
- Every transaction's items must sum exactly to its total.
- SHARED expenses must support explicitly selected participants.
- PERSONAL expenses belong to exactly one member.
- CUSTOM expenses use explicit allocation amounts.
- Equal split rounding must be deterministic.
- Net balance = total payments - total responsibility, adjusted for confirmed settlements.
- Positive balance means receivable.
- Negative balance means payable.
- Pending and rejected settlements do not affect balances.
- Only confirmed settlements affect balances.
- Partial settlements must be supported.
- Transaction edits and voids must update ledger projections atomically.
- Preserve financial audit history.
- Household balances must reconcile to zero for fully funded valid ledgers.
- Never hide inconsistencies in financial calculations.
