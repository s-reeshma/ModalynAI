import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../api";
import "../styles/dashboard.css";
import Sidebar from "../components/Sidebar";
import { Flame, ArrowRight } from "lucide-react";

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  const [userData, setUserData] = useState(null);
  const [lessonsCount, setLessonsCount] = useState(0);

  const email = localStorage.getItem("userEmail");

  useEffect(() => {
    fetchUser();
    fetchHistory();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await API.get(`/get-user/${email}`);
      if (res.data) {
        setUserData(res.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await API.get(`/history/${email}`);
      if (res.data && res.data.history) {
        setLessonsCount(res.data.history.length);
      }
    } catch (error) {
      console.log("Error fetching history:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.clear();
    navigate("/login");
  };

  const getStyleStrength = (styleKey) => {
    const ls = userData?.learning_style || { visual: 1, reading: 1, kinesthetic: 1, auditory: 1 };
    const v = Number(ls.visual) || 1;
    const r = Number(ls.reading) || 1;
    const k = Number(ls.kinesthetic) || 1;
    const a = Number(ls.auditory) || 1;
    
    const maxWeight = Math.max(v, r, k, a);
    const currentWeight = Number(ls[styleKey]) || 1;
    
    const diff = maxWeight - currentWeight;
    
    if (diff <= 2) return { label: "Strong", className: "strong" };
    if (diff <= 5) return { label: "Medium", className: "medium" };
    return { label: "Weak", className: "weak" };
  };

  return (
    <div className={`dashboard-layout ${darkMode ? "dark" : ""}`}>
      {/* LEFT SIDEBAR (Using Shared Component) */}
      <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} />

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        <header className="main-header">
          <div className="welcome-text">
            <h1>Welcome back, {userData?.name ? userData.name.split(' ')[0] : "Alex"}!</h1>
            <p>Let's continue your learning journey.</p>
          </div>
          <div className="streak-badge">
            <Flame className="streak-icon" size={24} color="#f59e0b" />
            <div className="streak-info">
              <span className="streak-num">{userData?.current_streak || userData?.streak || 0}</span>
              <span className="streak-label">day streak</span>
            </div>
          </div>
        </header>

        <section className="hero-card">
          <div className="hero-content">
            <h2>Ready to learn something new?</h2>
            <p>Start a new topic and let Modalyn AI adapt to your learning style.</p>
            <button className="start-btn" onClick={() => navigate("/learn")} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Start Learning <ArrowRight size={18} />
            </button>
          </div>
          <div className="hero-graphic">
            <div className="hologram-brain">🧠</div>
          </div>
        </section>

        <section className="vark-section">
          <h3>Your Learning Style (VARK)</h3>
          <p className="section-subtitle">Modalyn AI adapts content to your preferences</p>
          <div className="vark-grid">
            <div className="vark-card">
              <div className="vark-icon" style={{ color: "#8b5cf6" }}>👁️</div>
              <h4>Visual</h4>
              <p>Learn with images, diagrams and charts</p>
              <span className={`vark-strength ${getStyleStrength("visual").className}`}>{getStyleStrength("visual").label}</span>
            </div>
            <div className="vark-card">
              <div className="vark-icon" style={{ color: "#3b82f6" }}>((🔊))</div>
              <h4>Auditory</h4>
              <p>Learn with audio and discussions</p>
              <span className={`vark-strength ${getStyleStrength("auditory").className}`}>{getStyleStrength("auditory").label}</span>
            </div>
            <div className="vark-card">
              <div className="vark-icon" style={{ color: "#10b981" }}>✋</div>
              <h4>Kinesthetic</h4>
              <p>Learn by doing and practicing</p>
              <span className={`vark-strength ${getStyleStrength("kinesthetic").className}`}>{getStyleStrength("kinesthetic").label}</span>
            </div>
            <div className="vark-card">
              <div className="vark-icon" style={{ color: "#f59e0b" }}>📖</div>
              <h4>Read/Write</h4>
              <p>Learn with text and notes</p>
              <span className={`vark-strength ${getStyleStrength("reading").className}`}>{getStyleStrength("reading").label}</span>
            </div>
          </div>
        </section>

        <section className="dashboard-stats-row">
          <div className="mini-stats">
            <div className="mini-stat-card">
              <span className="stat-label">Topics Covered</span>
              <h2 className="stat-value">{lessonsCount}</h2>
              <span className="stat-link" onClick={() => navigate("/learn")}>View all topics →</span>
            </div>
            <div className="mini-stat-card">
              <span className="stat-label">Experience (XP)</span>
              <h2 className="stat-value">{userData?.xp || 0}</h2>
              <span className="stat-link" onClick={() => navigate("/progress")}>View progress →</span>
            </div>
          </div>

          <div className="weekly-activity-card">
            <span className="stat-label">Weekly Activity</span>
            <div className="mock-bar-chart">
              <div className="bar-col"><div className="bar" style={{height: "40%"}}></div><span>Tue</span></div>
              <div className="bar-col"><div className="bar" style={{height: "60%"}}></div><span>Wed</span></div>
              <div className="bar-col"><div className="bar" style={{height: "80%"}}></div><span>Thu</span></div>
              <div className="bar-col"><div className="bar" style={{height: "50%"}}></div><span>Fri</span></div>
              <div className="bar-col"><div className="bar" style={{height: "90%"}}></div><span>Sat</span></div>
              <div className="bar-col"><div className="bar" style={{height: "30%"}}></div><span>Sun</span></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;