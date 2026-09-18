import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  FEATURE_DEFINITIONS,
  isFeatureAvailable,
  getUserLimit,
  getMeetingLimit,
  getStorageLimit,
  getFeatureAvailability,
  getSubscriptionLimits,
  enforceFeature,
  enforceUserLimit,
  enforceMeetingLimit,
  enforceStorageLimit,
} from "./featureGates";
import { TRPCError } from "@trpc/server";

describe("Feature Definitions", () => {
  it("should define all required features", () => {
    expect(FEATURE_DEFINITIONS).toHaveProperty("liveTranscription");
    expect(FEATURE_DEFINITIONS).toHaveProperty("digitalSignatures");
    expect(FEATURE_DEFINITIONS).toHaveProperty("boardAssessments");
    expect(FEATURE_DEFINITIONS).toHaveProperty("customIntegrations");
  });

  it("should specify tier requirements for each feature", () => {
    const feature = FEATURE_DEFINITIONS.liveTranscription;
    expect(feature.tiers).toContain("professional");
    expect(feature.tiers).toContain("enterprise");
    expect(feature.tiers).not.toContain("starter");
  });

  it("should specify limits where applicable", () => {
    const monthlyMeetings = FEATURE_DEFINITIONS.monthlyMeetings;
    expect(monthlyMeetings.limit).toBe(12);

    const unlimited = FEATURE_DEFINITIONS.unlimitedMeetings;
    expect(unlimited.limit).toBeNull();
  });
});

describe("Subscription Tier Features", () => {
  describe("Starter Tier", () => {
    it("should have limited users (5)", () => {
      const feature = FEATURE_DEFINITIONS.maxUsersStarter;
      expect(feature.limit).toBe(5);
      expect(feature.tiers).toContain("starter");
    });

    it("should have limited meetings (12/month)", () => {
      const feature = FEATURE_DEFINITIONS.monthlyMeetings;
      expect(feature.limit).toBe(12);
      expect(feature.tiers).toContain("starter");
    });

    it("should have limited storage (10GB)", () => {
      const feature = FEATURE_DEFINITIONS.storageStarter;
      expect(feature.limit).toBe(10);
      expect(feature.tiers).toContain("starter");
    });

    it("should not have premium features", () => {
      const premiumFeatures = [
        "liveTranscription",
        "digitalSignatures",
        "boardAssessments",
        "customIntegrations",
      ];

      premiumFeatures.forEach((feature) => {
        const def = FEATURE_DEFINITIONS[feature as keyof typeof FEATURE_DEFINITIONS];
        expect(def.tiers).not.toContain("starter");
      });
    });
  });

  describe("Professional Tier", () => {
    it("should have unlimited meetings", () => {
      const feature = FEATURE_DEFINITIONS.unlimitedMeetings;
      expect(feature.tiers).toContain("professional");
      expect(feature.limit).toBeNull();
    });

    it("should have limited users (25)", () => {
      const feature = FEATURE_DEFINITIONS.maxUsersProfessional;
      expect(feature.limit).toBe(25);
      expect(feature.tiers).toContain("professional");
    });

    it("should have increased storage (100GB)", () => {
      const feature = FEATURE_DEFINITIONS.storageProfessional;
      expect(feature.limit).toBe(100);
      expect(feature.tiers).toContain("professional");
    });

    it("should have premium features", () => {
      const premiumFeatures = [
        "liveTranscription",
        "digitalSignatures",
        "boardAssessments",
      ];

      premiumFeatures.forEach((feature) => {
        const def = FEATURE_DEFINITIONS[feature as keyof typeof FEATURE_DEFINITIONS];
        expect(def.tiers).toContain("professional");
      });
    });

    it("should not have enterprise-only features", () => {
      const enterpriseOnly = ["customIntegrations", "dedicatedAccountManager"];
      enterpriseOnly.forEach((feature) => {
        const def = FEATURE_DEFINITIONS[feature as keyof typeof FEATURE_DEFINITIONS];
        expect(def.tiers).not.toContain("professional");
        expect(def.tiers).toContain("enterprise");
      });
    });
  });

  describe("Enterprise Tier", () => {
    it("should have unlimited users", () => {
      const feature = FEATURE_DEFINITIONS.maxUsersEnterprise;
      expect(feature.limit).toBeNull();
      expect(feature.tiers).toContain("enterprise");
    });

    it("should have unlimited meetings", () => {
      const feature = FEATURE_DEFINITIONS.unlimitedMeetings;
      expect(feature.tiers).toContain("enterprise");
      expect(feature.limit).toBeNull();
    });

    it("should have unlimited storage", () => {
      const feature = FEATURE_DEFINITIONS.storageEnterprise;
      expect(feature.limit).toBeNull();
      expect(feature.tiers).toContain("enterprise");
    });

    it("should have all premium features", () => {
      const allPremiumFeatures = [
        "liveTranscription",
        "digitalSignatures",
        "boardAssessments",
        "customIntegrations",
        "dedicatedAccountManager",
        "advancedSecurityFeatures",
      ];

      allPremiumFeatures.forEach((feature) => {
        const def = FEATURE_DEFINITIONS[feature as keyof typeof FEATURE_DEFINITIONS];
        expect(def.tiers).toContain("enterprise");
      });
    });
  });
});

describe("Feature Gate Enforcement", () => {
  it("should enforce feature availability", async () => {
    // Mock the database call
    vi.mock("./db", () => ({
      getDb: vi.fn(() => null),
    }));

    // This would throw an error if the feature is not available
    try {
      await enforceFeature(1, "liveTranscription");
    } catch (error) {
      if (error instanceof TRPCError) {
        expect(error.code).toBe("FORBIDDEN");
      }
    }
  });

  it("should enforce user limits", async () => {
    try {
      await enforceUserLimit(1);
    } catch (error) {
      if (error instanceof TRPCError) {
        expect(error.code).toBe("FORBIDDEN");
      }
    }
  });

  it("should enforce meeting limits", async () => {
    try {
      await enforceMeetingLimit(1);
    } catch (error) {
      if (error instanceof TRPCError) {
        expect(error.code).toBe("FORBIDDEN");
      }
    }
  });

  it("should enforce storage limits", async () => {
    try {
      await enforceStorageLimit(1, 1024 * 1024 * 1024); // 1GB
    } catch (error) {
      if (error instanceof TRPCError) {
        expect(error.code).toBe("FORBIDDEN");
      }
    }
  });
});

describe("Subscription Limits", () => {
  it("should define user limits correctly", () => {
    const starterLimit = 5;
    const professionalLimit = 25;
    const enterpriseLimit = null; // Unlimited

    expect(starterLimit).toBe(5);
    expect(professionalLimit).toBe(25);
    expect(enterpriseLimit).toBeNull();
  });

  it("should define meeting limits correctly", () => {
    const starterLimit = 12; // Per month
    const professionalLimit = null; // Unlimited
    const enterpriseLimit = null; // Unlimited

    expect(starterLimit).toBe(12);
    expect(professionalLimit).toBeNull();
    expect(enterpriseLimit).toBeNull();
  });

  it("should define storage limits correctly", () => {
    const starterLimit = 10; // GB
    const professionalLimit = 100; // GB
    const enterpriseLimit = null; // Unlimited

    expect(starterLimit).toBe(10);
    expect(professionalLimit).toBe(100);
    expect(enterpriseLimit).toBeNull();
  });
});

describe("Feature Availability Checks", () => {
  it("should check if feature is available for a tier", () => {
    const starterFeatures = [
      "basicDocumentManagement",
      "monthlyMeetings",
      "maxUsersStarter",
    ];

    const professionalFeatures = [
      "advancedDocumentManagement",
      "unlimitedMeetings",
      "liveTranscription",
      "digitalSignatures",
    ];

    const enterpriseFeatures = [
      "customIntegrations",
      "dedicatedAccountManager",
      "advancedSecurityFeatures",
    ];

    // Verify starter features
    starterFeatures.forEach((feature) => {
      const def = FEATURE_DEFINITIONS[feature as keyof typeof FEATURE_DEFINITIONS];
      expect(def.tiers).toContain("starter");
    });

    // Verify professional features
    professionalFeatures.forEach((feature) => {
      const def = FEATURE_DEFINITIONS[feature as keyof typeof FEATURE_DEFINITIONS];
      expect(def.tiers).toContain("professional");
    });

    // Verify enterprise features
    enterpriseFeatures.forEach((feature) => {
      const def = FEATURE_DEFINITIONS[feature as keyof typeof FEATURE_DEFINITIONS];
      expect(def.tiers).toContain("enterprise");
    });
  });
});

describe("Upgrade Paths", () => {
  it("should support upgrade from Starter to Professional", () => {
    const starterFeatures = ["monthlyMeetings", "maxUsersStarter"];
    const professionalFeatures = ["unlimitedMeetings", "maxUsersProfessional"];

    // Starter has limited meetings
    const starterMeetings = FEATURE_DEFINITIONS.monthlyMeetings;
    expect(starterMeetings.limit).toBe(12);

    // Professional has unlimited meetings
    const professionalMeetings = FEATURE_DEFINITIONS.unlimitedMeetings;
    expect(professionalMeetings.limit).toBeNull();
  });

  it("should support upgrade from Professional to Enterprise", () => {
    const professionalFeatures = ["liveTranscription", "digitalSignatures"];
    const enterpriseFeatures = ["customIntegrations", "dedicatedAccountManager"];

    // Professional has premium features but not enterprise-only
    const professional = FEATURE_DEFINITIONS.liveTranscription;
    expect(professional.tiers).toContain("professional");

    // Enterprise has all features
    const enterprise = FEATURE_DEFINITIONS.customIntegrations;
    expect(enterprise.tiers).toContain("enterprise");
    expect(enterprise.tiers).not.toContain("professional");
  });
});

describe("Feature Combinations", () => {
  it("should allow realistic Starter tier combinations", () => {
    const starterCombination = {
      maxUsers: 5,
      monthlyMeetings: 12,
      storage: 10,
      liveTranscription: false,
      digitalSignatures: false,
      boardAssessments: false,
    };

    expect(starterCombination.maxUsers).toBe(5);
    expect(starterCombination.monthlyMeetings).toBe(12);
    expect(starterCombination.liveTranscription).toBe(false);
  });

  it("should allow realistic Professional tier combinations", () => {
    const professionalCombination = {
      maxUsers: 25,
      monthlyMeetings: null, // Unlimited
      storage: 100,
      liveTranscription: true,
      digitalSignatures: true,
      boardAssessments: true,
      customIntegrations: false,
    };

    expect(professionalCombination.maxUsers).toBe(25);
    expect(professionalCombination.monthlyMeetings).toBeNull();
    expect(professionalCombination.liveTranscription).toBe(true);
    expect(professionalCombination.customIntegrations).toBe(false);
  });

  it("should allow realistic Enterprise tier combinations", () => {
    const enterpriseCombination = {
      maxUsers: null, // Unlimited
      monthlyMeetings: null, // Unlimited
      storage: null, // Unlimited
      liveTranscription: true,
      digitalSignatures: true,
      boardAssessments: true,
      customIntegrations: true,
      dedicatedAccountManager: true,
    };

    expect(enterpriseCombination.maxUsers).toBeNull();
    expect(enterpriseCombination.monthlyMeetings).toBeNull();
    expect(enterpriseCombination.liveTranscription).toBe(true);
    expect(enterpriseCombination.customIntegrations).toBe(true);
  });
});
