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

  // 🧠 NEW STATES (INTERACTIVE LEARNING)
  const [practiceAnswer, setPracticeAnswer] = useState("");
  const [practiceResult, setPracticeResult] = useState(null);
  const [checkingAnswer, setCheckingAnswer] = useState(false);

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
      setPracticeAnswer("");
      setPracticeResult(null);

    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // CHECK PRACTICE ANSWER (NEW)
  // =========================
  const checkAnswer = async () => {
    if (!practiceAnswer.trim()) return;

    try {
      setCheckingAnswer(true);

      const res = await API.post("/practice-check", {
        email,
        topic,
        question: data.response.practice,
        answer: practiceAnswer,
      });

      setPracticeResult(res.data);

    } catch (err) {
      console.log(err);
    } finally {
      setCheckingAnswer(false);
    }
  };

  // =========================
  // FEEDBACK + ADAPTATION
  // =========================
  const handleFeedback = async (type) => {
    try {
      await API.post("/feedback", {
        email,
        topic,
        feedback: type,
        text: feedbackText,
      });

      setFeedbackText("");
      alert("Feedback Saved ✅");

      // 🔥 IMPORTANT: regenerate lesson after feedback
      fetchLesson(topic);

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

      {/* THEME */}
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

      <h1 className="learn-title">Adaptive Learning AI</h1>

      {/* START SCREEN */}
      {!topic && !data && (
        <div className="start-screen">
          <h1>What do you want to learn?</h1>

          <input
            value={inputTopic}
            onChange={(e) => setInputTopic(e.target.value)}
            placeholder="e.g. recursion, arrays, OS"
          />

          <button onClick={handleStart}>
            Start Learning 🚀
          </button>
        </div>
      )}

      {/* LOADING */}
      {loading && <p className="loading">Generating lesson...</p>}

      {/* LESSON */}
      {data && data.response && (
        <div className="lesson-wrapper">

          {/* EXPLANATION */}
          <div className="card">
            <h2>Explanation</h2>
            <p>{data.response.explanation}</p>
          </div>

          {/* ANALOGY */}
          {data.response.analogy && (
            <div className="card">
              <h2>Analogy</h2>
              <p>{data.response.analogy}</p>
            </div>
          )}

          {/* EXAMPLE */}
          {data.response.example && (
            <div className="card">
              <h2>Example</h2>
              <p>{data.response.example}</p>
            </div>
          )}

          {/* PRACTICE + INTERACTIVE */}
          {data.response.practice && (
            <div className="card">
              <h2>Practice</h2>
              <p>{data.response.practice}</p>

              <textarea
                className="feedback-input"
                placeholder="Write your answer here..."
                value={practiceAnswer}
                onChange={(e) => setPracticeAnswer(e.target.value)}
              />

              <button onClick={checkAnswer} disabled={checkingAnswer}>
                {checkingAnswer ? "Checking..." : "Check Answer"}
              </button>

              {practiceResult && (
                <div className="practice-result">
                  <p>
                    {practiceResult.correct
                      ? "✅ Correct!"
                      : "❌ Not quite right"}
                  </p>

                  <p>{practiceResult.feedback}</p>

                  {practiceResult.improved_answer && (
                    <p>
                      <b>Improved Answer:</b>{" "}
                      {practiceResult.improved_answer}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* FEEDBACK */}
          <div className="card">
            <h2>Feedback</h2>

            <textarea
              className="feedback-input"
              placeholder="What confused you or how should AI teach you better..."
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
                Send Feedback 💬
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default Learn;