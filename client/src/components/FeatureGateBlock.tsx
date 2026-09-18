import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Lock, ArrowRight } from "lucide-react";

interface FeatureGateBlockProps {
  featureName: string;
  currentPlan: string;
  requiredPlan: string;
  description?: string;
  onUpgrade?: () => void;
}

/**
 * Component to display when a feature is locked due to subscription tier
 */
export function FeatureGateBlock({
  featureName,
  currentPlan,
  requiredPlan,
  description,
  onUpgrade,
}: FeatureGateBlockProps) {
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <CardTitle className="text-lg text-amber-900">{featureName} Locked</CardTitle>
            <CardDescription className="text-amber-800">
              This feature is only available on {requiredPlan} plans and above
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {description && (
          <p className="text-sm text-amber-900">{description}</p>
        )}
        <div className="bg-white rounded-lg p-3 text-sm text-amber-900">
          <p>
            <strong>Current Plan:</strong> {currentPlan}
          </p>
          <p>
            <strong>Required Plan:</strong> {requiredPlan}
          </p>
        </div>
        {onUpgrade && (
          <Button
            onClick={onUpgrade}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Upgrade Now
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface LimitWarningProps {
  title: string;
  current: number;
  limit: number | null;
  unit?: string;
  onUpgrade?: () => void;
}

/**
 * Component to display when approaching subscription limits
 */
export function LimitWarning({
  title,
  current,
  limit,
  unit = "",
  onUpgrade,
}: LimitWarningProps) {
  if (limit === null) {
    // Unlimited
    return null;
  }

  const percentage = (current / limit) * 100;
  const isWarning = percentage >= 75;
  const isCritical = percentage >= 95;

  if (!isWarning) {
    return null;
  }

  const remaining = limit - current;
  const bgColor = isCritical ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200";
  const textColor = isCritical ? "text-red-900" : "text-yellow-900";
  const barColor = isCritical ? "bg-red-500" : "bg-yellow-500";
  const iconColor = isCritical ? "text-red-600" : "text-yellow-600";

  return (
    <Card className={`${bgColor} border-2`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <AlertCircle className={`w-5 h-5 ${iconColor} mt-0.5 flex-shrink-0`} />
          <div className="flex-1">
            <CardTitle className={`text-base ${textColor}`}>
              {isCritical ? "Limit Reached" : "Approaching Limit"}
            </CardTitle>
            <CardDescription className={textColor}>
              {title}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className={textColor}>
              {current} / {limit} {unit}
            </span>
            <span className={textColor}>
              {remaining} {unit} remaining
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`${barColor} h-2 rounded-full transition-all`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
        {onUpgrade && (
          <Button
            onClick={onUpgrade}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Upgrade Plan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface FeatureAvailabilityProps {
  features: {
    name: string;
    available: boolean;
    requiredPlan?: string;
  }[];
}

/**
 * Component to display feature availability across subscription tiers
 */
export function FeatureAvailability({ features }: FeatureAvailabilityProps) {
  return (
    <div className="space-y-2">
      {features.map((feature) => (
        <div
          key={feature.name}
          className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
        >
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
              feature.available
                ? "bg-green-100 text-green-700"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {feature.available ? (
              <span className="text-xs font-bold">✓</span>
            ) : (
              <Lock className="w-3 h-3" />
            )}
          </div>
          <div className="flex-1">
            <p className={feature.available ? "text-foreground" : "text-muted-foreground"}>
              {feature.name}
            </p>
          </div>
          {!feature.available && feature.requiredPlan && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
              {feature.requiredPlan}+
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
