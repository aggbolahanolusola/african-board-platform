import { describe, it, expect } from "vitest";
import {
  getNigerianFrameworks,
  getFrameworkById,
  getFrameworkRequirements,
  createComplianceCheckResult,
  CAMA2020,
  NCCG,
  ISA,
} from "./nigerian-frameworks";

describe("Nigerian Compliance Frameworks", () => {
  describe("Framework Retrieval", () => {
    it("should return all three Nigerian frameworks", () => {
      const frameworks = getNigerianFrameworks();
      expect(frameworks).toHaveLength(3);
    });

    it("should include CAMA 2020 framework", () => {
      const frameworks = getNigerianFrameworks();
      expect(frameworks.some((f) => f.id === "cama-2020")).toBe(true);
    });

    it("should include NCCG framework", () => {
      const frameworks = getNigerianFrameworks();
      expect(frameworks.some((f) => f.id === "nccg")).toBe(true);
    });

    it("should include ISA framework", () => {
      const frameworks = getNigerianFrameworks();
      expect(frameworks.some((f) => f.id === "isa")).toBe(true);
    });
  });

  describe("Get Framework by ID", () => {
    it("should retrieve CAMA 2020 framework", () => {
      const framework = getFrameworkById("cama-2020");
      expect(framework).toBeDefined();
      expect(framework?.name).toBe("CAMA 2020 - Companies and Allied Matters Act");
    });

    it("should retrieve NCCG framework", () => {
      const framework = getFrameworkById("nccg");
      expect(framework).toBeDefined();
      expect(framework?.name).toBe("Nigerian Code of Corporate Governance");
    });

    it("should retrieve ISA framework", () => {
      const framework = getFrameworkById("isa");
      expect(framework).toBeDefined();
      expect(framework?.name).toBe("Integrated Sustainability Assurance");
    });

    it("should return undefined for invalid framework ID", () => {
      const framework = getFrameworkById("invalid-id");
      expect(framework).toBeUndefined();
    });
  });

  describe("CAMA 2020 Framework", () => {
    it("should have board meeting requirements", () => {
      const requirements = getFrameworkRequirements("cama-2020");
      expect(requirements.some((r) => r.title === "Board Meetings")).toBe(true);
    });

    it("should have AGM requirements", () => {
      const requirements = getFrameworkRequirements("cama-2020");
      expect(requirements.some((r) => r.title === "Annual General Meetings")).toBe(
        true
      );
    });

    it("should specify quarterly meeting frequency", () => {
      const requirements = getFrameworkRequirements("cama-2020");
      const boardMeeting = requirements.find((r) => r.title === "Board Meetings");
      expect(boardMeeting?.frequency).toBe("quarterly");
    });

    it("should require documentation", () => {
      const requirements = getFrameworkRequirements("cama-2020");
      const boardMeeting = requirements.find((r) => r.title === "Board Meetings");
      expect(boardMeeting?.documentation).toContain("Board meeting minutes");
    });
  });

  describe("NCCG Framework", () => {
    it("should have board leadership requirements", () => {
      const requirements = getFrameworkRequirements("nccg");
      expect(
        requirements.some((r) => r.title === "Board Leadership and Effectiveness")
      ).toBe(true);
    });

    it("should have committee requirements", () => {
      const requirements = getFrameworkRequirements("nccg");
      expect(requirements.some((r) => r.title === "Board Committees")).toBe(true);
    });

    it("should have stakeholder relation requirements", () => {
      const requirements = getFrameworkRequirements("nccg");
      expect(requirements.some((r) => r.title === "Stakeholder Relations")).toBe(true);
    });
  });

  describe("ISA Framework", () => {
    it("should have environmental requirements", () => {
      const requirements = getFrameworkRequirements("isa");
      expect(requirements.some((r) => r.section === "Environmental")).toBe(true);
    });

    it("should have social requirements", () => {
      const requirements = getFrameworkRequirements("isa");
      expect(requirements.some((r) => r.section === "Social")).toBe(true);
    });

    it("should have governance requirements", () => {
      const requirements = getFrameworkRequirements("isa");
      expect(requirements.some((r) => r.section === "Governance")).toBe(true);
    });

    it("should have reporting requirements", () => {
      const requirements = getFrameworkRequirements("isa");
      expect(requirements.some((r) => r.section === "Reporting")).toBe(true);
    });
  });

  describe("Compliance Check Results", () => {
    it("should create compliance check result", () => {
      const result = createComplianceCheckResult(
        "cama-2020",
        "cama-2020-1",
        "compliant",
        ["Board meeting minutes", "Attendance register"],
        "All board meetings documented"
      );

      expect(result).toBeDefined();
      expect(result?.status).toBe("compliant");
      expect(result?.evidence).toHaveLength(2);
    });

    it("should return null for invalid framework", () => {
      const result = createComplianceCheckResult(
        "invalid",
        "cama-2020-1",
        "compliant",
        [],
        ""
      );

      expect(result).toBeNull();
    });

    it("should return null for invalid requirement", () => {
      const result = createComplianceCheckResult(
        "cama-2020",
        "invalid-req",
        "compliant",
        [],
        ""
      );

      expect(result).toBeNull();
    });

    it("should set lastChecked timestamp", () => {
      const beforeTime = new Date();
      const result = createComplianceCheckResult(
        "cama-2020",
        "cama-2020-1",
        "compliant",
        [],
        ""
      );
      const afterTime = new Date();

      expect(result?.lastChecked.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime()
      );
      expect(result?.lastChecked.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe("Framework Requirements", () => {
    it("should return empty array for invalid framework", () => {
      const requirements = getFrameworkRequirements("invalid");
      expect(requirements).toHaveLength(0);
    });

    it("should return all requirements for valid framework", () => {
      const requirements = getFrameworkRequirements("cama-2020");
      expect(requirements.length).toBeGreaterThan(0);
    });

    it("should include requirement details", () => {
      const requirements = getFrameworkRequirements("cama-2020");
      const requirement = requirements[0];

      expect(requirement.id).toBeDefined();
      expect(requirement.section).toBeDefined();
      expect(requirement.title).toBeDefined();
      expect(requirement.description).toBeDefined();
      expect(requirement.requirement).toBeDefined();
      expect(requirement.applicableTo).toBeDefined();
      expect(requirement.frequency).toBeDefined();
      expect(requirement.documentation).toBeDefined();
    });
  });
});
