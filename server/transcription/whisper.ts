import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";

export interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  segments: TranscriptionSegment[];
}

export interface SpeakerSegment {
  speaker: string;
  startTime: number;
  endTime: number;
  text: string;
}

/**
 * Transcribe audio file using Whisper API
 * Supports: webm, mp3, wav, ogg, m4a
 * Max file size: 16MB
 */
export async function transcribeAudio(
  audioUrl: string,
  language?: string,
  prompt?: string
): Promise<TranscriptionResult> {
  try {
    console.log(`[Whisper] Transcribing audio from: ${audioUrl}`);

    // Use the built-in transcription helper from Manus
    const { transcribeAudio: manuTranscribe } = await import("../_core/voiceTranscription");

    const result = await manuTranscribe({
      audioUrl,
      language,
      prompt,
    });

    const resultData = result as any;
    console.log(`[Whisper] Transcription complete. Language: ${resultData.language || "en"}`);

    return {
      text: resultData.text || "",
      language: resultData.language || "en",
      duration: resultData.duration || 0,
      segments: resultData.segments || [],
    };
  } catch (error) {
    console.error("[Whisper] Transcription failed:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to transcribe audio",
    });
  }
}

/**
 * Extract action items from transcribed text using LLM
 */
export async function extractActionItems(transcriptText: string): Promise<Array<{ item: string; assignee?: string; dueDate?: string }>> {
  try {
    console.log("[Whisper] Extracting action items from transcript");

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an expert at extracting action items from meeting transcripts. Extract all action items, assignments, and deadlines mentioned in the meeting. Return as JSON array with objects containing: item (string), assignee (string or null), dueDate (string or null).",
        },
        {
          role: "user",
          content: `Extract action items from this meeting transcript:\n\n${transcriptText}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "action_items",
          strict: true,
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item: { type: "string", description: "The action item description" },
                assignee: { type: ["string", "null"], description: "Person assigned to the action" },
                dueDate: { type: ["string", "null"], description: "Due date for the action" },
              },
              required: ["item"],
              additionalProperties: false,
            },
          },
        },
      },
    });

    const content = response.choices[0]?.message.content;
    if (!content) return [];

    const contentStr = typeof content === "string" ? content : "";
    const parsed = JSON.parse(contentStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("[Whisper] Failed to extract action items:", error);
    return [];
  }
}

/**
 * Generate meeting minutes from transcript
 */
export async function generateMeetingMinutes(
  meetingTitle: string,
  meetingDate: Date,
  attendees: string[],
  transcriptText: string
): Promise<string> {
  try {
    console.log("[Whisper] Generating meeting minutes");

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an expert at creating professional meeting minutes. Create well-structured, concise meeting minutes from the provided transcript. Include sections for: Meeting Details, Attendees, Agenda Items, Decisions Made, and Action Items.",
        },
        {
          role: "user",
          content: `Create meeting minutes for:
Title: ${meetingTitle}
Date: ${meetingDate.toISOString()}
Attendees: ${attendees.join(", ")}

Transcript:
${transcriptText}`,
        },
      ],
    });

    const content = response.choices[0]?.message.content;
    const minutes = typeof content === "string" ? content : "";
    console.log("[Whisper] Meeting minutes generated successfully");
    return minutes;
  } catch (error) {
    console.error("[Whisper] Failed to generate meeting minutes:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to generate meeting minutes",
    });
  }
}

/**
 * Identify speakers in transcript using speaker labels
 * Note: Full diarization requires advanced speaker identification
 */
export async function identifySpeakers(segments: TranscriptionSegment[]): Promise<SpeakerSegment[]> {
  try {
    console.log("[Whisper] Processing speaker identification");

    // Group segments by speaker (basic implementation)
    // In production, use speaker diarization models for better accuracy
    const speakerSegments: SpeakerSegment[] = [];
    let currentSpeaker = "Speaker 1";
    let speakerCount = 1;

    for (const segment of segments) {
      // Simple heuristic: detect speaker changes based on pause duration
      const pauseDuration = segments.indexOf(segment) > 0 ? segment.start - segments[segments.indexOf(segment) - 1].end : 0;

      if (pauseDuration > 2 && speakerCount < 10) {
        // Significant pause indicates speaker change
        speakerCount++;
        currentSpeaker = `Speaker ${speakerCount}`;
      }

      speakerSegments.push({
        speaker: currentSpeaker,
        startTime: segment.start,
        endTime: segment.end,
        text: segment.text,
      });
    }

    console.log(`[Whisper] Identified ${speakerCount} speakers`);
    return speakerSegments;
  } catch (error) {
    console.error("[Whisper] Failed to identify speakers:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to identify speakers",
    });
  }
}

/**
 * Format speaker segments into readable transcript
 */
export function formatSpeakerTranscript(speakerSegments: SpeakerSegment[]): string {
  return speakerSegments
    .map((segment) => {
      const minutes = Math.floor(segment.startTime / 60);
      const seconds = Math.floor(segment.startTime % 60);
      const timeCode = `[${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}]`;
      return `${timeCode} ${segment.speaker}: ${segment.text}`;
    })
    .join("\n");
}
