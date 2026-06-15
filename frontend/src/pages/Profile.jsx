import { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";
import "../styles/profile.css";
import { applyTheme, toggleTheme } from "../utils/theme";

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);

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

      {/* CARD */}
      <div className="profile-card">

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

        {/* BUTTONS */}
        <div className="profile-buttons">

          {!editMode ? (
            <button onClick={() => setEditMode(true)}>
              Edit
            </button>
          ) : (
            <button onClick={handleSave}>
              Save
            </button>
          )}

          <button onClick={() => navigate("/dashboard")}>
            Dashboard
          </button>

        </div>

      </div>
    </div>
  );
}

export default Profile;