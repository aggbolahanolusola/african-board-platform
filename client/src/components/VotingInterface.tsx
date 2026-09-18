import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";

interface VotingInterfaceProps {
  voteId: number;
  organizationId: number;
  meetingId?: number;
  onVoteComplete?: () => void;
}

export function VotingInterface({ voteId, organizationId, meetingId, onVoteComplete }: VotingInterfaceProps) {
  const [selectedChoice, setSelectedChoice] = useState<"yes" | "no" | "abstain" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get vote details
  const { data: voteData, isLoading: isLoadingVote } = trpc.voting.getVote.useQuery(
    { voteId },
    { enabled: !!voteId }
  );

  // Cast vote mutation
  const castVoteMutation = trpc.voting.castVote.useMutation({
    onSuccess: () => {
      console.log("Vote cast successfully");
      setSelectedChoice(null);
      setIsSubmitting(false);
      onVoteComplete?.();
    },
    onError: (error) => {
      console.error("Failed to cast vote:", error);
      setIsSubmitting(false);
    },
  });

  const handleCastVote = async () => {
    if (!selectedChoice) {
      console.error("Please select an option");
      return;
    }

    setIsSubmitting(true);
    castVoteMutation.mutate({
      voteId,
      choice: selectedChoice,
      weight: 1,
    });
  };

  if (isLoadingVote) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!voteData?.vote) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-500">Vote not found</div>
        </CardContent>
      </Card>
    );
  }

  const vote = voteData.vote;
  const isVoteClosed = vote.status === "closed";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{vote.title}</CardTitle>
        <CardDescription>
          <div className="mt-2 space-y-1">
            <p>Method: {vote.votingMethod}</p>
            <p>Status: {vote.status === "open" ? "Open" : "Closed"}</p>
            {isVoteClosed && <p className="font-semibold text-lg">Result: {vote.result}</p>}
          </div>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {vote.description && <p className="text-sm text-gray-600">{vote.description}</p>}

        {/* Vote Statistics */}
        {voteData.stats && (
          <div className="grid grid-cols-3 gap-4 rounded-lg bg-gray-50 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{voteData.stats.yesCount}</div>
              <div className="text-xs text-gray-600">Yes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{voteData.stats.noCount}</div>
              <div className="text-xs text-gray-600">No</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{voteData.stats.abstainCount}</div>
              <div className="text-xs text-gray-600">Abstain</div>
            </div>
          </div>
        )}

        {/* Voting Options */}
        {!isVoteClosed && (
          <div className="space-y-3">
            <p className="font-semibold">Cast Your Vote:</p>

            <div className="space-y-2">
              {["yes", "no", "abstain"].map((choice) => (
                <label key={choice} className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="vote-choice"
                    value={choice}
                    checked={selectedChoice === choice}
                    onChange={() => setSelectedChoice(choice as any)}
                    disabled={isSubmitting}
                    className="h-4 w-4"
                  />
                  <span className="capitalize font-medium">{choice}</span>
                </label>
              ))}
            </div>

            <Button
              onClick={handleCastVote}
              disabled={isSubmitting || !selectedChoice}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Vote"
              )}
            </Button>
          </div>
        )}

        {/* Vote Closed Message */}
        {isVoteClosed && (
          <div className="rounded-lg bg-blue-50 p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Voting Closed</p>
              <p className="text-sm text-blue-700">This vote is no longer accepting responses</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
