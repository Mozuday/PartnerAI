
/**
 * PartnerAI — ITR-2 Validation Engine
 * Assessment Year: 2026-27
 * Source: CBDT ITR-2 Validation Rules, Version 1.0, 26 May 2026
 *
 * Category A rules are treated as errors.
 * Category D rules are treated as warnings.
 *
 * IMPORTANT:
 * - Official serial numbers are preserved.
 * - PartnerAI normalized data paths are used.
 * - This is NOT a replacement for official JSON Schema validation.
 * - PAN/Aadhaar matching, actual TAN-code verification, filing-date
 *   verification and external database checks require external services.
 * - Tax calculations must use verified statutory rules and official data.
 */

export type ITRValidationCategory = "A" | "D";

export type ITRValidationIssue = {
  ruleId: string;
  officialSerial: number;
  category: ITRValidationCategory;
  field: string;
  message: string;
};

export type ITRValidationRule = {
  id: string;
  officialSerial: number;
  category: ITRValidationCategory;
  field: string;
  description: string;
  validate: (data: Record<string, unknown>) => boolean;
};

export type ITRValidationResult = {
  valid: boolean;
  errors: ITRValidationIssue[];
  warnings: ITRValidationIssue[];
};

type RecordValue = Record<string, unknown>;

type Employer = RecordValue;

type SalaryComponents = {
  basicSalary: number;
  dearnessAllowance: number;
  gratuity: number;
  commutedPension: number;
  leaveEncashment: number;
  leaveTravelAllowance: number;
  otherAllowance: number;
  others: number;
};

const EPSILON = 1;

/* -------------------------------------------------------
   Generic helpers
------------------------------------------------------- */

export function getField(
  data: Record<string, unknown>,
  path: string
): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (
      current !== null &&
      typeof current === "object" &&
      !Array.isArray(current) &&
      key in current
    ) {
      return (current as RecordValue)[key];
    }

    return undefined;
  }, data);
}

function isYes(value: unknown): boolean {
  return value === true || value === "Yes" || value === "Y";
}

function isNo(value: unknown): boolean {
  return value === false || value === "No" || value === "N";
}

function isFilled(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    return Object.keys(value).length > 0;
  }

  return value === true;
}

function isNonEmptyObject(value: unknown): value is RecordValue {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}

function asNumber(value: unknown): number | undefined {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim() !== "" &&
    Number.isFinite(Number(value))
  ) {
    return Number(value);
  }

  return undefined;
}

function getNumber(
  data: RecordValue,
  path: string
): number | undefined {
  return asNumber(getField(data, path));
}

function getArray(value: unknown): RecordValue[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is RecordValue =>
      item !== null &&
      typeof item === "object" &&
      !Array.isArray(item)
  );
}

function sumNumbers(
  values: unknown[]
): number | undefined {
  let total = 0;

  for (const value of values) {
    const number = asNumber(value);

    if (number === undefined) {
      return undefined;
    }

    total += number;
  }

  return total;
}

function approximatelyEqual(
  a: number | undefined,
  b: number | undefined,
  tolerance = EPSILON
): boolean {
  return (
    a !== undefined &&
    b !== undefined &&
    Math.abs(a - b) <= tolerance
  );
}

function isOldRegime(data: RecordValue): boolean {
  const regime = getField(data, "taxRegime");

  return (
    regime === "old" ||
    regime === "Old" ||
    regime === "OLD" ||
    regime === "oldRegime"
  );
}

function isNewRegime(data: RecordValue): boolean {
  const regime = getField(data, "taxRegime");

  return (
    regime === "new" ||
    regime === "New" ||
    regime === "NEW" ||
    regime === "newRegime"
  );
}

function getSalaryEmployers(data: RecordValue): Employer[] {
  return getArray(
    getField(data, "scheduleS.employers")
  );
}

function getExemptions(data: RecordValue): RecordValue {
  const value = getField(
    data,
    "scheduleS.exemptAllowances"
  );

  return isNonEmptyObject(value) ? value : {};
}

function getDeduction16(data: RecordValue): RecordValue {
  const value = getField(
    data,
    "scheduleS.deductions16"
  );

  return isNonEmptyObject(value) ? value : {};
}

function getEmployerComponents(
  employer: Employer
): RecordValue {
  const value = employer.salary17_1;

  return isNonEmptyObject(value) ? value : {};
}

function employerNature(
  employer: Employer
): string {
  return String(
    employer.natureOfEmployment ?? ""
  ).toUpperCase();
}

function isGovernmentOrPSU(
  employer: Employer
): boolean {
  return [
    "CGOV",
    "SGOV",
    "PSU",
    "CG",
    "SG",
    "CENTRAL GOVERNMENT",
    "STATE GOVERNMENT",
    "PUBLIC SECTOR UNDERTAKING",
  ].includes(employerNature(employer));
}

function salaryComponent(
  employer: Employer,
  key: keyof SalaryComponents
): number {
  return asNumber(
    getEmployerComponents(employer)[key]
  ) ?? 0;
}

function employerGross17_1(
  employer: Employer
): number | undefined {
  return asNumber(
    getEmployerComponents(employer).total
  );
}

function allEmployerComponentTotal(
  employers: Employer[],
  key: keyof SalaryComponents
): number {
  return employers.reduce(
    (total, employer) =>
      total + salaryComponent(employer, key),
    0
  );
}

function exemptionDropdowns(
  exemptions: RecordValue
): RecordValue[] {
  return getArray(exemptions.otherAllowances);
}

function exemptionAmount(
  exemptions: RecordValue,
  key: string
): number {
  return asNumber(exemptions[key]) ?? 0;
}

function allExemptionDropdownTotal(
  exemptions: RecordValue
): number | undefined {
  return sumNumbers(
    exemptionDropdowns(exemptions).map(
      (item) => item.amount
    )
  );
}

function selectedExemption(
  data: RecordValue,
  code: string
): number {
  const exemptions = getExemptions(data);

  return exemptionDropdowns(exemptions)
    .filter(
      (item) =>
        String(item.section ?? "") === code
    )
    .reduce(
      (total, item) =>
        total + (asNumber(item.amount) ?? 0),
      0
    );
}

function hasExemption(
  data: RecordValue,
  code: string
): boolean {
  return selectedExemption(data, code) > 0;
}

function salaryTotal(
  data: RecordValue
): number | undefined {
  return getNumber(
    data,
    "scheduleS.totalGrossSalary"
  );
}

function netSalary(
  data: RecordValue
): number | undefined {
  return getNumber(
    data,
    "scheduleS.netSalary"
  );
}

function totalDeductions16(
  data: RecordValue
): number | undefined {
  return getNumber(
    data,
    "scheduleS.deductions16.total"
  );
}

function salaryIncome(
  data: RecordValue
): number | undefined {
  return getNumber(
    data,
    "scheduleS.incomeChargeableUnderSalaries"
  );
}

/* -------------------------------------------------------
   Salary exemption codes used by PartnerAI
------------------------------------------------------- */

const EXEMPTION = {
  LTA: "10(5)",
  HRA: "10(13A)",
  FOREIGN_EMBASSY: "10(6)",
  FOREIGN_SERVICE: "10(7)",
  GRATUITY: "10(10)",
  COMMUTED_PENSION: "10(10A)",
  LEAVE_ENCASHMENT: "10(10AA)",
  RETRENCHMENT: "10(10B)(i)",
  RETRENCHMENT_APPROVED: "10(10B)(ii)",
  VOLUNTARY_RETIREMENT: "10(10C)",
  NON_MONETARY_TAX: "10(10CC)",
  DUTY_ALLOWANCE_I: "10(14)(i)",
  DUTY_ALLOWANCE_II: "10(14)(ii)",
  MP_ALLOWANCE: "10(17)",
} as const;

/* -------------------------------------------------------
   Category A — Official rules 1–16
------------------------------------------------------- */

export const itr2ValidationRules: ITRValidationRule[] = [
  {
    id: "ITR2-A-01",
    officialSerial: 1,
    category: "A",
    field: "mobile",
    description: "Enter a valid Indian mobile number.",
    validate: (data) => {
      const mobile = getField(data, "mobile");

      return (
        typeof mobile === "string" &&
        /^[6-9]\d{9}$/.test(mobile.trim())
      );
    },
  },

  {
    id: "ITR2-A-02",
    officialSerial: 2,
    category: "A",
    field: "taxpayerName",
    description:
      "Taxpayer name must match the name in the PAN database. This local check verifies presence only.",
    validate: (data) => {
      const name = getField(data, "taxpayerName");

      return (
        typeof name === "string" &&
        name.trim().length > 0
      );
    },
  },

  {
    id: "ITR2-A-03",
    officialSerial: 3,
    category: "A",
    field: "dateOfBirth",
    description:
      "For senior or super-senior citizen benefits, date of birth must match PAN/Aadhaar records. External matching is not performed locally.",
    validate: (data) =>
      !isYes(
        getField(data, "claimsSeniorCitizenBenefit")
      ) ||
      isFilled(getField(data, "dateOfBirth")),
  },

  {
    id: "ITR2-A-04",
    officialSerial: 4,
    category: "A",
    field: "filingStatus",
    description:
      "If the original return was filed under section 142(1), a revised return cannot be filed.",
    validate: (data) =>
      !(
        getField(
          data,
          "filingStatus.originalReturnSection"
        ) === "142(1)" &&
        isYes(
          getField(
            data,
            "filingStatus.isRevisedReturn"
          )
        )
      ),
  },

  {
    id: "ITR2-A-05",
    officialSerial: 5,
    category: "A",
    field: "unlistedEquityShares",
    description:
      "If unlisted equity shares were held during the previous year, the details must be provided.",
    validate: (data) =>
      !isYes(
        getField(data, "unlistedEquityShares.held")
      ) ||
      isFilled(
        getField(data, "unlistedEquityShares.details")
      ),
  },

  {
    id: "ITR2-A-06",
    officialSerial: 6,
    category: "A",
    field: "portugueseCivilCode",
    description:
      "If governed by the Portuguese Civil Code under section 5A, the corresponding schedule is mandatory.",
    validate: (data) =>
      !isYes(
        getField(data, "portugueseCivilCode.governed")
      ) ||
      isFilled(
        getField(data, "portugueseCivilCode.schedule")
      ),
  },

  {
    id: "ITR2-A-07",
    officialSerial: 7,
    category: "A",
    field: "representativeAssessee",
    description:
      "If filing as a representative assessee, representative details must be provided.",
    validate: (data) =>
      !isYes(
        getField(
          data,
          "representativeAssessee.isRepresentative"
        )
      ) ||
      isFilled(
        getField(
          data,
          "representativeAssessee.details"
        )
      ),
  },

  {
    id: "ITR2-A-08",
    officialSerial: 8,
    category: "A",
    field: "verification.representativePAN",
    description:
      "Representative assessee PAN in verification must match the PAN of the person uploading the return.",
    validate: (data) => {
      if (
        !isYes(
          getField(
            data,
            "representativeAssessee.isRepresentative"
          )
        )
      ) {
        return true;
      }

      const uploaderPAN = getField(
        data,
        "uploaderPAN"
      );

      const representativePAN = getField(
        data,
        "verification.representativePAN"
      );

      return (
        typeof uploaderPAN === "string" &&
        typeof representativePAN === "string" &&
        uploaderPAN.trim().toUpperCase() ===
          representativePAN.trim().toUpperCase()
      );
    },
  },

  {
    id: "ITR2-A-09",
    officialSerial: 9,
    category: "A",
    field: "seventhProviso",
    description:
      "If filing under the seventh proviso to section 139(1), the respective details must be provided.",
    validate: (data) =>
      !isYes(
        getField(data, "seventhProviso.applicable")
      ) ||
      isFilled(
        getField(data, "seventhProviso.details")
      ),
  },

  {
    id: "ITR2-A-10",
    officialSerial: 10,
    category: "A",
    field: "directorDetails",
    description:
      "If the taxpayer was a director in a company during the previous year, the respective details must be provided.",
    validate: (data) =>
      !isYes(getField(data, "wasDirector")) ||
      isFilled(getField(data, "directorDetails")),
  },

  {
    id: "ITR2-A-11",
    officialSerial: 11,
    category: "A",
    field: "TAN",
    description:
      "The first three TAN alphabets must match the applicable official TAN code list. This local check verifies TAN format only.",
    validate: (data) => {
      const tan = getField(data, "TAN");

      if (
        tan === undefined ||
        tan === null ||
        tan === ""
      ) {
        return true;
      }

      return (
        typeof tan === "string" &&
        /^[A-Z]{4}\d{5}[A-Z]$/.test(
          tan.trim().toUpperCase()
        )
      );
    },
  },

  {
    id: "ITR2-A-12",
    officialSerial: 12,
    category: "A",
    field: "filingStatus",
    description:
      "Once proceedings under section 148, 153A or 153C are initiated, a return cannot be filed under section 139.",
    validate: (data) => {
      const proceeding = getField(
        data,
        "filingStatus.proceedingInitiated"
      );

      const section = String(
        getField(
          data,
          "filingStatus.returnSection"
        ) ?? ""
      );

      return !(
        isYes(proceeding) &&
        [
          "139",
          "139(1)",
          "139(4)",
          "139(5)",
        ].includes(section)
      );
    },
  },

  {
    id: "ITR2-A-13",
    officialSerial: 13,
    category: "A",
    field: "seventhProviso.amounts",
    description:
      "If clause (iv) of the seventh proviso is selected, the respective amounts must be filled.",
    validate: (data) =>
      !isYes(
        getField(data, "seventhProviso.clauseIV")
      ) ||
      isFilled(
        getField(data, "seventhProviso.amounts")
      ),
  },

  {
    id: "ITR2-A-14",
    officialSerial: 14,
    category: "A",
    field: "portugueseCivilCode.schedule",
    description:
      "The Portuguese Civil Code schedule must not be filed when the taxpayer is not governed by it.",
    validate: (data) =>
      !isNo(
        getField(data, "portugueseCivilCode.governed")
      ) ||
      !isFilled(
        getField(data, "portugueseCivilCode.schedule")
      ),
  },

  {
    id: "ITR2-A-15",
    officialSerial: 15,
    category: "A",
    field: "schedule115AD",
    description:
      "FPI must be selected as Yes to enable Schedule 115AD(1)(b)(iii)-Proviso.",
    validate: (data) =>
      !isFilled(getField(data, "schedule115AD")) ||
      isYes(getField(data, "isFPI")),
  },

  {
    id: "ITR2-A-16",
    officialSerial: 16,
    category: "A",
    field: "notice",
    description:
      "For specified notices or orders, DIN or unique number and notice/order date are mandatory.",
    validate: (data) => {
      const section = String(
        getField(data, "notice.section") ?? ""
      );

      if (
        ![
          "139(9)",
          "142(1)",
          "148",
          "119(2)(b)",
        ].includes(section)
      ) {
        return true;
      }

      return (
        isFilled(getField(data, "notice.DIN")) &&
        isFilled(getField(data, "notice.date"))
      );
    },
  },

  /* -----------------------------------------------------
     Official rule 17
     Return must be filed according to PAN role.
     Requires external PAN role metadata.
  ----------------------------------------------------- */

  {
    id: "ITR2-A-17",
    officialSerial: 17,
    category: "A",
    field: "panRole",
    description:
      "The return must be filed according to the role associated with the PAN. Requires verified PAN role metadata.",
    validate: (data) => {
      const expected = getField(
        data,
        "panRole.expected"
      );

      const selected = getField(
        data,
        "panRole.selected"
      );

      if (
        expected === undefined ||
        selected === undefined
      ) {
        return true;
      }

      return expected === selected;
    },
  },

  /* -----------------------------------------------------
     Rules 18–21
     These require due-date and residency/FPI information.
  ----------------------------------------------------- */

  {
    id: "ITR2-A-18",
    officialSerial: 18,
    category: "A",
    field: "taxRegime",
    description:
      "The option to opt out of the new tax regime is not available after the due date under section 139(1).",
    validate: (data) => {
      const optedOut = isYes(
        getField(data, "taxRegime.optedOut")
      );

      const afterDueDate = isYes(
        getField(data, "filingStatus.afterDueDate")
      );

      return !(optedOut && afterDueDate);
    },
  },

  {
    id: "ITR2-A-19",
    officialSerial: 19,
    category: "A",
    field: "taxRegime",
    description:
      "The option to opt out of the new tax regime is not available after the due date under section 139(1).",
    validate: (data) => {
      const optedOut = isYes(
        getField(data, "taxRegime.optedOut")
      );

      const afterDueDate = isYes(
        getField(data, "filingStatus.afterDueDate")
      );

      return !(optedOut && afterDueDate);
    },
  },

  {
    id: "ITR2-A-20",
    officialSerial: 20,
    category: "A",
    field: "residentialStatus",
    description:
      "Residents and resident but not ordinarily residents cannot be FII/FPIs.",
    validate: (data) => {
      const residentialStatus = String(
        getField(data, "residentialStatus") ?? ""
      ).toUpperCase();

      const fpi = isYes(
        getField(data, "isFPI")
      );

      const isResidentOrRNOR = [
        "RESIDENT",
        "R",
        "RNOR",
        "RESIDENT BUT NOT ORDINARILY RESIDENT",
      ].includes(residentialStatus);

      return !(isResidentOrRNOR && fpi);
    },
  },

  {
    id: "ITR2-A-21",
    officialSerial: 21,
    category: "A",
    field: "taxRegime",
    description:
      "The old tax regime cannot be selected after the due date where the return is filed under section 139(1).",
    validate: (data) => {
      const oldRegime = isOldRegime(data);

      const section = String(
        getField(
          data,
          "filingStatus.returnSection"
        ) ?? ""
      );

      const afterDueDate = isYes(
        getField(data, "filingStatus.afterDueDate")
      );

      return !(
        oldRegime &&
        section === "139(1)" &&
        afterDueDate
      );
    },
  },

  /* -----------------------------------------------------
     Salary rules 22–27
  ----------------------------------------------------- */

  {
    id: "ITR2-A-22",
    officialSerial: 22,
    category: "A",
    field: "scheduleS.employers.salary17_1",
    description:
      "Gross salary under section 17(1) for each employer must equal the sum of its salary components.",
    validate: (data) => {
      const employers = getSalaryEmployers(data);

      if (employers.length === 0) return true;

      return employers.every((employer) => {
        const components =
          getEmployerComponents(employer);

        const keys: (keyof SalaryComponents)[] = [
          "basicSalary",
          "dearnessAllowance",
          "gratuity",
          "commutedPension",
          "leaveEncashment",
          "leaveTravelAllowance",
          "otherAllowance",
          "others",
        ];

        const values = keys.map(
          (key) => components[key]
        );

        const calculated = sumNumbers(values);

        const declared = asNumber(
          components.total
        );

        return approximatelyEqual(
          calculated,
          declared
        );
      });
    },
  },

  {
    id: "ITR2-A-23",
    officialSerial: 23,
    category: "A",
    field: "scheduleS.totalGrossSalary",
    description:
      "Total gross salary from all employers must equal the sum of gross salary for each employer.",
    validate: (data) => {
      const employers = getSalaryEmployers(data);

      if (employers.length === 0) return true;

      const calculated = sumNumbers(
        employers.map(
          (employer) => employer.grossSalary
        )
      );

      return approximatelyEqual(
        calculated,
        salaryTotal(data)
      );
    },
  },

  {
    id: "ITR2-A-24",
    officialSerial: 24,
    category: "A",
    field: "scheduleS.exemptAllowances.total",
    description:
      "Allowances exempt under section 10 must equal the sum of the individual exemption dropdown values.",
    validate: (data) => {
      const exemptions = getExemptions(data);

      const dropdownTotal =
        allExemptionDropdownTotal(exemptions);

      const hra = exemptionAmount(
        exemptions,
        "hra"
      );

      const declared = asNumber(
        exemptions.total
      );

      if (
        dropdownTotal === undefined ||
        declared === undefined
      ) {
        return false;
      }

      return approximatelyEqual(
        declared,
        dropdownTotal + hra
      );
    },
  },

  {
    id: "ITR2-A-25",
    officialSerial: 25,
    category: "A",
    field: "scheduleS.netSalary",
    description:
      "Net salary must equal total gross salary minus exempt allowances and the applicable section 3a adjustment.",
    validate: (data) => {
      const gross = salaryTotal(data);

      const exemptions = getNumber(
        data,
        "scheduleS.exemptAllowances.total"
      );

      const adjustment =
        getNumber(
          data,
          "scheduleS.adjustment3a"
        ) ?? 0;

      const net = netSalary(data);

      if (
        gross === undefined ||
        exemptions === undefined ||
        net === undefined
      ) {
        return false;
      }

      return approximatelyEqual(
        net,
        gross - exemptions - adjustment
      );
    },
  },

  {
    id: "ITR2-A-26",
    officialSerial: 26,
    category: "A",
    field: "scheduleS.deductions16.total",
    description:
      "Deductions under section 16 must equal the sum of deductions under sections 16(i), 16(ii) and 16(iii).",
    validate: (data) => {
      const deductions = getDeduction16(data);

      const calculated = sumNumbers([
        deductions.standardDeduction,
        deductions.entertainmentAllowance,
        deductions.professionalTax,
      ]);

      return approximatelyEqual(
        calculated,
        asNumber(deductions.total)
      );
    },
  },

  {
    id: "ITR2-A-27",
    officialSerial: 27,
    category: "A",
    field: "scheduleS.incomeChargeableUnderSalaries",
    description:
      "Income chargeable under Salaries must equal net salary minus deductions under section 16.",
    validate: (data) => {
      const net = netSalary(data);

      const deductions =
        totalDeductions16(data);

      const income = salaryIncome(data);

      if (
        net === undefined ||
        deductions === undefined ||
        income === undefined
      ) {
        return false;
      }

      return approximatelyEqual(
        income,
        net - deductions
      );
    },
  },

  /* -----------------------------------------------------
     Salary rules 28–66
  ----------------------------------------------------- */

  {
    id: "ITR2-A-28",
    officialSerial: 28,
    category: "A",
    field: "scheduleS.exemptAllowances.gratuity",
    description:
      "Gratuity exemption must not exceed gratuity salary offered or the applicable limit of Rs. 20 lakh or Rs. 25 lakh based on employer nature.",
    validate: (data) => {
  const employers = getSalaryEmployers(data);

  const exemption = selectedExemption(
    data,
    EXEMPTION.GRATUITY
  );

  if (exemption === 0) return true;

  if (employers.length === 0) return false;

  const gratuitySalary =
    allEmployerComponentTotal(
      employers,
      "gratuity"
    );

  if (exemption > gratuitySalary) {
    return false;
  }

  const employerTypes = employers.map(
    employerNature
  );

  const allCentralOrStateGovernment =
    employerTypes.every((nature) =>
      [
        "CGOV",
        "SGOV",
        "CG",
        "SG",
        "CENTRAL GOVERNMENT",
        "STATE GOVERNMENT",
      ].includes(nature)
    );

  const limit = allCentralOrStateGovernment
    ? 2500000
    : 2000000;

  return exemption <= limit;
},
  },

  {
    id: "ITR2-A-29",
    officialSerial: 29,
    category: "A",
    field: "scheduleS.exemptAllowances.hra",
    description:
      "Under the old regime, HRA exemption must not exceed 50% of the applicable salary or HRA received, subject to the prescribed calculation.",
    validate: (data) => {
      if (!isOldRegime(data)) return true;

      const exemptions = getExemptions(data);

      const hra = exemptionAmount(
        exemptions,
        "hra"
      );

      const employers = getSalaryEmployers(data);

      const salary = employers.reduce(
        (total, employer) =>
          total +
          salaryComponent(employer, "basicSalary") +
          salaryComponent(
            employer,
            "dearnessAllowance"
          ),
        0
      );

      const hraReceived = employers.reduce(
        (total, employer) =>
          total +
          (asNumber(
            getEmployerComponents(employer).hraReceived
          ) ?? 0),
        0
      );

      return (
        hra <= salary * 0.5 &&
        hra <= hraReceived
      );
    },
  },

  {
    id: "ITR2-A-30",
    officialSerial: 30,
    category: "A",
    field: "scheduleS.exemptAllowances.retrenchment",
    description:
      "Exemption under section 10(10B), second proviso, must not exceed compensation received or Rs. 5 lakh.",
    validate: (data) => {
      const exemption = selectedExemption(
        data,
        EXEMPTION.RETRENCHMENT_APPROVED
      );

      const compensation =
        allEmployerComponentTotal(
          getSalaryEmployers(data),
          "others"
        );

      return (
        exemption <= compensation &&
        exemption <= 500000
      );
    },
  },

  {
    id: "ITR2-A-31",
    officialSerial: 31,
    category: "A",
    field: "scheduleS.exemptAllowances.total",
    description:
      "Exempt allowances under section 10 excluding HRA must not exceed the applicable salary base after reducing HRA.",
    validate: (data) => {
      const employers = getSalaryEmployers(data);

      const salaryBase =
        allEmployerComponentTotal(
          employers,
          "basicSalary"
        ) +
        allEmployerComponentTotal(
          employers,
          "dearnessAllowance"
        ) +
        allEmployerComponentTotal(
          employers,
          "otherAllowance"
        ) -
        allEmployerComponentTotal(
          employers,
          "leaveTravelAllowance"
        );

      const hra = selectedExemption(
        data,
        EXEMPTION.HRA
      );

      const otherExemptions =
        exemptionAmount(
          getExemptions(data),
          "total"
        ) - hra;

      return otherExemptions <= salaryBase;
    },
  },

  {
    id: "ITR2-A-32",
    officialSerial: 32,
    category: "A",
    field: "scheduleS.salary17_1",
    description:
      "The sum of salary section 17(1) dropdowns must equal the section 17(1) total.",
    validate: (data) => {
      const employers = getSalaryEmployers(data);

      return employers.every((employer) => {
        const components =
          getEmployerComponents(employer);

        const declared = asNumber(
          components.total
        );

        const keys: (keyof SalaryComponents)[] = [
          "basicSalary",
          "dearnessAllowance",
          "gratuity",
          "commutedPension",
          "leaveEncashment",
          "leaveTravelAllowance",
          "otherAllowance",
          "others",
        ];

        return approximatelyEqual(
          sumNumbers(
            keys.map((key) => components[key])
          ),
          declared
        );
      });
    },
  },

  {
    id: "ITR2-A-33",
    officialSerial: 33,
    category: "A",
    field: "scheduleS.salary17_2",
    description:
      "The sum of section 17(2) dropdowns must equal the section 17(2) total.",
    validate: (data) => {
      const employers = getSalaryEmployers(data);

      return employers.every((employer) => {
        const perquisites = getArray(
          employer.perquisites
        );

        const sum = sumNumbers(
          perquisites.map(
            (item) => item.amount
          )
        );

        const declared = asNumber(
          employer.salary17_2
        );

        return approximatelyEqual(
          sum,
          declared
        );
      });
    },
  },

  {
    id: "ITR2-A-34",
    officialSerial: 34,
    category: "A",
    field: "scheduleS.salary17_3",
    description:
      "The sum of section 17(3) dropdowns must equal the section 17(3) total.",
    validate: (data) => {
      const employers = getSalaryEmployers(data);

      return employers.every((employer) => {
        const profits = getArray(
          employer.profitsInLieu
        );

        const sum = sumNumbers(
          profits.map(
            (item) => item.amount
          )
        );

        const declared = asNumber(
          employer.salary17_3
        );

        return approximatelyEqual(
          sum,
          declared
        );
      });
    },
  },

  {
    id: "ITR2-A-35",
    officialSerial: 35,
    category: "A",
    field: "scheduleS.deductions16.entertainmentAllowance",
    description:
      "Entertainment allowance under section 16(ii) is not allowed for employees other than government employees.",
    validate: (data) => {
      const amount = getNumber(
        data,
        "scheduleS.deductions16.entertainmentAllowance"
      ) ?? 0;

      if (amount === 0) return true;

      return getSalaryEmployers(data).some(
        isGovernmentOrPSU
      );
    },
  },

  {
    id: "ITR2-A-36",
    officialSerial: 36,
    category: "A",
    field: "scheduleS.deductions16.entertainmentAllowance",
    description:
      "Under the old regime, entertainment allowance is limited to the lower of Rs. 5,000 or one-fifth of basic salary for eligible government/PSU employees.",
    validate: (data) => {
      if (!isOldRegime(data)) return true;

      const claimed = getNumber(
        data,
        "scheduleS.deductions16.entertainmentAllowance"
      ) ?? 0;

      const employers = getSalaryEmployers(data);

      const eligible = employers.filter(
        isGovernmentOrPSU
      );

      const basic = eligible.reduce(
        (total, employer) =>
          total +
          salaryComponent(
            employer,
            "basicSalary"
          ),
        0
      );

      const limit = Math.min(
        5000,
        basic / 5
      );

      return claimed <= limit;
    },
  },

  {
    id: "ITR2-A-37",
    officialSerial: 37,
    category: "A",
    field: "scheduleS.deductions16.professionalTax",
    description:
      "Professional tax deduction under section 16(iii) must not exceed Rs. 5,000.",
    validate: (data) =>
      (getNumber(
        data,
        "scheduleS.deductions16.professionalTax"
      ) ?? 0) <= 5000,
  },

  {
    id: "ITR2-A-38",
    officialSerial: 38,
    category: "A",
    field: "scheduleS.employers.salary17_1.gratuity",
    description:
      "Gratuity under section 17(1) must not be claimed against more than one employer.",
    validate: (data) => {
      const count = getSalaryEmployers(data).filter(
        (employer) =>
          salaryComponent(
            employer,
            "gratuity"
          ) > 0
      ).length;

      return count <= 1;
    },
  },

  {
    id: "ITR2-A-39",
    officialSerial: 39,
    category: "A",
    field: "scheduleS.employers.salary17_1.commutedPension",
    description:
      "Commuted pension under section 17(1) must not be claimed against more than one employer.",
    validate: (data) => {
      const count = getSalaryEmployers(data).filter(
        (employer) =>
          salaryComponent(
            employer,
            "commutedPension"
          ) > 0
      ).length;

      return count <= 1;
    },
  },

  {
    id: "ITR2-A-40",
    officialSerial: 40,
    category: "A",
    field: "scheduleS.deductions16.standardDeduction",
    description:
      "Under the old regime, standard deduction must not exceed the lower of Rs. 50,000 or net salary.",
    validate: (data) => {
      if (!isOldRegime(data)) return true;

      const claimed = getNumber(
        data,
        "scheduleS.deductions16.standardDeduction"
      ) ?? 0;

      const net = netSalary(data);

      if (net === undefined) return false;

      return claimed <= Math.min(
        50000,
        net
      );
    },
  },

  {
    id: "ITR2-A-41",
    officialSerial: 41,
    category: "A",
    field: "scheduleS.exemptAllowances.lta",
    description:
      "Leave travel concession/assistance exemption must not exceed leave travel allowance under section 17(1).",
    validate: (data) =>
      selectedExemption(
        data,
        EXEMPTION.LTA
      ) <=
      allEmployerComponentTotal(
        getSalaryEmployers(data),
        "leaveTravelAllowance"
      ),
  },

  {
    id: "ITR2-A-42",
    officialSerial: 42,
    category: "A",
    field: "scheduleS.exemptAllowances.foreignEmbassy",
    description:
      "Exemption under section 10(6) must not exceed gross salary under section 17(1), 17(2) and 17(3).",
    validate: (data) => {
      const employers = getSalaryEmployers(data);

      const gross = employers.reduce(
        (total, employer) =>
          total +
          (employerGross17_1(employer) ?? 0) +
          (asNumber(
            employer.salary17_2
          ) ?? 0) +
          (asNumber(
            employer.salary17_3
          ) ?? 0),
        0
      );

      return selectedExemption(
        data,
        EXEMPTION.FOREIGN_EMBASSY
      ) <= gross;
    },
  },

  {
    id: "ITR2-A-43",
    officialSerial: 43,
    category: "A",
    field: "scheduleS.exemptAllowances.foreignService",
    description:
      "Exemption under section 10(7) must not exceed gross salary under sections 17(1), 17(2) and 17(3).",
    validate: (data) => {
      const employers = getSalaryEmployers(data);

      const gross = employers.reduce(
        (total, employer) =>
          total +
          (employerGross17_1(employer) ?? 0) +
          (asNumber(
            employer.salary17_2
          ) ?? 0) +
          (asNumber(
            employer.salary17_3
          ) ?? 0),
        0
      );

      return selectedExemption(
        data,
        EXEMPTION.FOREIGN_SERVICE
      ) <= gross;
    },
  },

  {
    id: "ITR2-A-44",
    officialSerial: 44,
    category: "A",
    field: "scheduleS.exemptAllowances.commutedPension",
    description:
      "Commuted pension exemption under section 10(10A) must not exceed salary under section 17(1).",
    validate: (data) =>
      selectedExemption(
        data,
        EXEMPTION.COMMUTED_PENSION
      ) <=
      allEmployerComponentTotal(
        getSalaryEmployers(data),
        "commutedPension"
      ),
  },

  {
    id: "ITR2-A-45",
    officialSerial: 45,
    category: "A",
    field: "scheduleS.exemptAllowances.leaveEncashment",
    description:
      "Leave encashment exemption under section 10(10AA) must not exceed leave encashment under section 17(1).",
    validate: (data) =>
      selectedExemption(
        data,
        EXEMPTION.LEAVE_ENCASHMENT
      ) <=
      allEmployerComponentTotal(
        getSalaryEmployers(data),
        "leaveEncashment"
      ),
  },

  {
    id: "ITR2-A-46",
    officialSerial: 46,
    category: "A",
    field: "scheduleS.exemptAllowances.voluntaryRetirement",
    description:
      "Exemption under section 10(10C) must not exceed Rs. 5 lakh.",
    validate: (data) =>
      selectedExemption(
        data,
        EXEMPTION.VOLUNTARY_RETIREMENT
      ) <= 500000,
  },

  {
    id: "ITR2-A-47",
    officialSerial: 47,
    category: "A",
    field: "scheduleS.exemptAllowances",
    description:
      "Only one of section 10(10B)(i), section 10(10B)(ii) or section 10(10C) may be claimed.",
    validate: (data) => {
      const claims = [
        EXEMPTION.RETRENCHMENT,
        EXEMPTION.RETRENCHMENT_APPROVED,
        EXEMPTION.VOLUNTARY_RETIREMENT,
      ].filter(
        (code) => hasExemption(data, code)
      );

      return claims.length <= 1;
    },
  },

  {
    id: "ITR2-A-48",
    officialSerial: 48,
    category: "A",
    field: "scheduleS.exemptAllowances.nonMonetaryTax",
    description:
      "Exemption under section 10(10CC) must not exceed the value of perquisites under section 17(2).",
    validate: (data) => {
      const perquisites = getSalaryEmployers(data)
        .reduce(
          (total, employer) =>
            total +
            (asNumber(
              employer.salary17_2
            ) ?? 0),
          0
        );

      return selectedExemption(
        data,
        EXEMPTION.NON_MONETARY_TAX
      ) <= perquisites;
    },
  },

  {
    id: "ITR2-A-49",
    officialSerial: 49,
    category: "A",
    field: "scheduleS.exemptAllowances.dutyAllowanceI",
    description:
      "Section 10(14)(i) exemption must not exceed the eligible other allowance and other salary amounts under section 17(1).",
    validate: (data) => {
      const employers = getSalaryEmployers(data);

      const base =
        allEmployerComponentTotal(
          employers,
          "otherAllowance"
        ) +
        allEmployerComponentTotal(
          employers,
          "others"
        );

      return selectedExemption(
        data,
        EXEMPTION.DUTY_ALLOWANCE_I
      ) <= base;
    },
  },

  {
    id: "ITR2-A-50",
    officialSerial: 50,
    category: "A",
    field: "scheduleS.exemptAllowances.dutyAllowanceII",
    description:
      "Section 10(14)(ii) exemption must not exceed the eligible other allowance and other salary amounts under section 17(1).",
    validate: (data) => {
      const employers = getSalaryEmployers(data);

      const base =
        allEmployerComponentTotal(
          employers,
          "otherAllowance"
        ) +
        allEmployerComponentTotal(
          employers,
          "others"
        );

      return selectedExemption(
        data,
        EXEMPTION.DUTY_ALLOWANCE_II
      ) <= base;
    },
  },

  {
    id: "ITR2-A-51",
    officialSerial: 51,
    category: "A",
    field: "scheduleS.exemptAllowances.otherAllowances",
    description:
      "The same exempt allowance must not be selected more than once.",
    validate: (data) => {
      const dropdowns = exemptionDropdowns(
        getExemptions(data)
      );

      const sections = dropdowns
        .map(
          (item) =>
            String(item.section ?? "")
        )
        .filter(Boolean);

      return (
        new Set(sections).size ===
        sections.length
      );
    },
  },

  {
    id: "ITR2-A-52",
    officialSerial: 52,
    category: "A",
    field: "deductions80GG",
    description:
      "If section 10(13A) HRA exemption is claimed, deduction under section 80GG must not exceed Rs. 55,000.",
    validate: (data) => {
      if (
        !hasExemption(
          data,
          EXEMPTION.HRA
        )
      ) {
        return true;
      }

      return (
        (getNumber(
          data,
          "deductions80GG"
        ) ?? 0) <= 55000
      );
    },
  },

  {
    id: "ITR2-A-53",
    officialSerial: 53,
    category: "A",
    field: "scheduleS.exemptAllowances.leaveEncashment",
    description:
      "For employer types other than central/state government, section 10(10AA) exemption must not exceed Rs. 25 lakh.",
   validate: (data) => {
  const employers = getSalaryEmployers(data);

  const claimed = selectedExemption(
    data,
    EXEMPTION.LEAVE_ENCASHMENT
  );

  if (claimed === 0) return true;

  if (employers.length === 0) {
    return false;
  }

  const allCentralOrStateGovernment =
    employers.every((employer) =>
      [
        "CGOV",
        "SGOV",
        "CG",
        "SG",
        "CENTRAL GOVERNMENT",
        "STATE GOVERNMENT",
      ].includes(employerNature(employer))
    );

  if (allCentralOrStateGovernment) {
    return true;
  }

  return claimed <= 2500000;
},
  },

  {
    id: "ITR2-A-54",
    officialSerial: 54,
    category: "A",
    field: "scheduleS.exemptAllowances",
    description:
      "Under the new regime, exemptions under sections 10(5), 10(13A), 10(14)(i), 10(14)(ii) and 10(17) must not be claimed.",
    validate: (data) => {
      if (!isNewRegime(data)) return true;

      const prohibited = [
        EXEMPTION.LTA,
        EXEMPTION.HRA,
        EXEMPTION.DUTY_ALLOWANCE_I,
        EXEMPTION.DUTY_ALLOWANCE_II,
        EXEMPTION.MP_ALLOWANCE,
      ];

      return prohibited.every(
        (code) =>
          selectedExemption(data, code) === 0
      );
    },
  },

  {
    id: "ITR2-A-55",
    officialSerial: 55,
    category: "A",
    field: "scheduleS.exemptAllowances",
    description:
      "Under the old regime, the specified section 10(14)(i) and section 10(14)(ii) transport allowances must not be claimed.",
    validate: (data) => {
      if (!isOldRegime(data)) return true;

      const prohibited = [
        "10(14)(i)-Rule2BB",
        "10(14)(ii)-Transport",
      ];

      return prohibited.every(
        (code) =>
          selectedExemption(data, code) === 0
      );
    },
  },

  {
    id: "ITR2-A-56",
    officialSerial: 56,
    category: "A",
    field: "scheduleS.exemptAllowances.transport",
    description:
      "Transport allowance exemption under section 10(14)(ii) must not exceed Rs. 38,400.",
    validate: (data) =>
      selectedExemption(
        data,
        "10(14)(ii)-Transport"
      ) <= 38400,
  },

  {
    id: "ITR2-A-57",
    officialSerial: 57,
    category: "A",
    field: "scheduleS.deductions16.entertainmentAllowance",
    description:
      "Under the new regime, entertainment allowance under section 16(ii) cannot be claimed.",
    validate: (data) =>
      !isNewRegime(data) ||
      (getNumber(
        data,
        "scheduleS.deductions16.entertainmentAllowance"
      ) ?? 0) === 0,
  },

  {
    id: "ITR2-A-58",
    officialSerial: 58,
    category: "A",
    field: "scheduleS.deductions16.professionalTax",
    description:
      "Under the new regime, professional tax under section 16(iii) cannot be claimed.",
    validate: (data) =>
      !isNewRegime(data) ||
      (getNumber(
        data,
        "scheduleS.deductions16.professionalTax"
      ) ?? 0) === 0,
  },

  {
    id: "ITR2-A-59",
    officialSerial: 59,
    category: "A",
    field: "scheduleS.incomeRelief89A",
    description:
      "HUF cannot claim income relief under section 89A.",
    validate: (data) => {
      const entityType = String(
        getField(data, "entityType") ?? ""
      ).toUpperCase();

      const relief = getNumber(
        data,
        "scheduleS.incomeRelief89A"
      ) ?? 0;

      return !(
        entityType === "HUF" &&
        relief > 0
      );
    },
  },

  {
    id: "ITR2-A-60",
    officialSerial: 60,
    category: "A",
    field: "scheduleS.incomeRelief89A",
    description:
      "Income claimed for relief under section 89A must not exceed income offered under section 17(1) for the applicable retirement benefit account.",
    validate: (data) => {
      const relief = getNumber(
        data,
        "scheduleS.incomeRelief89A"
      ) ?? 0;

      const income = getNumber(
        data,
        "scheduleS.incomeNotified89A"
      ) ?? 0;

      return relief <= income;
    },
  },

  {
    id: "ITR2-A-61",
    officialSerial: 61,
    category: "A",
    field: "scheduleS.salary17_1",
    description:
      "The sum of salary section 17(1) dropdowns must equal the section 17(1) total.",
    validate: (data) => {
  const employers = getSalaryEmployers(data);

  return employers.every((employer) => {
    const components =
      getEmployerComponents(employer);

    const declared = asNumber(
      components.total
    );

    const keys: (keyof SalaryComponents)[] = [
      "basicSalary",
      "dearnessAllowance",
      "gratuity",
      "commutedPension",
      "leaveEncashment",
      "leaveTravelAllowance",
      "otherAllowance",
      "others",
    ];

    const componentValues = keys.map(
      (key) => components[key]
    );

    const sum = sumNumbers(componentValues);

    return approximatelyEqual(sum, declared);
  });
},
  },

  {
    id: "ITR2-A-62",
    officialSerial: 62,
    category: "A",
    field: "scheduleS.exemptAllowances.retrenchment",
    description:
      "The specified section 10(10B) exemption must be claimed only by eligible central/state government employees or the applicable pensioner categories.",
    validate: (data) => {
  const claimed =
    selectedExemption(
      data,
      EXEMPTION.RETRENCHMENT
    ) +
    selectedExemption(
      data,
      EXEMPTION.RETRENCHMENT_APPROVED
    );

  if (claimed === 0) return true;

  const eligibleEmployerTypes = [
    "CGOV",
    "SGOV",
    "CG",
    "SG",
    "CENTRAL GOVERNMENT",
    "STATE GOVERNMENT",
    "CG-PENSIONERS",
    "SG-PENSIONERS",
  ];

  return getSalaryEmployers(data).some(
    (employer) =>
      eligibleEmployerTypes.includes(
        employerNature(employer)
      )
  );
},
  },

  {
    id: "ITR2-A-63",
    officialSerial: 63,
    category: "A",
    field: "scheduleS.employers.perquisites",
    description:
      "Income must not be entered more than once against the same perquisite dropdown within each block.",
    validate: (data) =>
      getSalaryEmployers(data).every(
        (employer) => {
          const entries = getArray(
            employer.perquisites
          );

          const keys = entries
            .map(
              (item) =>
                String(item.section ?? "")
            )
            .filter(Boolean);

          return (
            new Set(keys).size === keys.length
          );
        }
      ),
  },

  {
    id: "ITR2-A-64",
    officialSerial: 64,
    category: "A",
    field: "scheduleS.employers.profitsInLieu",
    description:
      "Income must not be entered more than once against the same profits-in-lieu dropdown within each block.",
    validate: (data) =>
      getSalaryEmployers(data).every(
        (employer) => {
          const entries = getArray(
            employer.profitsInLieu
          );

          const keys = entries
            .map(
              (item) =>
                String(item.section ?? "")
            )
            .filter(Boolean);

          return (
            new Set(keys).size === keys.length
          );
        }
      ),
  },

  {
    id: "ITR2-A-65",
    officialSerial: 65,
    category: "A",
    field: "scheduleS.retirementAccounts",
    description:
      "A country must not be selected more than once for income from retirement benefit accounts maintained in notified countries under section 89A.",
    validate: (data) => {
      const accounts = getArray(
        getField(
          data,
          "scheduleS.retirementAccounts"
        )
      );

      const countries = accounts
        .map(
          (item) =>
            String(item.country ?? "")
        )
        .filter(Boolean);

      return (
        new Set(countries).size ===
        countries.length
      );
    },
  },

  {
    id: "ITR2-A-66",
    officialSerial: 66,
    category: "A",
    field: "scheduleS.exemptAllowances.retrenchment",
    description:
      "Exemption under section 10(10B)(ii) for retrenchment compensation received under an approved scheme must not exceed Rs. 5 lakh.",
    validate: (data) =>
      selectedExemption(
        data,
        EXEMPTION.RETRENCHMENT_APPROVED
      ) <= 500000,
  },
];

/* -------------------------------------------------------
   Validation runner
------------------------------------------------------- */

export function validateITR2(
  returnData: Record<string, unknown>
): ITRValidationResult {
  const errors: ITRValidationIssue[] = [];
  const warnings: ITRValidationIssue[] = [];

  // Check whether Schedule S was actually supplied.
  const scheduleS = returnData.scheduleS;

  const hasScheduleS =
    scheduleS !== null &&
    typeof scheduleS === "object" &&
    !Array.isArray(scheduleS) &&
    Object.keys(scheduleS as Record<string, unknown>).length > 0;

  for (const rule of itr2ValidationRules) {
    // Skip salary-related rules when Schedule S is absent.
    if (
      rule.officialSerial >= 22 &&
      rule.officialSerial <= 66 &&
      !hasScheduleS
    ) {
      continue;
    }

    let passed: boolean;

    try {
      passed = rule.validate(returnData);
    } catch {
      passed = false;
    }

    if (!passed) {
      const issue: ITRValidationIssue = {
        ruleId: rule.id,
        officialSerial: rule.officialSerial,
        category: rule.category,
        field: rule.field,
        message: rule.description,
      };

      if (rule.category === "A") {
        errors.push(issue);
      } else {
        warnings.push(issue);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}