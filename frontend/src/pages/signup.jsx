import { useState } from "react";

import {
  createUserWithEmailAndPassword,
  signInWithPopup
} from "firebase/auth";

import {
  useNavigate,
  Link
} from "react-router-dom";

import {
  auth,
  provider
} from "../firebase";

import API from "../api";

import "../styles/auth.css";

import {
  toggleTheme
} from "../utils/theme";

function Signup() {

  const navigate = useNavigate();

  const [darkMode, setDarkMode]
    = useState(
      localStorage.getItem("theme")
      === "dark"
    );

  const [name, setName]
    = useState("");

  const [email, setEmail]
    = useState("");

  const [password, setPassword]
    = useState("");

  // EMAIL SIGNUP

  const handleSignup = async () => {

    try {

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = userCredential.user;

      // ✅ STORE EMAIL
      localStorage.setItem(
        "userEmail",
        user.email
      );

      // ✅ SAVE USER
      await API.post("/save-user", {

        name: name,
        email: user.email,
        photo: ""

      });

      // ✅ FETCH USER FROM DB
      const res =
        await API.get(
          `/get-user/${user.email}`
        );

      // ✅ CHECK ONBOARDING
      if (
        res.data.onboarding_completed
      ) {

        navigate("/dashboard");

      } else {

        navigate("/onboarding");

      }

    } catch (error) {

      console.log(error);

      alert(error.message);

    }
  };

  // GOOGLE SIGNUP

  const handleGoogleSignup = async () => {

    try {

      const result =
        await signInWithPopup(
          auth,
          provider
        );

      const user = result.user;

      // ✅ STORE EMAIL
      localStorage.setItem(
        "userEmail",
        user.email
      );

      // ✅ SAVE USER
      await API.post("/save-user", {

        name: user.displayName || "",
        email: user.email,
        photo: user.photoURL || ""

      });

      // ✅ FETCH USER
      const res =
        await API.get(
          `/get-user/${user.email}`
        );

      // ✅ CHECK ONBOARDING
      if (
        res.data.onboarding_completed
      ) {

        navigate("/dashboard");

      } else {

        navigate("/onboarding");

      }

    } catch (error) {

      console.log(error);

      alert(error.message);

    }
  };

  return (

    <div className={`auth-container ${
      darkMode ? "dark" : ""
    }`}>

      <button
        className="theme-toggle"
        onClick={() => {

          toggleTheme();

          setDarkMode(
            localStorage.getItem("theme")
            === "dark"
          );
        }}
      >

        {darkMode ? "☀" : "🌙"}

      </button>

      <div className="auth-card">

        <h1 className="auth-title">
          Create Account
        </h1>

        <p className="auth-subtitle">

          Start your personalized
          AI-powered learning journey.

        </p>

        <input
          className="auth-input"
          type="text"
          placeholder="Full Name"
          onChange={(e) =>
            setName(e.target.value)
          }
        />

        <input
          className="auth-input"
          type="email"
          placeholder="Email"
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />

        <input
          className="auth-input"
          type="password"
          placeholder="Password"
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <button
          className="auth-button"
          onClick={handleSignup}
        >

          Create Account

        </button>

        <button
          className="google-button"
          onClick={handleGoogleSignup}
        >

          Continue with Google

        </button>

        <div className="auth-footer">

          <Link
            className="auth-link"
            to="/login"
          >

            Already have an account?

          </Link>

        </div>

      </div>

    </div>
  );
}

export default Signup;