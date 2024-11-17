// types/interview.ts
export interface Question {
  id: number;
  text: string;
}

export interface VideoRecord {
  id: string;
  questionId: number;
  questionText: string;
  blob: Blob;
  timestamp: Date;
  duration: number;
  transcription?: string;
  feedback?: string; // Added feedback field
}

export interface InterviewState {
  isRecording: boolean;
  currentQuestion: Question;
  hasWebcamPermission: boolean;
  error: string | null;
  isComplete: boolean; // Added to track interview completion
}

// Pre-defined questions
export const INTERVIEW_QUESTIONS: Question[] = [
  {
    id: 1,
    text: "Tell me about a challenging project you've worked on and how you handled it.",
  },
  {
    id: 2,
    text: "How do you handle difficult situations in a team environment?",
  },
  {
    id: 3,
    text: "What's your approach to learning new technologies?",
  },
];

// Mock feedback templates
export const FEEDBACK_TEMPLATES = [
  "Shows strong problem-solving abilities, but could improve on specific examples",
  "Good communication skills demonstrated, consider adding more structure to responses",
  "Excellent technical depth, could benefit from more concise explanations",
  "Strong teamwork examples, might want to highlight leadership moments more",
];
