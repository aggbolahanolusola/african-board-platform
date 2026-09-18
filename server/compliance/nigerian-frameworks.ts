/**
 * Nigerian Compliance Frameworks
 * Implements CAMA 2020, NCCG, and ISA requirements
 */

export interface ComplianceFramework {
  id: string;
  name: string;
  country: string;
  description: string;
  requirements: ComplianceRequirement[];
  lastUpdated: Date;
}

export interface ComplianceRequirement {
  id: string;
  section: string;
  title: string;
  description: string;
  requirement: string;
  applicableTo: string[];
  frequency: "annual" | "quarterly" | "monthly" | "ongoing";
  documentation: string[];
}

/**
 * CAMA 2020 - Companies and Allied Matters Act 2020
 * Nigerian corporate governance framework
 */
export const CAMA2020: ComplianceFramework = {
  id: "cama-2020",
  name: "CAMA 2020 - Companies and Allied Matters Act",
  country: "Nigeria",
  description:
    "Comprehensive framework for corporate governance, board meetings, and shareholder rights in Nigeria",
  lastUpdated: new Date("2023-01-01"),
  requirements: [
    {
      id: "cama-2020-1",
      section: "Section 271",
      title: "Board Meetings",
      description: "Requirements for board meeting frequency and conduct",
      requirement:
        "Board must meet at least once every quarter. Minimum notice of 7 days required. Board members must be present or represented by proxy.",
      applicableTo: ["public", "private"],
      frequency: "quarterly",
      documentation: [
        "Board meeting minutes",
        "Attendance register",
        "Proxy documentation",
      ],
    },
    {
      id: "cama-2020-2",
      section: "Section 272",
      title: "Board Resolutions",
      description: "Procedures for passing board resolutions",
      requirement:
        "Resolutions must be passed by majority vote. All resolutions must be documented in writing. Dissenting opinions must be recorded.",
      applicableTo: ["public", "private"],
      frequency: "ongoing",
      documentation: [
        "Resolution documents",
        "Voting records",
        "Dissent records",
      ],
    },
    {
      id: "cama-2020-3",
      section: "Section 379",
      title: "Annual General Meetings",
      description: "Requirements for AGM conduct and shareholder participation",
      requirement:
        "AGM must be held within 6 months of financial year end. 21 days notice required. Quorum of 2 members or 25% of shareholding required.",
      applicableTo: ["public", "private"],
      frequency: "annual",
      documentation: [
        "AGM notice",
        "Attendance register",
        "AGM minutes",
        "Voting results",
      ],
    },
    {
      id: "cama-2020-4",
      section: "Section 380",
      title: "Directors' Report",
      description: "Annual report requirements for directors",
      requirement:
        "Directors must present annual report to shareholders including financial statements, compliance status, and material events.",
      applicableTo: ["public", "private"],
      frequency: "annual",
      documentation: [
        "Directors' report",
        "Financial statements",
        "Audit report",
      ],
    },
    {
      id: "cama-2020-5",
      section: "Section 384",
      title: "Audit Committee",
      description: "Requirements for audit committee establishment and operation",
      requirement:
        "Public companies must establish audit committee. Committee must review internal controls, audit findings, and financial reporting.",
      applicableTo: ["public"],
      frequency: "quarterly",
      documentation: [
        "Audit committee charter",
        "Meeting minutes",
        "Audit reports",
      ],
    },
  ],
};

/**
 * NCCG - Nigerian Code of Corporate Governance
 * Best practices for corporate governance
 */
export const NCCG: ComplianceFramework = {
  id: "nccg",
  name: "Nigerian Code of Corporate Governance",
  country: "Nigeria",
  description:
    "Best practices code for corporate governance, board composition, and stakeholder management",
  lastUpdated: new Date("2023-01-01"),
  requirements: [
    {
      id: "nccg-1",
      section: "Principle 1",
      title: "Board Leadership and Effectiveness",
      description: "Requirements for board composition and leadership",
      requirement:
        "Board should comprise mix of executive and non-executive directors. Board chair should be non-executive. Board should have clear role and responsibilities.",
      applicableTo: ["public", "private"],
      frequency: "annual",
      documentation: [
        "Board charter",
        "Director profiles",
        "Board evaluation report",
      ],
    },
    {
      id: "nccg-2",
      section: "Principle 2",
      title: "Board Committees",
      description: "Requirements for board committee structure",
      requirement:
        "Board should establish audit, remuneration, and nomination committees. Committees should be chaired by non-executive directors.",
      applicableTo: ["public"],
      frequency: "ongoing",
      documentation: [
        "Committee charters",
        "Committee membership",
        "Committee meeting minutes",
      ],
    },
    {
      id: "nccg-3",
      section: "Principle 3",
      title: "Director Appointment and Removal",
      description: "Procedures for director appointment and removal",
      requirement:
        "Directors should be appointed through formal, transparent process. Removal should follow due process. Term limits should be established.",
      applicableTo: ["public", "private"],
      frequency: "annual",
      documentation: [
        "Appointment procedures",
        "Director contracts",
        "Removal documentation",
      ],
    },
    {
      id: "nccg-4",
      section: "Principle 4",
      title: "Director Remuneration",
      description: "Guidelines for director compensation",
      requirement:
        "Remuneration should be transparent and linked to performance. Disclosure of remuneration policy required. Executive compensation should be approved by shareholders.",
      applicableTo: ["public"],
      frequency: "annual",
      documentation: [
        "Remuneration policy",
        "Compensation disclosure",
        "Shareholder approval",
      ],
    },
    {
      id: "nccg-5",
      section: "Principle 5",
      title: "Stakeholder Relations",
      description: "Requirements for stakeholder engagement",
      requirement:
        "Company should maintain constructive relationships with stakeholders. Grievance mechanism should be established. Regular stakeholder communication required.",
      applicableTo: ["public", "private"],
      frequency: "ongoing",
      documentation: [
        "Stakeholder engagement plan",
        "Grievance records",
        "Communication logs",
      ],
    },
  ],
};

/**
 * ISA - Integrated Sustainability Assurance
 * Environmental, social, and governance framework
 */
export const ISA: ComplianceFramework = {
  id: "isa",
  name: "Integrated Sustainability Assurance",
  country: "Nigeria",
  description:
    "Framework for environmental, social, and governance (ESG) reporting and assurance",
  lastUpdated: new Date("2023-01-01"),
  requirements: [
    {
      id: "isa-1",
      section: "Environmental",
      title: "Environmental Management",
      description: "Environmental sustainability requirements",
      requirement:
        "Company should establish environmental policy. Carbon footprint tracking required. Waste management procedures should be documented.",
      applicableTo: ["public"],
      frequency: "annual",
      documentation: [
        "Environmental policy",
        "Carbon audit",
        "Waste management plan",
      ],
    },
    {
      id: "isa-2",
      section: "Social",
      title: "Social Responsibility",
      description: "Social impact and community engagement",
      requirement:
        "Company should conduct social impact assessment. Community engagement programs required. Employee welfare policies should be documented.",
      applicableTo: ["public", "private"],
      frequency: "annual",
      documentation: [
        "Social impact report",
        "Community engagement log",
        "Employee welfare policy",
      ],
    },
    {
      id: "isa-3",
      section: "Governance",
      title: "Governance Standards",
      description: "Governance and compliance requirements",
      requirement:
        "Company should maintain governance framework. Board diversity policy required. Compliance monitoring procedures should be established.",
      applicableTo: ["public", "private"],
      frequency: "ongoing",
      documentation: [
        "Governance framework",
        "Diversity policy",
        "Compliance monitoring report",
      ],
    },
    {
      id: "isa-4",
      section: "Reporting",
      title: "Integrated Reporting",
      description: "Requirements for integrated sustainability reporting",
      requirement:
        "Company should publish integrated report covering financial and non-financial performance. Third-party assurance recommended.",
      applicableTo: ["public"],
      frequency: "annual",
      documentation: [
        "Integrated report",
        "Assurance report",
        "Performance metrics",
      ],
    },
  ],
};

/**
 * Get all Nigerian compliance frameworks
 */
export function getNigerianFrameworks(): ComplianceFramework[] {
  return [CAMA2020, NCCG, ISA];
}

/**
 * Get framework by ID
 */
export function getFrameworkById(id: string): ComplianceFramework | undefined {
  const frameworks = getNigerianFrameworks();
  return frameworks.find((f) => f.id === id);
}

/**
 * Get requirements for a specific framework
 */
export function getFrameworkRequirements(
  frameworkId: string
): ComplianceRequirement[] {
  const framework = getFrameworkById(frameworkId);
  return framework?.requirements || [];
}

/**
 * Check compliance against a framework
 */
export interface ComplianceCheckResult {
  frameworkId: string;
  requirement: ComplianceRequirement;
  status: "compliant" | "non-compliant" | "partial" | "not-applicable";
  evidence: string[];
  notes: string;
  lastChecked: Date;
}

export function createComplianceCheckResult(
  frameworkId: string,
  requirementId: string,
  status: "compliant" | "non-compliant" | "partial" | "not-applicable",
  evidence: string[],
  notes: string
): ComplianceCheckResult | null {
  const framework = getFrameworkById(frameworkId);
  if (!framework) return null;

  const requirement = framework.requirements.find((r) => r.id === requirementId);
  if (!requirement) return null;

  return {
    frameworkId,
    requirement,
    status,
    evidence,
    notes,
    lastChecked: new Date(),
  };
}
