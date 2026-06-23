import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "../styles/dashboard.css";
import { toggleTheme } from "../utils/theme";

function Dashboard() {
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  const [menuOpen, setMenuOpen] = useState(false);
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
  return (
    <div className={`dashboard ${darkMode ? "dark" : ""}`}>
      {/* 1. HEADER */}
      <header className="dashboard-header">
        <div className="logo"><h5>Modalyn AI</h5></div>
        <div className="header-right">
          <button 
            className="dashboard-theme-toggle square-btn" 
            onClick={() => { toggleTheme(); setDarkMode(!darkMode); }}
          >
            {darkMode ? "☀" : "🌙"}
          </button>
          
          <div className="menu-container" style={{ position: "relative" }}>
            <button className="menu-btn square-btn" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
            
            {menuOpen && (
              <div className="dropdown-menu">
                <div className="menu-item" onClick={() => navigate("/profile")}>
                  👤 Profile
                </div>
                <div className="menu-item">
                  📚 Previous Topics
                </div>
                <div className="menu-item">
                  🔥 Streak: {userData?.streak || 0}
                </div>
                <div className="menu-item">
                  ⭐ XP: {userData?.xp || 0}
                </div>
                <div className="menu-item logout" onClick={handleLogout}>
                  🚪 Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      {/* 2. HERO */}
      <main className="hero-section fade-in-up">
        <h1 className="dashboard-title">
          Welcome back, <span className="highlight">{userData?.name ? userData.name.split(' ')[0] : "Learner"}</span>
        </h1>
        <p className="dashboard-subtitle">
          Your adaptive AI tutor is ready for another session.
        </p>
        <button className="start-btn glow-effect" onClick={() => navigate("/learn")}>
          <span className="icon">🚀</span> Resume Learning
        </button>
      </main>

      {/* 3. STATS */}
      <section className="stats-bar stagger-in">
        <div className="stat-card glass-panel">
          <div className="stat-icon streak-icon">🔥</div>
          <div className="stat-info">
            <h2>{userData?.streak || 0} Day</h2>
            <p>Current Streak</p>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon xp-icon">⭐</div>
          <div className="stat-info">
            <h2>{userData?.xp || 0} XP</h2>
            <p>Total Experience</p>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon topics-icon">📚</div>
          <div className="stat-info">
            <h2>{lessonsCount}</h2>
            <p>Topics Covered</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;