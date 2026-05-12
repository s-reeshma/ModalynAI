import { useState } from "react";

import API from "../api";
import "../styles/auth.css";

import {
  signInWithPopup,
  signInWithEmailAndPassword
} from "firebase/auth";

import {
  auth,
  provider
} from "../firebase";

import {
  useNavigate,
  Link
} from "react-router-dom";

import { toggleTheme } from "../utils/theme";

function Login() {

  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔥 GOOGLE LOGIN (FIXED)
  const handleGoogleLogin = async () => {

  if (loading) return;

  setLoading(true);

  try {

    const result = await signInWithPopup(auth, provider);

    const user = result.user;

    localStorage.setItem("userEmail", user.email);

    await API.post("/save-user", {
      name: user.displayName || "",
      email: user.email,
      photo: user.photoURL || ""
    });

    const res = await API.get(`/get-user/${user.email}`);

    if (res.data.onboarding_completed) {
      navigate("/dashboard");
    } else {
      navigate("/onboarding");
    }

  } catch (error) {

    console.log(error);

    if (
      error.code !== "auth/popup-closed-by-user" &&
      error.code !== "auth/cancelled-popup-request"
    ) {
      alert(error.message);
    }

  } finally {

    setLoading(false);

  }
};

  // 🔥 EMAIL LOGIN (FIXED)
  const handleEmailLogin = async () => {
    try {
      const userCredential =
        await signInWithEmailAndPassword(auth, email, password);

      const user = userCredential.user;

      // ✅ store only email (NOT name in localStorage)
      localStorage.setItem("userEmail", user.email);

      // 🔥 ensure DB sync (important fix)
      await API.post("/save-user", {
        name: user.displayName || "",
        email: user.email,
        photo: ""
      });
      const res = await API.get(`/get-user/${email}`);
      if (!res.data.onboarding_completed) {
        navigate("/onboarding");
        } else {
        navigate("/dashboard");
        }

    } catch (error) {
      console.log(error);
      alert(error.message);
    }
  };

  return (
    <div className={`auth-container ${darkMode ? "dark" : ""}`}>

      <button
        className="theme-toggle"
        onClick={() => {
          toggleTheme();
          setDarkMode(localStorage.getItem("theme") === "dark");
        }}
      >
        {darkMode ? "☀" : "🌙"}
      </button>

      <div className="auth-card">

        <h1 className="auth-title">
          Welcome Back
        </h1>

        <p className="auth-subtitle">
          Learn smarter, grow faster, and let AI adapt to your journey.
        </p>

        <input
          className="auth-input"
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="auth-input"
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="auth-button"
          onClick={handleEmailLogin}
        >
          Sign In
        </button>

        <button
          className="google-button"
          onClick={handleGoogleLogin}
        >
          Continue with Google
        </button>

        <div className="auth-footer">
          <Link className="auth-link" to="/signup">
            Create Account
          </Link>
        </div>

      </div>

    </div>
  );
}

export default Login;