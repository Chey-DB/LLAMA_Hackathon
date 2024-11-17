# LLAMA Hackathon Project

This project provides an end-to-end interactive question-and-answer experience. It includes:

- **Frontend (UI)** for user interaction and silence detection.
- **Backend 1 (`server.py`)** for scraping and question management.
- **Backend 2 (`app.py`)** for two-way communication, real-time audio feedback, and **Groq** and **Llama** integration.

---

## **How to Run the Project**

### **Frontend (UI)**

#### Overview

The frontend handles user interactions, silence detection, and communicating with the backend.

#### Features

1. **Silence Detection**:
   - The frontend monitors user input activity during sessions.
   - If no input is detected within a defined threshold, it automatically requests the next question from the backend.
2. **Interactive Display**:
   - Dynamically renders questions and processes user answers in real-time.

#### Setup Instructions

1. Navigate to the `ui` directory:
   ```bash
   cd ui
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open the provided URL (e.g., `http://localhost:3000`) in your browser to access the UI.

---

### **Backend 1: `server.py`**

#### Overview

- Manages scraping and question updates.
- Built with **FastAPI** and **Selenium** for browser automation.

#### Setup Instructions

1. **Navigate to the Backend Directory**:

   ```bash
   cd src/backend
   ```

2. **Install Required Dependencies**:

   ```bash
   pip install fastapi pydantic selenium python-dotenv
   ```

3. **Ensure WebDriver is Installed**:

   - Install a browser WebDriver (e.g., ChromeDriver for Chrome).
     - For Ubuntu:
       ```bash
       sudo apt install chromedriver
       ```
     - Download manually from [here](https://chromedriver.chromium.org/downloads).

4. **Set Environment Variables**:

   - Add a `.env` file in the backend directory with API keys or configurations (if required):
     ```
     API_KEY=your_api_key_here
     ```

5. **Run the Backend**:
   ```bash
   python server.py
   ```

---

### **Backend 2: `app.py`**

#### Overview

- Acts as a middleware for real-time communication between the frontend and backend.
- Facilitates:
  - User actions like submitting answers and fetching the next question.
  - **Real-Time Audio Connection**: Integrates **Groq** and **Llama** to provide live audio-based interactions and feedback for mock interviews and conversational scenarios.

#### Features

1. **Groq and Llama Integration**:

   - Connects to Groq and Llama APIs for generating real-time responses for user inputs.
   - Provides intelligent feedback and guidance, simulating interviews or conversational scenarios.

2. **Real-Time Audio Feedback**:

   - Uses ElevenLabs or AssemblyAI for text-to-speech and speech-to-text capabilities.
   - Streams responses back to the user in real-time, enabling interactive audio sessions.

3. **User Interaction Flow**:
   - Frontend sends user queries or audio to `app.py`.
   - `app.py` processes the input with Groq and Llama, sending back text or audio feedback.

#### Setup Instructions

1. **Navigate to the Backend Directory**:

   ```bash
   cd src/backend
   ```

2. **Install Required Dependencies**:

   ```bash
   pip install fastapi requests python-dotenv elevenlabs assemblyai groq
   ```

3. **Set Environment Variables**:

   - Add a `.env` file in the backend directory:
     ```
     XI_API_KEY=your_elevenlabs_api_key_here
     GROQ_API_KEY=your_groq_api_key_here
     AAI_API_KEY=your_assemblyai_api_key_here
     LLAMA_API_KEY=your_llama_api_key_here
     ```

4. **Run the Middleware**:
   ```bash
   python app.py
   ```

---

## **Project Workflow**

### 1. **Start the Frontend**:

- The UI dynamically renders questions and monitors user activity.
- Silence detection triggers a transition to the next question if inactivity exceeds the threshold.

### 2. **Backend 1 (`server.py`) Handles Core Logic**:

- Scrapes questions from an external source.
- Maintains and updates the question bank based on user progress.

### 3. **Backend 2 (`app.py`) Enables Advanced Features**:

- Relays user requests (e.g., audio input or questions) from the frontend to the backend.
- Processes the input with Groq and Llama for intelligent responses.
- Converts responses into real-time audio feedback for enhanced interactivity.

---

## **Future Improvements**

1. **Frontend**:

   - Improve the silence detection algorithm for better sensitivity.
   - Add real-time WebSocket support for instant updates.

2. **Backend**:

   - Optimize scraping for reliability and speed.
   - Enhance Groq and Llama API interactions for more robust responses.

3. **End-to-End**:
   - Dockerize the application for seamless deployment.
   - Add metrics to analyze user behavior and improve feedback quality.

This setup ensures a fully interactive Q&A and feedback system with advanced audio and real-time features powered by Groq and Llama.

---
