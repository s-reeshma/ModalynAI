import { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";
import "../styles/progress.css";
import { applyTheme } from "../utils/theme";
import Sidebar from "../components/Sidebar";

function Progress() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(localStorage.getItem("theme") === "dark");
  const email = localStorage.getItem("userEmail");

  useEffect(() => {
    applyTheme();
    if (email) fetchUser();
  }, [email]);

  const fetchUser = async () => {
    try {
      const res = await API.get(`/get-user/${email}`);
      if (res.data) {
        setUser(res.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  if (!user) {
    return (
      <div className={`dashboard-layout ${darkMode ? "dark" : ""}`}>
        <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} />
        <main className="main-content">
          <div className="welcome-text"><h2>Loading progress...</h2></div>
        </main>
      </div>
    );
  }

  const struggleScores = user.struggle_scores || {};
  const weakTopics = Object.entries(struggleScores)
    .sort((a, b) => b[1] - a[1]) // highest first
    .filter(([topic, score]) => score > 0);

  return (
    <div className={`dashboard-layout ${darkMode ? "dark" : ""}`}>
      <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} />

      <main className="main-content progress-main">
        <header className="main-header">
           <div className="welcome-text">
             <h1>My Progress & Weak Areas</h1>
             <p>Track your Knowledge Tracing insights and Struggle Scores.</p>
           </div>
        </header>

        <div className="progress-grid-layout">
           <div className="card progress-card-main">
              <h3>Weakest Topics</h3>
              <p className="section-subtitle">Topics with the highest struggle scores (based on practice failures and doubts)</p>
              
              {weakTopics.length > 0 ? (
                <div className="struggle-list">
                  {weakTopics.map(([topic, score], index) => (
                    <div key={index} className="struggle-item">
                      <div className="struggle-info">
                        <span className="struggle-topic">{topic}</span>
                        <span className="struggle-score">Score: {score}</span>
                      </div>
                      <div className="struggle-bar-container">
                        <div className="struggle-bar-fill" style={{ width: `${Math.min(100, score * 10)}%` }}></div>
                      </div>
                      <button className="primary-btn review-btn" onClick={() => navigate(`/learn/${encodeURIComponent(topic)}`)}>
                         Review
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-struggles">
                   <span className="celebrate-icon">🎉</span>
                   <p>You have no identified weak areas yet! Keep up the great work.</p>
                </div>
              )}
           </div>
        </div>
      </main>
    </div>
  );
}

export default Progress;
