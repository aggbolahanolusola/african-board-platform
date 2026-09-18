import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface TrialBannerProps {
  organizationId?: number;
  onDismiss?: () => void;
}

/**
 * TrialBanner component displays trial subscription information
 * Shows remaining days, features, and upgrade CTA
 */
export function TrialBanner({ organizationId, onDismiss }: TrialBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  // Get subscription details including trial end date
  const { data: subscriptionDetails, isLoading: isLoadingDetails } = trpc.subscription.getSubscriptionDetails.useQuery();
  // Get subscription limits to check plan type
  const { data: limits, isLoading: isLoadingLimits } = trpc.subscription.getLimits.useQuery();

  useEffect(() => {
    // Check if banner has been dismissed in this session
    const dismissedKey = `trial-banner-dismissed-${organizationId}`;
    const isDismissedInStorage = localStorage.getItem(dismissedKey) === "true";
    
    if (isDismissedInStorage) {
      setIsDismissed(true);
    }

    // Calculate days remaining from subscription end date
    if (subscriptionDetails?.currentPeriodEnd) {
      const now = new Date();
      const endDate = new Date(subscriptionDetails.currentPeriodEnd);
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysRemaining(Math.max(0, diffDays));
    }
  }, [organizationId, subscriptionDetails?.currentPeriodEnd]);

  const handleDismiss = () => {
    setIsDismissed(true);
    const dismissedKey = `trial-banner-dismissed-${organizationId}`;
    localStorage.setItem(dismissedKey, "true");
    onDismiss?.();
  };

  // Only show banner if:
  // 1. Not dismissed
  // 2. Data is loaded
  // 3. Organization has a trial subscription (starter plan)
  // 4. Days remaining is calculated
  if (isDismissed || isLoadingDetails || isLoadingLimits || !limits || !subscriptionDetails || daysRemaining === null) {
    return null;
  }

  // Check if this is a starter plan (trial)
  // The starter plan has slug "starter" and 12 monthly meetings
  const isTrialPlan = subscriptionDetails.planSlug === "starter" || limits.meetingLimit === 12;

  if (!isTrialPlan) {
    return null;
  }

  // Determine banner color based on days remaining
  const isUrgent = daysRemaining <= 7;
  const bannerColor = isUrgent ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200";
  const textColor = isUrgent ? "text-red-900" : "text-blue-900";
  const iconColor = isUrgent ? "text-red-600" : "text-blue-600";
  const buttonColor = isUrgent ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700";

  return (
    <div className={`border ${bannerColor} rounded-lg p-4 mb-6 relative`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 mt-0.5 ${iconColor}`}>
          <Zap className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${textColor} mb-1`}>
            {isUrgent ? "Your trial is ending soon!" : "You're on a 30-day free trial"}
          </h3>
          <p className={`text-sm ${textColor} opacity-90 mb-3`}>
            <span className="font-semibold">{daysRemaining} days remaining</span> in your trial subscription. 
            Upgrade now to unlock unlimited meetings, advanced features, and more.
          </p>

          {/* Trial Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className={`text-sm ${textColor} opacity-75`}>
              <div className="font-medium">12</div>
              <div className="text-xs">Monthly meetings</div>
            </div>
            <div className={`text-sm ${textColor} opacity-75`}>
              <div className="font-medium">5</div>
              <div className="text-xs">Team members</div>
            </div>
            <div className={`text-sm ${textColor} opacity-75`}>
              <div className="font-medium">10 GB</div>
              <div className="text-xs">Storage</div>
            </div>
            <div className={`text-sm ${textColor} opacity-75`}>
              <div className="font-medium">Basic</div>
              <div className="text-xs">Support</div>
            </div>
          </div>

          {/* CTA Button */}
          <Button
            className={`${buttonColor} text-white gap-2 h-9`}
            onClick={() => {
              // Navigate to pricing or payment page
              window.location.href = "/pricing";
            }}
          >
            <Zap className="w-4 h-4" />
            Upgrade Now
          </Button>
        </div>

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className={`flex-shrink-0 ${textColor} opacity-50 hover:opacity-100 transition-opacity`}
          aria-label="Dismiss trial banner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
