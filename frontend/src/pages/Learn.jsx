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

  const [practiceAnswer, setPracticeAnswer] = useState("");
  const [practiceResult, setPracticeResult] = useState(null);
  const [checkingAnswer, setCheckingAnswer] = useState(false);

  const [history, setHistory] = useState([]);
  const email = localStorage.getItem("userEmail");

  const fetchHistory = async () => {
    if (!email) return;
    try {
      const res = await API.get(`/history/${email}`);
      setHistory(res.data.history || []);
    } catch (err) {
      console.log("Failed to fetch history:", err);
    }
  };

  const fetchLesson = async (t) => {
    try {
      setLoading(true);
      const res = await API.post("/teach", { email, topic: t });
      setData(res.data);
      setPracticeAnswer("");
      setPracticeResult(null);
      if (res.data.topic && res.data.topic !== t) {
        navigate(`/learn/${res.data.topic}`, { replace: true });
      }
      fetchHistory();
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

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
      fetchLesson(topic);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchHistory();
    if (topic) fetchLesson(topic);
  }, [topic]);

  const handleStart = () => {
    if (!inputTopic.trim()) return;
    navigate(`/learn/${inputTopic}`);
  };

  return (
    <div className={`learn-container ${darkMode ? "dark" : ""}`}>
      
      {/* 👇 NEW: TOP RIGHT CONTROLS */}
      <div className="top-right-controls">
        <button 
          className="dashboard-btn" 
          onClick={() => navigate("/dashboard")}
        >
          Dashboard
        </button>
        
        <button
          className="theme-toggle"
          onClick={() => {
            const newTheme = !darkMode;
            setDarkMode(newTheme);
            localStorage.setItem("theme", newTheme ? "dark" : "light");
          }}
        >
          {darkMode ? "☀️" : "🌙"}
        </button>
      </div>
      {/* 👆 END CONTROLS */}

      {/* LEFT SIDEBAR */}
      <aside className="history-sidebar">
        <h3>Your Journey</h3>
        {history.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", paddingLeft: "0.5rem" }}>
            No past lessons yet.
          </p>
        ) : (
          <ul>
            {history.map((item, idx) => (
              <li
                key={idx}
                className={item.topic === topic ? "active-history" : ""}
                onClick={() => navigate(`/learn/${item.topic}`)}
              >
                <span className="history-topic">{item.topic}</span>
                <span className="history-level badge">{item.detail_level}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* RIGHT CONTENT AREA */}
      <main className="content-area">
        
        {/* START SCREEN */}
        {!topic && !data && (
          <div className="start-screen">
            <h1>What do you want to learn?</h1>
            <input
              value={inputTopic}
              onChange={(e) => setInputTopic(e.target.value)}
              placeholder="Enter a topic (e.g. Recursion, API design, Data Structures)"
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
            />
            <button className="primary-btn" onClick={handleStart}>
              Start Learning
            </button>
          </div>
        )}

        {/* LOADING */}
        {loading && <div className="loading">Generating lesson</div>}

        {/* LESSON DATA */}
        {data && data.response && !loading && (
          <div className="lesson-wrapper">
            
            <div className="card">
              <h2>Explanation</h2>
              <p>{data.response.explanation}</p>
            </div>

            {data.response.analogy && (
              <div className="card">
                <h2>Analogy</h2>
                <p>{data.response.analogy}</p>
              </div>
            )}

            {data.response.example && (
              <div className="card">
                <h2>Example</h2>
                <p>{data.response.example}</p>
              </div>
            )}

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
                <button className="primary-btn" onClick={checkAnswer} disabled={checkingAnswer}>
                  {checkingAnswer ? "Checking..." : "Submit Answer"}
                </button>

                {practiceResult && (
                  <div className="practice-result">
                    <p style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
                      {practiceResult.correct ? "✅ Correct!" : "❌ Let's review"}
                    </p>
                    <p>{practiceResult.feedback}</p>
                    {practiceResult.improved_answer && (
                      <p style={{ marginTop: "1rem" }}>
                        <b>Better Answer:</b> {practiceResult.improved_answer}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* FEEDBACK BLOCK */}
            <div className="card" style={{ background: "transparent", border: "none", padding: "1rem 0" }}>
              <h2 style={{ fontSize: "1rem" }}>Help the AI adapt to you</h2>
              <textarea
                className="feedback-input"
                placeholder="What confused you? How can I teach this better?"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
              <div className="feedback-buttons">
                <button onClick={() => handleFeedback("good")}>Got it 👍</button>
                <button onClick={() => handleFeedback("bad")}>Still confused 😕</button>
                <button className="primary-btn" onClick={() => handleFeedback("custom")}>Send Note</button>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

export default Learn;