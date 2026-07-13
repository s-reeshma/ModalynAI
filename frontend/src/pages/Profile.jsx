import { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";
import "../styles/profile.css";
import { applyTheme } from "../utils/theme";
import Sidebar from "../components/Sidebar";
import { Flame, Trophy, Library, Star, User } from "lucide-react";

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
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
      } else {
        setUser({});
      }
    } catch (error) {
      console.log(error);
      setUser({});
    }
  };

  const handleSave = async () => {
    try {
      await API.put(`/update-user/${email}`, user);
      setEditMode(false);
      alert("Profile Updated");
    } catch (error) {
      console.log(error);
    }
  };

  if (!user) {
    return (
      <div className={`dashboard-layout ${darkMode ? "dark" : ""}`}>
        <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} />
        <main className="main-content">
          <div className="welcome-text">
            <h2>Loading profile...</h2>
          </div>
        </main>
      </div>
    );
  }

  const getStylePercentages = () => {
    const ls = user?.learning_style || {};
    const v = Math.max(0, Number(ls.visual) || 0);
    const r = Math.max(0, Number(ls.reading) || 0);
    const k = Math.max(0, Number(ls.kinesthetic) || 0);
    const a = Math.max(0, Number(ls.auditory) || 0);
    
    const sum = v + r + k + a;
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
    <div className={`dashboard-layout ${darkMode ? "dark" : ""}`}>
      <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} />

      <main className="main-content profile-main">
        <header className="main-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <div className="welcome-text">
             <h1>My Profile</h1>
             <p>Manage your account and learning preferences</p>
           </div>
           <div>
             {!editMode ? (
               <button className="primary-btn" onClick={() => setEditMode(true)}>Edit Profile</button>
             ) : (
               <button className="primary-btn" onClick={handleSave}>Save Changes</button>
             )}
           </div>
        </header>

        <div className="profile-mini-stats">
          <div className="mini-stat-item">
            <span className="mini-stat-icon"><Flame size={24} color="#f59e0b" /></span>
            <div className="mini-stat-text">
              <h3>{user?.current_streak || user?.streak || 0}</h3>
              <p>Streak</p>
            </div>
          </div>
          <div className="mini-stat-item">
            <span className="mini-stat-icon"><Trophy size={24} color="#3b82f6" /></span>
            <div className="mini-stat-text">
              <h3>{user?.max_streak || 0}</h3>
              <p>Best</p>
            </div>
          </div>
          <div className="mini-stat-item">
            <span className="mini-stat-icon"><Library size={24} color="#8b5cf6" /></span>
            <div className="mini-stat-text">
              <h3>{user?.lessonsCount || 0}</h3>
              <p>Topics</p>
            </div>
          </div>
          <div className="mini-stat-item">
            <span className="mini-stat-icon"><Star size={24} color="#10b981" /></span>
            <div className="mini-stat-text">
              <h3>{user?.xp || 0}</h3>
              <p>XP</p>
            </div>
          </div>
        </div>

        <div className="profile-grid-layout">
           
           <div className="card profile-card-main">
              <div className="profile-avatar"><User size={48} color="#9ca3af" /></div>
              <div className="profile-info">
                 {editMode ? (
                   <input className="profile-input-large" value={user.name || ""} onChange={e => setUser({...user, name: e.target.value})} placeholder="Your Name" />
                 ) : (
                   <h2>{user.name || "Learning Enthusiast"}</h2>
                 )}
                 <p className="profile-email">{user.email}</p>
                 <span className="premium-badge">Premium</span>
              </div>
           </div>

           <div className="profile-preferences-grid">
              <div className="card preferences-card">
                 <h3>Account Settings</h3>
                 <div className="pref-item">
                   <label>Age</label>
                   <input disabled={!editMode} value={user?.age || ""} onChange={e => setUser({...user, age: e.target.value})} placeholder="Age" />
                 </div>
                 <div className="pref-item">
                   <label>Learning Goal</label>
                   <input disabled={!editMode} value={user?.learning_goal || ""} onChange={e => setUser({...user, learning_goal: e.target.value})} placeholder="Learning Goal" />
                 </div>
                 <div className="pref-item">
                   <label>Favorite Style</label>
                   <input disabled={!editMode} value={user?.favorite_style || ""} onChange={e => setUser({...user, favorite_style: e.target.value})} placeholder="Favorite Style" />
                 </div>
              </div>

              <div className="card learning-profile-card">
                 <h3>Learning Profile</h3>
                 <div className="skill-bar-container">
                   <span className="skill-label">Visual</span>
                   <div className="skill-bar"><div className="skill-fill visual-fill" style={{ width: `${pcts.visual}%` }}></div></div>
                   <span className="skill-pct">{pcts.visual}%</span>
                 </div>
                 <div className="skill-bar-container">
                   <span className="skill-label">Read/Write</span>
                   <div className="skill-bar"><div className="skill-fill rw-fill" style={{ width: `${pcts.reading}%` }}></div></div>
                   <span className="skill-pct">{pcts.reading}%</span>
                 </div>
                 <div className="skill-bar-container">
                   <span className="skill-label">Kinesthetic</span>
                   <div className="skill-bar"><div className="skill-fill kinesthetic-fill" style={{ width: `${pcts.kinesthetic}%` }}></div></div>
                   <span className="skill-pct">{pcts.kinesthetic}%</span>
                 </div>
                 <div className="skill-bar-container">
                   <span className="skill-label">Auditory</span>
                   <div className="skill-bar"><div className="skill-fill auditory-fill" style={{ width: `${pcts.auditory}%` }}></div></div>
                   <span className="skill-pct">{pcts.auditory}%</span>
                 </div>
                 
                 <div className="profile-weak-areas" style={{ marginTop: '1.5rem' }}>
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

        </div>
      </main>
    </div>
  );
}

export default Profile;