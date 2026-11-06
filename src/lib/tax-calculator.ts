
export type FinancialYear =
  | "2025-26"
  | "2026-27";

export type TaxRegime = "old" | "new";

export type TaxInput = {
  financialYear: FinancialYear;
  regime: TaxRegime;
  age: number;
  salaryIncome: number;
  otherIncome?: number;
  deductions80C?: number;
  deductions80D?: number;
  hraExemption?: number;
  otherExemptions?: number;
  tds?: number;
};

export type TaxResult = {
  financialYear: FinancialYear;
  regime: TaxRegime;
  grossIncome: number;
  taxableIncome: number;
  incomeTax: number;
  cess: number;
  totalTax: number;
  tds: number;
  taxPayable: number;
};

// Tax calculation will be implemented after
// adding verified year-specific tax rules.

export function calculateIncomeTax(
  input: TaxInput
): TaxResult {
  // The parameter is reserved for the future implementation.
  void input;

  throw new Error(
    "Tax rules have not been configured yet."
  );
}
