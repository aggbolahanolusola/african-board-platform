import { useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Hook to check feature availability and subscription limits
 */
export function useFeatureGate() {
  const { data: limits, isLoading } = trpc.subscription.getLimits.useQuery();

  const hasFeature = useCallback(
    (featureName: string): boolean => {
      if (!limits?.features) return false;
      return (limits.features as Record<string, boolean>)[featureName] ?? false;
    },
    [limits]
  );

  const canAddUser = useCallback((): boolean => {
    if (!limits) return false;
    if (limits.userLimit === null) return true; // Enterprise - unlimited
    return limits.currentUsers < limits.userLimit;
  }, [limits]);

  const canCreateMeeting = useCallback((): boolean => {
    if (!limits) return false;
    if (limits.meetingLimit === null) return true; // Professional/Enterprise - unlimited
    return limits.currentMeetings < limits.meetingLimit;
  }, [limits]);

  const canUploadDocument = useCallback(
    (fileSizeBytes: number): boolean => {
      if (!limits) return false;
      if (limits.storageLimit === null) return true; // Enterprise - unlimited

      const fileSizeGB = fileSizeBytes / (1024 * 1024 * 1024);
      const currentUsageGB = limits.currentStorage / (1024 * 1024 * 1024);
      return currentUsageGB + fileSizeGB <= limits.storageLimit;
    },
    [limits]
  );

  const getUsersRemaining = useCallback((): number | null => {
    if (!limits) return null;
    if (limits.userLimit === null) return null; // Unlimited
    return Math.max(0, limits.userLimit - limits.currentUsers);
  }, [limits]);

  const getMeetingsRemaining = useCallback((): number | null => {
    if (!limits) return null;
    if (limits.meetingLimit === null) return null; // Unlimited
    return Math.max(0, limits.meetingLimit - limits.currentMeetings);
  }, [limits]);

  const getStorageRemaining = useCallback((): number | null => {
    if (!limits) return null;
    if (limits.storageLimit === null) return null; // Unlimited
    const remainingGB = limits.storageLimit - limits.currentStorage / (1024 * 1024 * 1024);
    return Math.max(0, remainingGB);
  }, [limits]);

  return useMemo(
    () => ({
      limits,
      isLoading,
      hasFeature,
      canAddUser,
      canCreateMeeting,
      canUploadDocument,
      getUsersRemaining,
      getMeetingsRemaining,
      getStorageRemaining,
    }),
    [
      limits,
      isLoading,
      hasFeature,
      canAddUser,
      canCreateMeeting,
      canUploadDocument,
      getUsersRemaining,
      getMeetingsRemaining,
      getStorageRemaining,
    ]
  );
}
