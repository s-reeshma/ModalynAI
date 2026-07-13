import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "../styles/Onboarding.css";
import { toggleTheme, applyTheme } from "../utils/theme";

function Onboarding() {

  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  const email = localStorage.getItem("userEmail");

  const [preferences, setPreferences] = useState({
    visual: false,
    auditory: false,
    read_write: false,
    kinesthetic: false,
    step_by_step: false,
    examples: false,
    analogies: false,
    concise: false,
    practice: false,
    frustration: "",
    detail_level: "balanced"
  });

  // -------------------------
  // APPLY THEME
  // -------------------------
  useEffect(() => {
    applyTheme();
  }, []);

  // -------------------------
  // SAVE PREFERENCES
  // -------------------------
  const handleSubmit = async () => {
    try {
      const style_boosts = [];
      if (preferences.visual) style_boosts.push("visual");
      if (preferences.auditory) style_boosts.push("auditory");
      if (preferences.read_write) style_boosts.push("read_write");
      if (preferences.kinesthetic) style_boosts.push("kinesthetic");

      await API.put(`/update-user/${email}`, {
        teaching_preferences: preferences,
        onboarding_completed: true,
        style_boosts: style_boosts
      });

      navigate("/dashboard");

    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className={`onboarding ${darkMode ? "dark" : ""}`}>

      {/* HEADER */}
      <header className="onboarding-header">

        <div className="logo">
          AdaptiveAI
        </div>

        <button
          className="theme-toggle"
          onClick={() => {
            toggleTheme();

            setDarkMode(
              localStorage.getItem("theme") === "dark"
            );
          }}
        >
          {darkMode ? "☀" : "🌙"}
        </button>

      </header>

      {/* MAIN */}
      <main className="onboarding-main">

        <div className="hero-card">

          <h1 className="onboarding-title">
            Teach us how to teach you.
          </h1>

          <p className="onboarding-subtitle">
            Let’s personalize how your AI tutor explains concepts.
          </p>

          {/* QUESTION */}

          <h3>
            How do you usually understand concepts best?
          </h3>

          <label className="option">
            <input
              type="checkbox"
              checked={preferences.visual}
              onChange={(e) => setPreferences({ ...preferences, visual: e.target.checked })}
            />
            Visual Explanations (Diagrams, charts)
          </label>

          <label className="option">
            <input
              type="checkbox"
              checked={preferences.auditory}
              onChange={(e) => setPreferences({ ...preferences, auditory: e.target.checked })}
            />
            Auditory (Conversational, dialogue-based)
          </label>

          <label className="option">
            <input
              type="checkbox"
              checked={preferences.read_write}
              onChange={(e) => setPreferences({ ...preferences, read_write: e.target.checked })}
            />
            Reading/Writing (Detailed text, bullet points)
          </label>

          <label className="option">
            <input
              type="checkbox"
              checked={preferences.kinesthetic}
              onChange={(e) => setPreferences({ ...preferences, kinesthetic: e.target.checked })}
            />
            Kinesthetic (Interactive, hands-on examples)
          </label>

          {/* STEP BY STEP */}

          <label className="option">

            <input
              type="checkbox"
              checked={preferences.step_by_step}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  step_by_step: e.target.checked
                })
              }
            />

            Step-by-step Breakdown

          </label>

          {/* EXAMPLES */}

          <label className="option">

            <input
              type="checkbox"
              checked={preferences.examples}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  examples: e.target.checked
                })
              }
            />

            Examples First

          </label>

          {/* ANALOGIES */}

          <label className="option">

            <input
              type="checkbox"
              checked={preferences.analogies}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  analogies: e.target.checked
                })
              }
            />

            Real-world Analogies

          </label>

          {/* PRACTICE */}

          <label className="option">

            <input
              type="checkbox"
              checked={preferences.practice}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  practice: e.target.checked
                })
              }
            />

            Practice / Problem Solving

          </label>

          {/* DETAIL LEVEL */}

          <h3>
            How detailed should explanations be?
          </h3>

          <select
            value={preferences.detail_level}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                detail_level: e.target.value
              })
            }
          >

            <option value="simple">
              Simple
            </option>

            <option value="balanced">
              Balanced
            </option>

            <option value="deep">
              Deep Dive
            </option>

          </select>

          {/* SUBMIT */}

          <button
            className="submit-btn"
            onClick={handleSubmit}
          >
            Continue
          </button>

        </div>

      </main>

    </div>
  );
}

export default Onboarding;