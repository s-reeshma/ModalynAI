import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";
import "../styles/Learn.css";

function Learn() {
  const { topic } = useParams();
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  const [inputTopic, setInputTopic] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  const email = localStorage.getItem("userEmail");

  const fetchLesson = async (t) => {
    try {
      setLoading(true);

      const res = await API.post("/teach", {
        email,
        topic: t,
      });

      setData(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };
  const handleFeedback = async (type) => {

  try {

    const res = await API.post("/feedback", {
      email,
      topic,
      feedback: type,
      text: feedbackText,
    });

    console.log(res.data);

  } catch (err) {
    console.log(err);
  }
};

  useEffect(() => {
    if (topic) fetchLesson(topic);
  }, [topic]);

  const handleStart = () => {
    if (!inputTopic) return;
    navigate(`/learn/${inputTopic}`);
  };

  return (
    <div className={`learn-container ${darkMode ? "dark" : ""}`}>

      {/* THEME TOGGLE */}
      <button
        className="theme-toggle"
        onClick={() => {
          const newTheme = !darkMode;
          setDarkMode(newTheme);
          localStorage.setItem("theme", newTheme ? "dark" : "light");
        }}
      >
        {darkMode ? "☀" : "🌙"}
      </button>

      {/* TITLE */}
      <h1 className="learn-title">
        Adaptive Learning AI
      </h1>

      {/* START SCREEN */}
      {!topic && !data && (
        <div className="start-screen">
          <h1>What do you want to learn?</h1>

          <input
            placeholder="e.g. recursion, arrays, OS"
            value={inputTopic}
            onChange={(e) => setInputTopic(e.target.value)}
          />

          <button onClick={handleStart}>
            Start Learning 🚀
          </button>
        </div>
      )}

      {/* LOADING */}
      {loading && <p className="loading">Generating lesson...</p>}

      {/* LESSON */}
      {data && (
        <div className="lesson-wrapper">

          <div className="card">
          <h2>{data.topic}</h2>
          <p>{data.response}</p>
          </div>

          <div className="card">
         <h2>Feedback</h2>

        <textarea
        className="feedback-input"
        placeholder="Explain what you understood, what confused you, or how AI should teach you better..."
        value={feedbackText}
        onChange={(e) => setFeedbackText(e.target.value)}
        />

        <div className="feedback-buttons">

        <button onClick={() => handleFeedback("good")}>
        I understood 👍
        </button>

        <button onClick={() => handleFeedback("bad")}>
        I didn't understand 😕
        </button>

        <button onClick={() => handleFeedback("custom")}>
          Send Explanation 💬
        </button>

      </div>
        </div>

        </div>
      )}

    </div>
  );
}

export default Learn;