// components/ResultsPage.tsx
import React, { useState } from "react";
import { VideoRecord } from "../types/interview";
import { VideoPlayer } from "./VideoPlayer";

interface ResultsPageProps {
  videos: VideoRecord[];
  onRestartInterview: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  videos,
  onRestartInterview,
}) => {
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null);

  const getOverallFeedback = () => {
    return `
      Overall Interview Performance:
      - Strong communication skills demonstrated
      - Good technical depth in responses
      - Areas for improvement: Be more concise, use more specific examples
      - Consider practicing structured answering techniques (STAR method)
    `;
  };

  if (selectedVideo) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedVideo(null)}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
        >
          ← Back to Results
        </button>
        <VideoPlayer video={selectedVideo} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Interview Complete!
        </h2>
        <div className="prose max-w-none">
          <p className="text-gray-600 whitespace-pre-line">
            {getOverallFeedback()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          Your Responses
        </h3>
        <div className="space-y-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="border rounded-lg p-4 hover:border-blue-500 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-medium text-gray-800">
                    Question {video.questionId}
                  </h4>
                  <p className="text-gray-600 mt-1">{video.questionText}</p>
                </div>
                <button
                  onClick={() => setSelectedVideo(video)}
                  className="bg-blue-50 text-blue-600 px-4 py-2 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Review Response
                </button>
              </div>

              <div className="space-y-3">
                {video.transcription && (
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">
                      Your Response:
                    </h5>
                    <p className="text-gray-600 text-sm">
                      {video.transcription.length > 200
                        ? `${video.transcription.slice(0, 200)}...`
                        : video.transcription}
                    </p>
                  </div>
                )}

                <div>
                  <h5 className="font-medium text-gray-700 mb-1">Feedback:</h5>
                  <p className="text-gray-600 text-sm">
                    {video.feedback ||
                      FEEDBACK_TEMPLATES[
                        Math.floor(Math.random() * FEEDBACK_TEMPLATES.length)
                      ]}
                  </p>
                </div>

                <div className="flex gap-4 text-sm text-gray-500">
                  <span>Duration: {Math.round(video.duration)}s</span>
                  <span>
                    Recorded: {new Date(video.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onRestartInterview}
          className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          Start New Interview
        </button>
      </div>
    </div>
  );
};
