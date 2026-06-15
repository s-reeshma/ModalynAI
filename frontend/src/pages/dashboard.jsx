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

  const email = localStorage.getItem("userEmail");

  useEffect(() => {
    fetchUser();
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
            className="dashboard-theme-toggle" 
            onClick={() => { toggleTheme(); setDarkMode(!darkMode); }}
          >
            {darkMode ? "☀" : "🌙"}
          </button>
          <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        </div>
      </header>
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
      {/* 2. HERO */}
      <main className="hero-section">
        <h1 className="dashboard-title">
          Welcome, {userData?.name ? userData.name : ""} 
        </h1>
        <p className="dashboard-subtitle">
          Your AI-powered adaptive learning companion is ready.
        </p>
        <button className="start-btn" onClick={() => navigate("/learn")}>
          🚀 Start Learning
        </button>
      </main>

      {/* 3. STATS */}
      <section className="stats-bar">
        <div className="stat-card"><h2>🔥 Streak</h2><p>{userData?.streak || 0}</p></div>
        <div className="stat-card"><h2>⭐ XP</h2><p>{userData?.xp || 0}</p></div>
        <div className="stat-card"><h2>📚 Topics</h2><p>{userData?.completed_topics?.length || 0}</p></div>
      </section>
    </div>
  );
}

export default Dashboard;