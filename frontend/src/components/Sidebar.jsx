import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { toggleTheme } from "../utils/theme";
import { 
  LayoutDashboard, 
  BookOpen, 
  Library, 
  TrendingUp, 
  User, 
  Settings, 
  LogOut, 
  Sun, 
  Moon, 
  Bot 
} from "lucide-react";

const Sidebar = ({ darkMode, setDarkMode, children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.clear();
    navigate("/login");
  };

  const isActive = (path) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">M</div>
        <span className="logo-text">modalyn AI</span>
      </div>
      
      <nav className="sidebar-nav">
        <div className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`} onClick={() => navigate("/dashboard")}>
          <LayoutDashboard className="nav-icon" size={18} /> Dashboard
        </div>
        <div className={`nav-item ${isActive('/learn') ? 'active' : ''}`} onClick={() => navigate("/learn")}>
          <BookOpen className="nav-icon" size={18} /> Learn
        </div>
        <div className={`nav-item ${isActive('/topics') ? 'active' : ''}`} onClick={() => navigate("/topics")}>
          <Library className="nav-icon" size={18} /> Topics
        </div>
        <div className={`nav-item ${isActive('/progress') ? 'active' : ''}`} onClick={() => navigate("/progress")}>
          <TrendingUp className="nav-icon" size={18} /> Progress
        </div>
        <div className={`nav-item ${isActive('/profile') ? 'active' : ''}`} onClick={() => navigate("/profile")}>
          <User className="nav-icon" size={18} /> Profile
        </div>
        <div className={`nav-item ${isActive('/settings') ? 'active' : ''}`}>
          <Settings className="nav-icon" size={18} /> Settings
        </div>
        <div className="nav-item" onClick={handleLogout} style={{ color: '#ef4444' }}>
          <LogOut className="nav-icon" size={18} /> Logout
        </div>
      </nav>

      {/* Inject custom sidebar content here (e.g. Past Topics for Learn page) */}
      {children && <div className="sidebar-custom-content">{children}</div>}

      <div style={{ marginTop: 'auto' }}>
        <div className="theme-toggle-container">
          <span className="theme-label">Theme</span>
          <button 
            className="theme-switch" 
            onClick={() => { toggleTheme(); setDarkMode(!darkMode); }}
          >
            {darkMode ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>

        <div className="ai-tutor-card">
          <div className="tutor-avatar"><Bot size={24} /></div>
          <div className="tutor-text">
            <strong>Modalyn AI</strong>
            <p>Hi! I'm Modalyn, your AI learning companion. How can I help you today?</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
