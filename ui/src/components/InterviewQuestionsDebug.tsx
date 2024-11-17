import React, { useState } from "react";

const InterviewQuestionsDebug = () => {
  const [url, setUrl] = useState("");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setQuestions([]);

    try {
      const response = await fetch(
        `http://localhost:8000/questions/technical?url=${encodeURIComponent(
          url
        )}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("API Response:", data); // Debug log
      setQuestions(data.technical_questions);
    } catch (err) {
      setError(`Error: ${err.message}`);
      console.error("Full error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Interview Questions Debug</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter job URL"
          style={{ width: "300px", marginRight: "10px" }}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Get Questions"}
        </button>
      </form>

      {error && <div style={{ color: "red", margin: "10px 0" }}>{error}</div>}

      {questions.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h3>Technical Questions:</h3>
          <pre>{JSON.stringify(questions, null, 2)}</pre>
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        <h3>Debug Info:</h3>
        <div>URL: {url}</div>
        <div>Loading: {loading.toString()}</div>
        <div>Questions Count: {questions.length}</div>
      </div>
    </div>
  );
};

export default InterviewQuestionsDebug;
