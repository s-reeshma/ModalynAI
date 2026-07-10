# Modalyn AI: Adaptive Intelligent Tutoring System

Modalyn AI is an open-source, adaptive learning platform engineered to mimic the behavior of a human tutor. Unlike static educational content, Modalyn AI utilizes a feedback-driven state machine to track student performance, detect confusion in real-time, and dynamically switch teaching modalities (VARK: Visual, Auditory, Read/Write, Kinesthetic) to ensure concept mastery.

---

## 🧠 Core Philosophy: The Tutoring Cycle
Learning is a feedback-driven loop, not a linear progression. Modalyn AI operates on four distinct pillars:

1.  **Explain:** Context-aware content generation tailored to the user's optimal modality.
2.  **Practice:** Socratic-style reinforcement integrated into every learning step.
3.  **Evaluate:** Real-time analysis of confidence levels, response accuracy, and engagement metrics.
4.  **Adapt:** Automatic detection of "weak areas" triggering a remedial state that forces the system to re-teach concepts using alternative analogies and teaching styles.

---

## 🚀 Key Features

* **Intelligent Tutoring System (ITS):** A backend-driven state machine that prevents progression until the user demonstrates mastery.
* **Knowledge Tracing:** Granular tracking of "Struggle Scores" for every topic, automatically identifying foundational gaps.
* **Dynamic RAG Pipeline:** Leverages MongoDB Atlas Vector Search for hallucination-free grounding in trusted educational datasets.
* **Resilient Hybrid-AI:** Seamlessly switches between high-fidelity cloud models (Gemini) and high-speed local models (Llama 3/Ollama) for cost-free, offline-ready resilience.
* **Visual Animation Engine:** Advanced integration with **Framer Motion**, **Mermaid.js**, and **React Flow** to turn abstract concepts into interactive, animated experiences.

---

## 🛠 Technology Stack

* **Frontend:** React, Framer Motion, Monaco Editor, Mermaid.js, Reaflow/Cytoscape.
* **Backend:** FastAPI (Python) implementing Pydantic state-controlled validation.
* **AI Engine:** Google Gemini (Cloud) & Ollama (Local LLM Fallback).
* **Database:** MongoDB Atlas (Persistent state tracking, Vector Search, Knowledge Tracing).

---

## ⚙️ Getting Started

### Prerequisites
* Python 3.10+
* MongoDB Atlas Cluster
* Ollama (for offline/resilient compute)

### Installation
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/yourusername/modalyn-ai.git](https://github.com/yourusername/modalyn-ai.git)
   cd modalyn-ai