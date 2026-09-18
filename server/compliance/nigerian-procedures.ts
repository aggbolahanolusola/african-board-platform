/**
 * Nigerian Compliance Framework Procedures
 * tRPC procedures for compliance management
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { ComplianceFramework } from "./nigerian-frameworks";
import {
  getNigerianFrameworks,
  getFrameworkById,
  getFrameworkRequirements,
  createComplianceCheckResult,
  type ComplianceCheckResult,
} from "./nigerian-frameworks";
import { requirePermission } from "../permissions";

/**
 * Get all Nigerian compliance frameworks
 */
export const getNigerianFrameworksProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requirePermission(ctx.user, "view_compliance");

    return getNigerianFrameworks().map((framework) => ({
      id: framework.id,
      name: framework.name,
      country: framework.country,
      description: framework.description,
      requirementCount: framework.requirements.length,
      lastUpdated: framework.lastUpdated,
    }));
  });

/**
 * Get specific Nigerian framework with all requirements
 */
export const getNigerianFrameworkProcedure = protectedProcedure
  .input(z.object({ frameworkId: z.string() }))
  .query(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requirePermission(ctx.user, "view_compliance");

    const framework = getFrameworkById(input.frameworkId);
    if (!framework) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Framework not found",
      });
    }

    return {
      id: framework.id,
      name: framework.name,
      country: framework.country,
      description: framework.description,
      requirements: framework.requirements.map((req) => ({
        id: req.id,
        section: req.section,
        title: req.title,
        description: req.description,
        requirement: req.requirement,
        applicableTo: req.applicableTo,
        frequency: req.frequency,
        documentation: req.documentation,
      })),
      lastUpdated: framework.lastUpdated,
    };
  });

/**
 * Get requirements for a specific framework
 */
export const getFrameworkRequirementsProcedure = protectedProcedure
  .input(z.object({ frameworkId: z.string() }))
  .query(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requirePermission(ctx.user, "view_compliance");

    const requirements = getFrameworkRequirements(input.frameworkId);
    if (requirements.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Framework not found",
      });
    }

    return requirements.map((req) => ({
      id: req.id,
      section: req.section,
      title: req.title,
      description: req.description,
      requirement: req.requirement,
      applicableTo: req.applicableTo,
      frequency: req.frequency,
      documentation: req.documentation,
    }));
  });

/**
 * Get CAMA 2020 framework
 */
export const getCAMA2020Procedure = protectedProcedure.query(async ({ ctx }) => {
  if (!ctx.user?.organizationId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  requirePermission(ctx.user, "view_compliance");

  const framework = getFrameworkById("cama-2020");
  if (!framework) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return {
    id: framework.id,
    name: framework.name,
    country: framework.country,
    description: framework.description,
    requirements: framework.requirements,
    lastUpdated: framework.lastUpdated,
  };
});

/**
 * Get NCCG framework
 */
export const getNCCGProcedure = protectedProcedure.query(async ({ ctx }) => {
  if (!ctx.user?.organizationId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  requirePermission(ctx.user, "view_compliance");

  const framework = getFrameworkById("nccg");
  if (!framework) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return {
    id: framework.id,
    name: framework.name,
    country: framework.country,
    description: framework.description,
    requirements: framework.requirements,
    lastUpdated: framework.lastUpdated,
  };
});

/**
 * Get ISA framework
 */
export const getISAProcedure = protectedProcedure.query(async ({ ctx }) => {
  if (!ctx.user?.organizationId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  requirePermission(ctx.user, "view_compliance");

  const framework = getFrameworkById("isa");
  if (!framework) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return {
    id: framework.id,
    name: framework.name,
    country: framework.country,
    description: framework.description,
    requirements: framework.requirements,
    lastUpdated: framework.lastUpdated,
  };
});

/**
 * Check compliance against a requirement
 */
export const checkComplianceProcedure = protectedProcedure
  .input(
    z.object({
      frameworkId: z.string(),
      requirementId: z.string(),
      status: z.enum(["compliant", "non-compliant", "partial", "not-applicable"]),
      evidence: z.array(z.string()),
      notes: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requirePermission(ctx.user, "manage_compliance");

    const result = createComplianceCheckResult(
      input.frameworkId,
      input.requirementId,
      input.status,
      input.evidence,
      input.notes
    );

    if (!result) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Framework or requirement not found",
      });
    }

    return result;
  });

/**
 * Get compliance summary for organization
 */
export const getComplianceSummaryProcedure = protectedProcedure
  .input(
    z.object({
      frameworkId: z.string().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requirePermission(ctx.user, "view_compliance");

    const frameworks = input.frameworkId
      ? [getFrameworkById(input.frameworkId)].filter(
          (f): f is NonNullable<typeof f> => f !== undefined
        )
      : getNigerianFrameworks();

    if (frameworks.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Framework not found",
      });
    }

    return frameworks.map((framework: ComplianceFramework) => ({
      frameworkId: framework.id,
      frameworkName: framework.name,
      totalRequirements: framework.requirements.length,
      requirements: framework.requirements.map((req) => ({
        id: req.id,
        title: req.title,
        section: req.section,
        frequency: req.frequency,
        documentation: req.documentation,
      })),
    }));
  });

export const nigerianComplianceRouter = router({
  getFrameworks: getNigerianFrameworksProcedure,
  getFramework: getNigerianFrameworkProcedure,
  getRequirements: getFrameworkRequirementsProcedure,
  getCAMA2020: getCAMA2020Procedure,
  getNCCG: getNCCGProcedure,
  getISA: getISAProcedure,
  checkCompliance: checkComplianceProcedure,
  getSummary: getComplianceSummaryProcedure,
});
