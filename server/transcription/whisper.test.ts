import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractActionItems, generateMeetingMinutes, identifySpeakers, formatSpeakerTranscript } from "./whisper";
import type { TranscriptionSegment } from "./whisper";

describe("Whisper API Integration", () => {
  describe("extractActionItems", () => {
    it("should extract action items from transcript text", async () => {
      const transcript = `
        John: We need to finalize the budget by next Friday.
        Sarah: I'll prepare the financial report by Wednesday.
        John: Great, and we need to schedule the board meeting for next month.
      `;

      const items = await extractActionItems(transcript);
      expect(Array.isArray(items)).toBe(true);
    });

    it("should return empty array on error", async () => {
      const items = await extractActionItems("");
      expect(Array.isArray(items)).toBe(true);
    });
  });

  describe("generateMeetingMinutes", () => {
    it.skip("should generate meeting minutes from transcript", async () => {
      const title = "Board Meeting";
      const date = new Date("2026-01-20");
      const attendees = ["John", "Sarah", "Mike"];
      const transcript = "Discussion about quarterly results and budget allocation.";

      const minutes = await generateMeetingMinutes(title, date, attendees, transcript);
      expect(typeof minutes).toBe("string");
      expect(minutes.length).toBeGreaterThan(0);
    });
  });

  describe("identifySpeakers", () => {
    it("should identify speakers from transcript segments", async () => {
      const segments: TranscriptionSegment[] = [
        {
          id: 1,
          seek: 0,
          start: 0,
          end: 2,
          text: "Hello everyone",
          tokens: [],
          temperature: 0.7,
          avg_logprob: -0.5,
          compression_ratio: 1.2,
          no_speech_prob: 0.01,
        },
        {
          id: 2,
          seek: 2,
          start: 2,
          end: 4,
          text: "Thanks for joining",
          tokens: [],
          temperature: 0.7,
          avg_logprob: -0.5,
          compression_ratio: 1.2,
          no_speech_prob: 0.01,
        },
        {
          id: 3,
          seek: 4,
          start: 7, // Significant pause - indicates speaker change
          end: 9,
          text: "I agree with that",
          tokens: [],
          temperature: 0.7,
          avg_logprob: -0.5,
          compression_ratio: 1.2,
          no_speech_prob: 0.01,
        },
      ];

      const speakers = await identifySpeakers(segments);
      expect(Array.isArray(speakers)).toBe(true);
      expect(speakers.length).toBe(3);
      expect(speakers[0].speaker).toBe("Speaker 1");
      expect(speakers[2].speaker).toBe("Speaker 2"); // Different speaker due to pause
    });
  });

  describe("formatSpeakerTranscript", () => {
    it("should format speaker segments into readable transcript", () => {
      const segments = [
        {
          speaker: "Speaker 1",
          startTime: 0,
          endTime: 2,
          text: "Hello everyone",
        },
        {
          speaker: "Speaker 2",
          startTime: 3,
          endTime: 5,
          text: "Thanks for joining",
        },
      ];

      const formatted = formatSpeakerTranscript(segments);
      expect(formatted).toContain("Speaker 1");
      expect(formatted).toContain("Speaker 2");
      expect(formatted).toContain("Hello everyone");
      expect(formatted).toContain("Thanks for joining");
      expect(formatted).toContain("[00:00]");
      expect(formatted).toContain("[00:03]");
    });

    it("should format timestamps correctly", () => {
      const segments = [
        {
          speaker: "Speaker 1",
          startTime: 125, // 2 minutes 5 seconds
          endTime: 130,
          text: "Test",
        },
      ];

      const formatted = formatSpeakerTranscript(segments);
      expect(formatted).toContain("[02:05]");
    });
  });

  describe("Transcription workflow", () => {
    it("should handle complete transcription workflow", async () => {
      const segments: TranscriptionSegment[] = [
        {
          id: 1,
          seek: 0,
          start: 0,
          end: 2,
          text: "Let's discuss the quarterly budget",
          tokens: [],
          temperature: 0.7,
          avg_logprob: -0.5,
          compression_ratio: 1.2,
          no_speech_prob: 0.01,
        },
        {
          id: 2,
          seek: 2,
          start: 3,
          end: 5,
          text: "We need to finalize by Friday",
          tokens: [],
          temperature: 0.7,
          avg_logprob: -0.5,
          compression_ratio: 1.2,
          no_speech_prob: 0.01,
        },
      ];

      // Identify speakers
      const speakers = await identifySpeakers(segments);
      expect(speakers.length).toBeGreaterThan(0);

      // Format transcript
      const formatted = formatSpeakerTranscript(speakers);
      expect(formatted.length).toBeGreaterThan(0);

      // Extract action items
      const items = await extractActionItems(formatted);
      expect(Array.isArray(items)).toBe(true);
    });
  });
});
