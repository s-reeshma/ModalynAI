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

  // =========================
  // FETCH LESSON
  // =========================

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

  // =========================
  // FEEDBACK
  // =========================

  const handleFeedback = async (type) => {

    try {

      const res = await API.post("/feedback", {
        email,
        topic,
        feedback: type,
        text: feedbackText,
      });

      console.log(res.data);

      setFeedbackText("");

      alert("Feedback Saved ✅");

    } catch (err) {

      console.log(err);

    }
  };

  // =========================
  // LOAD TOPIC
  // =========================

  useEffect(() => {

    if (topic) {
      fetchLesson(topic);
    }

  }, [topic]);

  // =========================
  // START LEARNING
  // =========================

  const handleStart = () => {

    if (!inputTopic.trim()) return;

    navigate(`/learn/${inputTopic}`);

  };

  return (

    <div className={`learn-container ${darkMode ? "dark" : ""}`}>

      {/* =========================
          THEME TOGGLE
      ========================= */}

      <button
        className="theme-toggle"
        onClick={() => {

          const newTheme = !darkMode;

          setDarkMode(newTheme);

          localStorage.setItem(
            "theme",
            newTheme ? "dark" : "light"
          );
        }}
      >
        {darkMode ? "☀" : "🌙"}
      </button>

      {/* =========================
          TITLE
      ========================= */}

      <h1 className="learn-title">
        Adaptive Learning AI
      </h1>

      {/* =========================
          START SCREEN
      ========================= */}

      {!topic && !data && (

        <div className="start-screen">

          <h1>What do you want to learn?</h1>

          <input
            type="text"
            placeholder="e.g. recursion, arrays, OS"
            value={inputTopic}
            onChange={(e) => setInputTopic(e.target.value)}
          />

          <button onClick={handleStart}>
            Start Learning 🚀
          </button>

        </div>
      )}

      {/* =========================
          LOADING
      ========================= */}

      {loading && (
        <p className="loading">
          Generating lesson...
        </p>
      )}

      {/* =========================
          LESSON
      ========================= */}

      {data && data.response && (

        <div className="lesson-wrapper">

          {/* EXPLANATION */}
          <div className="card">

            <h2>Explanation</h2>

            <p>
              {data.response.explanation}
            </p>

          </div>

          {/* ANALOGY */}
          {data.response.analogy && (

          <div className="card">

            <h2>Analogy</h2>

            <p>
              {data.response.analogy}
            </p>

          </div>)}

          {/* EXAMPLE */}
          {data.response.example && (
          <div className="card">

            <h2>Example</h2>

            <p>
              {data.response.example}
            </p>

          </div>)}

          {/* PRACTICE */}
          {data.response.practice && (
          <div className="card">

            <h2>Practice</h2>

            <p>
              {data.response.practice}
            </p>

          </div>)}

          {/* FEEDBACK */}

          <div className="card">

            <h2>Feedback</h2>

            <textarea
              className="feedback-input"
              placeholder="Explain what you understood, what confused you, or how AI should teach you better..."
              value={feedbackText}
              onChange={(e) =>
                setFeedbackText(e.target.value)
              }
            />

            <div className="feedback-buttons">

              <button
                onClick={() => handleFeedback("good")}
              >
                I understood 👍
              </button>

              <button
                onClick={() => handleFeedback("bad")}
              >
                I didn't understand 😕
              </button>

              <button
                onClick={() => handleFeedback("custom")}
              >
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