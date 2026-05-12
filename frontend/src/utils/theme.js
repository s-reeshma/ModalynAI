export const applyTheme = () => {
  const darkMode = localStorage.getItem("theme") === "dark";

  if (darkMode) {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
};

export const toggleTheme = () => {
  const darkMode = localStorage.getItem("theme") === "dark";

  localStorage.setItem("theme", darkMode ? "light" : "dark");

  applyTheme();
};