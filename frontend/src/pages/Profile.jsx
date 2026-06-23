import { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";
import "../styles/profile.css";
import { applyTheme, toggleTheme } from "../utils/theme";

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const email = localStorage.getItem("userEmail");

  // -----------------------
  // INIT
  // -----------------------
  useEffect(() => {
    applyTheme(); // ✅ FIX: apply dark mode on load
    if (email) fetchUser();
  }, []);

  // -----------------------
  // FETCH USER
  // -----------------------
  const fetchUser = async () => {
    try {
      const res = await API.get(`/get-user/${email}`);
      if (res.data) {
        setUser(res.data);
      } else {
        setUser({});
      }
    } catch (error) {
      console.log(error);
      setUser({});
    }
  };

  // -----------------------
  // SAVE USER
  // -----------------------
  const handleSave = async () => {
    try {
      await API.put(`/update-user/${email}`, user);
      setEditMode(false);
      alert("Profile Updated");
    } catch (error) {
      console.log(error);
    }
  };

  // -----------------------
  // LOADING STATE
  // -----------------------
  if (!user) {
    return (
      <div className="profile-page">
        <h2>Loading profile...</h2>
      </div>
    );
  }

  // Calculate learning style percentages safely
  const getStylePercentages = () => {
    const ls = user?.learning_style || {};
    const v = Math.max(0, Number(ls.visual) || 0);
    const r = Math.max(0, Number(ls.reading) || 0);
    const k = Math.max(0, Number(ls.kinesthetic) || 0);
    const a = Math.max(0, Number(ls.auditory) || 0);
    
    const sum = v + r + k + a;
    // Default to 25% each if no positive weights
    if (sum === 0) return { visual: 25, reading: 25, kinesthetic: 25, auditory: 25 };
    
    return {
      visual: Math.round((v / sum) * 100),
      reading: Math.round((r / sum) * 100),
      kinesthetic: Math.round((k / sum) * 100),
      auditory: Math.round((a / sum) * 100),
    };
  };

  const pcts = getStylePercentages();

  return (
    <div className="profile-page">

      {/* THEME BUTTON */}
      <button
        className="theme-toggle"
        onClick={() => {
          toggleTheme();
        }}
      >
        {localStorage.getItem("theme") === "dark" ? "☀" : "🌙"}
      </button>

      <div className="profile-layout">
      {/* LEFT CARD */}
      <div className="profile-card">

        {/* TOP RIGHT ANALYSIS TOGGLE */}
        <button 
          className="analysis-toggle-btn" 
          onClick={() => setShowAnalysis(!showAnalysis)}
          title="View Analysis"
        >
          📊
        </button>

        <h1>👤 Profile</h1>

        {/* NAME */}
        <input
          disabled={!editMode}
          value={ user.name || ""}
          onChange={(e) =>
            setUser({ ...user, name: e.target.value })
          }
        />

        {/* EMAIL */}
        <input
          disabled
          value={user?.email || ""}
        />

        {/* AGE */}
        <input
          disabled={!editMode}
          placeholder="Age"
          value={user?.age || ""}
          onChange={(e) =>
            setUser({ ...user, age: e.target.value })
          }
        />

        {/* GOAL */}
        <input
          disabled={!editMode}
          placeholder="Learning Goal"
          value={user?.learning_goal || ""}
          onChange={(e) =>
            setUser({
              ...user,
              learning_goal: e.target.value
            })
          }
        />

        {/* STYLE */}
        <input
          disabled={!editMode}
          placeholder="Favorite Learning Style"
          value={user?.favorite_style || ""}
          onChange={(e) =>
            setUser({
              ...user,
              favorite_style: e.target.value
            })
          }
        />

        {/* STATS */}
        <div className="profile-stats">
          <div>🔥 Streak: {user?.streak || 0}</div>
          <div>⭐ XP: {user?.xp || 0}</div>
        </div>

        {/* WEAK AREAS MOVED TO ANALYSIS */}

        {/* BUTTONS */}
        <div className="profile-buttons">

          {!editMode ? (
            <button className="primary-btn" onClick={() => setEditMode(true)}>
              Edit
            </button>
          ) : (
            <button className="primary-btn" onClick={handleSave}>
              Save
            </button>
          )}

          <button className="secondary-btn" onClick={() => navigate("/dashboard")}>
            Dashboard
          </button>
        </div>

        {/* LEARNING PROFILE ANALYSIS - MOVED TO RIGHT CARD */}
      </div>

      {/* RIGHT CARD */}
      {showAnalysis && (
        <div className="profile-card analysis-card">
          <div className="learning-profile">
            <h3>Learning Profile</h3>
            
            <div className="skill-bar-container">
              <span className="skill-label">Visual</span>
              <div className="skill-bar">
                <div className="skill-fill visual-fill" style={{ width: `${pcts.visual}%` }}></div>
              </div>
              <span className="skill-pct">{pcts.visual}%</span>
            </div>

            <div className="skill-bar-container">
              <span className="skill-label">Read/Write</span>
              <div className="skill-bar">
                <div className="skill-fill rw-fill" style={{ width: `${pcts.reading}%` }}></div>
              </div>
              <span className="skill-pct">{pcts.reading}%</span>
            </div>

            <div className="skill-bar-container">
              <span className="skill-label">Kinesthetic</span>
              <div className="skill-bar">
                <div className="skill-fill kinesthetic-fill" style={{ width: `${pcts.kinesthetic}%` }}></div>
              </div>
              <span className="skill-pct">{pcts.kinesthetic}%</span>
            </div>

            <div className="skill-bar-container">
              <span className="skill-label">Auditory</span>
              <div className="skill-bar">
                <div className="skill-fill auditory-fill" style={{ width: `${pcts.auditory}%` }}></div>
              </div>
              <span className="skill-pct">{pcts.auditory}%</span>
            </div>

            {/* WEAK AREAS */}
            <div className="profile-weak-areas">
              <strong>Weak Areas:</strong> 
              {user?.weak_areas && user.weak_areas.length > 0 ? (
                <div className="weak-tags">
                  {user.weak_areas.map((wa, i) => <span key={i} className="weak-tag">{wa}</span>)}
                </div>
              ) : (
                <span className="no-data"> None identified yet</span>
              )}
            </div>
            
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

export default Profile;