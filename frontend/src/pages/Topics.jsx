import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import Sidebar from "../components/Sidebar";
import { Laptop, Dna, Atom, Brain, ArrowRight } from "lucide-react";
import "../styles/dashboard.css"; // Reuse dashboard layout styles
import "../styles/topics.css"; // We'll create this

function Topics() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const email = localStorage.getItem("userEmail");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/history/${email}`);
      if (res.data && res.data.history) {
        setTopics(res.data.history);
      }
    } catch (error) {
      console.log("Error fetching topics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDomainIcon = (domain) => {
    switch (domain?.toLowerCase()) {
      case "computer_science": return <Laptop size={24} />;
      case "biology": return <Dna size={24} />;
      case "physics": return <Atom size={24} />;
      default: return <Brain size={24} />;
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

  return (
    <div className={`dashboard-layout ${darkMode ? "dark" : ""}`}>
      <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} />

      <main className="main-content">
        <header className="main-header">
          <div className="welcome-text">
            <h1>Your Learning Topics</h1>
            <p>Review everything you've learned and dive back in.</p>
          </div>
        </header>

        <section className="topics-container">
          {loading ? (
            <div className="loading-state">Loading your knowledge base...</div>
          ) : topics.length === 0 ? (
            <div className="empty-state">
              <h3>No topics yet!</h3>
              <p>Start learning to build your knowledge base.</p>
              <button className="start-btn" onClick={() => navigate("/learn")}>Go to Learn</button>
            </div>
          ) : (
            <div className="topics-grid">
              {topics.map((t, idx) => (
                <div 
                  key={idx} 
                  className="topic-card glass-card"
                  onClick={() => navigate(`/topics/${encodeURIComponent(t.topic)}`)}
                >
                  <div 
                    className="topic-icon-wrapper" 
                    style={{ backgroundColor: `${getDomainColor(t.domain)}20`, color: getDomainColor(t.domain) }}
                  >
                    {getDomainIcon(t.domain)}
                  </div>
                  <div className="topic-info">
                    <h3 style={{ textTransform: "capitalize" }}>{t.topic.replace(/_/g, " ")}</h3>
                    <div className="topic-meta">
                      <span className="domain-badge" style={{ backgroundColor: `${getDomainColor(t.domain)}20`, color: getDomainColor(t.domain) }}>
                        {t.domain || "general"}
                      </span>
                      <span className="level-badge">
                        Level {t.level || 1}
                      </span>
                    </div>
                  </div>
                  <div className="topic-arrow"><ArrowRight size={20} /></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Topics;
