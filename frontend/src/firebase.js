import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyD0ZzhxYb7ojexRtS_ntP-iFmfKCrtXXUw",
  authDomain: "adaptive-ai-learning-d39c1.firebaseapp.com",
  projectId: "adaptive-ai-learning-d39c1",
  storageBucket: "adaptive-ai-learning-d39c1.firebasestorage.app",
  messagingSenderId: "165658700170",
  appId: "1:165658700170:web:b320596816cdd45d15c073",
  measurementId: "G-TYVLB9QQGN"
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();