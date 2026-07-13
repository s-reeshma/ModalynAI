import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";
import Sidebar from "../components/Sidebar";
import { ArrowLeft, Layers, Bot, Search, HelpCircle, ClipboardList } from "lucide-react";
import "../styles/dashboard.css";
import "../styles/topics.css";

function TopicDetails() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );
  
  const [topicData, setTopicData] = useState(null);
  const [loading, setLoading] = useState(true);
  const email = localStorage.getItem("userEmail");

  useEffect(() => {
    fetchTopicDetails();
  }, [topicId]);

  const fetchTopicDetails = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/history/${email}?topic=${encodeURIComponent(topicId)}`);
      if (res.data) {
        setTopicData(res.data);
      }
    } catch (error) {
      console.log("Error fetching topic details:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDomainColor = (domain) => {
    switch (domain?.toLowerCase()) {
      case "computer_science": return "#3b82f6"; // blue
      case "biology": return "#10b981"; // green
      case "physics": return "#8b5cf6"; // purple
      default: return "#f59e0b"; // amber
    }
  };

  if (loading) {
    return (
      <div className={`dashboard-layout ${darkMode ? "dark" : ""}`}>
        <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} />
        <main className="main-content">
          <div className="loading-state">Loading topic details...</div>
        </main>
      </div>
    );
  }

  if (!topicData) {
    return (
      <div className={`dashboard-layout ${darkMode ? "dark" : ""}`}>
        <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} />
        <main className="main-content">
          <div className="empty-state">
            <h3>Topic not found</h3>
            <button className="primary-btn" onClick={() => navigate("/topics")}>Back to Topics</button>
          </div>
        </main>
      </div>
    );
  }

  const { domain, doubts = [], styles_used = [], practice_attempts = [], steps = [], ai_report = {} } = topicData;

  return (
    <div className={`dashboard-layout ${darkMode ? "dark" : ""}`}>
      <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} />

      <main className="main-content">
        <button className="back-btn" onClick={() => navigate("/topics")} style={{ marginBottom: "1rem", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ArrowLeft size={18} /> Back to Topics
        </button>

        <header className="topic-details-header">
          <h1>{topicId.replace(/_/g, " ")}</h1>
          <p>Detailed analysis of your learning journey for this topic.</p>
        </header>

        <div className="topic-stats-grid">
          <div className="stat-card">
            <div className="stat-value" style={{ color: getDomainColor(domain) }}>{domain || "General"}</div>
            <div className="stat-label">Domain</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{steps.length}</div>
            <div className="stat-label">Level (Steps Completed)</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{practice_attempts.length}</div>
            <div className="stat-label">Questions Attempted</div>
          </div>
        </div>

        <section className="details-section">
          <h2><Layers size={22} color="var(--primary)" /> Learning Styles Used</h2>
          {styles_used.length > 0 ? (
            <div className="styles-list">
              {styles_used.map((style, idx) => (
                <span key={idx} className="style-tag">{style}</span>
              ))}
            </div>
          ) : (
            <p className="empty-list">No specific styles recorded yet.</p>
          )}
        </section>

        {(ai_report.weak_areas_report || ai_report.modalyn_feedback) && (
          <div className="ai-insights-container">
            {ai_report.modalyn_feedback && (
              <section className="details-section modalyn-feedback-card">
                <h2><Bot size={22} /> Modalyn's Feedback</h2>
                <p className="ai-report-text">{ai_report.modalyn_feedback}</p>
              </section>
            )}
            
            {ai_report.weak_areas_report && (
              <section className="details-section ai-weak-areas-card">
                <h2><Search size={22} /> AI Analysis of Weak Areas</h2>
                <p className="ai-report-text">{ai_report.weak_areas_report}</p>
              </section>
            )}
          </div>
        )}

        <section className="details-section">
          <h2><HelpCircle size={22} color="var(--primary)" /> Doubts & Weak Areas</h2>
          {doubts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {doubts.map((doubt, idx) => (
                <div key={idx} className="doubt-item">"{doubt}"</div>
              ))}
            </div>
          ) : (
            <p className="empty-list">No doubts recorded. You're doing great!</p>
          )}
        </section>

        <section className="details-section">
          <h2><ClipboardList size={22} color="var(--primary)" /> Practice Questions History</h2>
          {practice_attempts.length > 0 ? (
            <div className="qa-list">
              {practice_attempts.map((qa, idx) => (
                <div key={idx} className="qa-item">
                  <div className="qa-header">
                    <h3 className="qa-question">{qa.question}</h3>
                    <span className={`status-badge ${qa.correct ? 'correct' : 'incorrect'}`}>
                      {qa.correct ? 'Correct' : 'Needs Review'}
                    </span>
                  </div>
                  <div className="qa-body">
                    <div className="qa-field">
                      <div className="qa-label">Your Answer</div>
                      <div className="qa-value">{qa.answer}</div>
                    </div>
                    {qa.feedback && (
                      <div className="qa-field">
                        <div className="qa-label">Tutor Feedback</div>
                        <div className="qa-value">{qa.feedback}</div>
                      </div>
                    )}
                    {qa.improved_answer && (
                      <div className="qa-field">
                        <div className="qa-label">Model Answer</div>
                        <div className="qa-value">{qa.improved_answer}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-list">No practice questions attempted yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}

export default TopicDetails;
