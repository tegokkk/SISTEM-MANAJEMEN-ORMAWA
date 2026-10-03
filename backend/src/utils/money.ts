import { Prisma } from '../generated/prisma';

type Amount = Prisma.Decimal | string | number | null | undefined;

export function moneySummary(income: Amount, expense: Amount) {
  const incomeValue = new Prisma.Decimal(income ?? 0);
  const expenseValue = new Prisma.Decimal(expense ?? 0);
  return { income: incomeValue.toFixed(2), expense: expenseValue.toFixed(2),
    balance: incomeValue.minus(expenseValue).toFixed(2) };
}
