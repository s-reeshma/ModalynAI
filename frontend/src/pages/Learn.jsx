import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import mermaid from 'mermaid';
import {  useRef } from 'react';
import API from "../api";
import "../styles/Learn.css";
mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose', // Important for local development
});

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
  const [lessonSteps, setLessonSteps] = useState([]);
  const [lessonHistory, setLessonHistory] = useState([]);


const fetchLesson = async (t) => {
  try {
    setLoading(true);
    // 1. Generate the next step
    const res = await API.post("/teach", { email, topic: t });
    setData(res.data);
    setPracticeAnswer("");
    setPracticeResult(null);

    // 2. REFRESH the history ledger so the map() updates
    // Call the same logic that fetches the full history
    await fetchFullHistoryForTopic(t); 
    
  } catch (err) {
    console.log(err);
  } finally {
    setLoading(false);
  }
};
const fetchFullHistoryForTopic = async (t) => {
  if (!email || !t) return;
  try {
    const encodedEmail = encodeURIComponent(email);
    const encodedTopic = encodeURIComponent(t);
    const response = await API.get(`/history/${encodedEmail}?topic=${encodedTopic}`);
    
    // Check for the 'steps' key that we just added to the backend
    if (response.data && response.data.steps) {
      setLessonHistory(response.data.steps);
    } else {
      setLessonHistory([]);
    }
  } catch (err) {
    console.log("Failed to fetch ledger:", err);
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
  const gotonext = async (type) => {
    try {
      await API.post("/teach", {
        email,
        topic,
      });
      fetchLesson(topic);
    } catch (err) {
      console.log(err);
    }
  };
  const fetchHistory = async () => {
  if (!email) return;
  try {
    const response = await API.get(`/history/${email}`);
    if (response.data && response.data.history) {
      setHistory(response.data.history);
    } else {
      setHistory([]);
    }
  } catch (err) {
    console.log("Failed to fetch sidebar history:", err);
  }
};
const MermaidChart = ({ code }) => {
  const ref = useRef(null);

  useEffect(() => {
  if (ref.current && code) {
    const cleanCode = code.replace(/```mermaid/g, '').replace(/```/g, '').trim();
    ref.current.innerHTML = cleanCode;
    ref.current.removeAttribute('data-processed'); // Force Mermaid to re-process this
    mermaid.init(undefined, ref.current);
  }
}, [code]);

  // Use an empty div; the innerHTML is managed by the useEffect
  return <div className="mermaid" ref={ref} />;
};
const ContentRenderer = ({ content }) => {
  if (!content) return null;

  return (
    <div className="step-content">
      {/* 1. Universal Content */}
      <p>{content.explanation}</p>

      {/* 2. Visual Layer (Mermaid or Images) */}
      {content.diagram_code && (
  <div className="visual-code">
    {/* Only render the component, not the raw text */}
    <MermaidChart code={content.diagram_code} />
  </div>
)}
      {content.image_url && (
        <div className="visual-media">
          <img src={content.image_url} alt="Concept diagram" style={{ maxWidth: '100%', borderRadius: '8px' }} />
        </div>
      )}

      {/* 3. Auditory Layer */}
      {content.audio_url && (
        <div className="audio-media">
          <audio controls src={`http://localhost:8000${content.audio_url}`} />
        </div>
      )}

      {/* 4. Kinesthetic Layer */}
      {content.kinesthetic_task && (
        <div className="kinesthetic-task">
          <h4>Interactive Task</h4>
          <p>{content.kinesthetic_task}</p>
        </div>
      )}
    </div>
  );
};
  useEffect(() => {
    fetchHistory();
    if (topic) {
    fetchFullHistoryForTopic(topic); // 2. Load the new topic's content
  }}, [topic]);

  const handleStart = () => {
    if (!inputTopic.trim()) return;
    navigate(`/learn/${inputTopic}`);
  };

  return (
    <div className={`learn-container ${darkMode ? "dark" : ""}`}>
      
      {/* TOP RIGHT CONTROLS */}
      <div className="top-right-controls">
        <button className="dashboard-btn" onClick={() => navigate("/dashboard")}>
          Dashboard
        </button>
        <button
          className="theme-toggle"
          onClick={() => {
            const newTheme = !darkMode;
            setDarkMode(newTheme);
            localStorage.setItem("theme", newTheme ? "dark" : "light");
          }}c
        >
          {darkMode ? "☀️" : "🌙"}
        </button>
      </div>

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

        {/* LESSON HISTORY */}
        {topic && (
  <div className="lesson-wrapper">
    {lessonHistory.map((step, index) => (
      <div key={index} className="card">
        <h2>Step {step.step}</h2>
        {/* Directly render here, no extra wrapper card */}
        <ContentRenderer content={step.content} />
      </div>
    ))}

    {loading && <div className="loading"><h3>Modalyn is preparing your lesson...</h3>
    <div className="spinner"></div> 
    <p><i>Building diagrams and synthesizing audio...</i></p></div>}

            {/* 3. Practice Block */}
            {data && data.response && data.response.practice && (
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

            {/* 4. Feedback Block */}
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
                <button className="next" onClick={() => gotonext("custom")}>Next</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div> // This closes the learn-container
  );
};

export default Learn;