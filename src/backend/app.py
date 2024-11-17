import os
import json
from typing import List
from pydantic import BaseModel
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
import assemblyai as aai
from elevenlabs import generate, stream
from groq import Groq

# Load environment variables
load_dotenv()

# Environment variables
XI_API_KEY = os.getenv("XI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
AAI_API_KEY = os.getenv("AAI_API_KEY")

# Ensure API keys are available
if not XI_API_KEY or not GROQ_API_KEY or not AAI_API_KEY:
    raise ValueError("Please ensure that XI_API_KEY, GROQ_API_KEY, and AAI_API_KEY are set in your environment variables.")

# Pydantic data model for output structure
class InterviewQuestions(BaseModel):
    technical_questions: List[str]
    behavioral_questions: List[str]

# Function to get interview questions based on the job description
def get_interview_questions(description: str) -> InterviewQuestions:
    groq = Groq(api_key=GROQ_API_KEY)

    chat_completion = groq.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are an expert at analyzing job descriptions and creating relevant technical and behavioral questions for interviews based on the job description you've analyzed."
            },
            {
                "role": "user",
                "content": f"""
Based on the provided job description, generate 3 technical interview questions and 3 behavioral interview questions.

Job Description:
{description}

Let the output be a JSON object in the following format:

{{
    "technical_questions": ["question_1", "question_2", "question_3"],
    "behavioral_questions": ["question_1", "question_2", "question_3"]
}}
"""
            }
        ],
        model="llama3-groq-70b-8192-tool-use-preview",
        temperature=0,
        stream=False,
        response_format={"type": "json_object"}
    )

    return InterviewQuestions.model_validate_json(chat_completion.choices[0].message.content)

# Function to scrape job description from a URL
def scrape_job_description(url: str) -> str:
    options = Options()
    options.add_argument("--headless")
    driver = webdriver.Chrome(options=options)
    driver.get(url)
    job_description_element = driver.find_element(By.XPATH, "/html/body/div/div/div[3]/div/div[3]/div[2]/div/div/div[1]/div[1]")
    job_description = job_description_element.text
    driver.quit()
    return job_description

# AI Assistant Class
class AI_Assistant:
    def __init__(self, interview_questions):
        aai.settings.api_key = AAI_API_KEY
        self.groq_client = Groq(api_key=GROQ_API_KEY)
        self.elevenlabs_api_key = XI_API_KEY

        self.transcriber = None

        # Conversation history
        self.full_transcript = [
            {"role": "system", "content": "You are an expert interviewer for job roles in the tech industry. You ask good follow-up questions to make sure the candidate is the right fit for the role."},
        ]

        # Store the interview questions
        self.questions = interview_questions.technical_questions + interview_questions.behavioral_questions
        self.current_question_index = 0

    def start_interview(self):
        # Optional greeting
        greeting = "Hello, thank you for joining this interview. Let's begin."
        self.full_transcript.append({"role": "assistant", "content": greeting})
        print(f"\nAI Assistant: {greeting}")
        self.generate_audio(greeting)

        # Start by asking the first question
        if self.current_question_index < len(self.questions):
            self.ask_question()
        else:
            print("No questions available.")

    def ask_question(self):
        question = self.questions[self.current_question_index]
        self.current_question_index += 1

        # Append the assistant's message to the conversation
        self.full_transcript.append({"role": "assistant", "content": question})
        print(f"\nAI Assistant: {question}")

        # Generate audio for the question
        self.generate_audio(question)

        # Start listening for the user's response
        self.start_transcription()

    ###### Real-Time Transcription with AssemblyAI ######

    def start_transcription(self):
        self.transcriber = aai.RealtimeTranscriber(
            sample_rate=16000,
            on_data=self.on_data,
            on_error=self.on_error,
            on_open=self.on_open,
            on_close=self.on_close,
            end_utterance_silence_threshold=5000
        )

        self.transcriber.connect()
        microphone_stream = aai.extras.MicrophoneStream(sample_rate=16000)
        self.transcriber.stream(microphone_stream)

    def stop_transcription(self):
        if self.transcriber:
            self.transcriber.close()
            self.transcriber = None

    def on_open(self, session_opened: aai.RealtimeSessionOpened):
        print("Session ID:", session_opened.session_id)
        return

    def on_data(self, transcript: aai.RealtimeTranscript):
        if not transcript.text:
            return

        if isinstance(transcript, aai.RealtimeFinalTranscript):
            self.process_user_response(transcript)
        else:
            print(transcript.text, end="\r")

    def on_error(self, error: aai.RealtimeError):
        print("An error occurred:", error)
        return

    def on_close(self):
        # print("Closing Session")
        return

    ###### Process user's response and proceed ######

    def process_user_response(self, transcript):

        self.stop_transcription()

        self.full_transcript.append({"role": "user", "content": transcript.text})
        print(f"\nInterviewee: {transcript.text}", end="\r\n")

        # Check if there are more questions
        if self.current_question_index < len(self.questions):
            self.ask_question()
        else:
            # Interview is over, generate feedback
            self.generate_feedback()

    def generate_feedback(self):
        # Generate feedback based on the conversation
        conversation_text = "\n".join([f"{msg['role'].capitalize()}: {msg['content']}" for msg in self.full_transcript])

        feedback_prompt = f"""
You are an AI interviewer. Based on the following conversation, provide detailed feedback on the interviewee's performance, highlighting strengths and areas for improvement.

Conversation:
{conversation_text}

Feedback:
"""

        response = self.groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": feedback_prompt}
            ],
            model="llama3-groq-70b-8192-tool-use-preview",
            temperature=0.7
        )

        feedback = response.choices[0].message.content.strip()

        # Output the feedback
        print(f"\nAI Assistant (Feedback): {feedback}")

        # Generate audio for the feedback
        self.generate_audio(feedback)

    ###### Generate audio with ElevenLabs ######

    def generate_audio(self, text):

        print(f"\nAI Assistant: {text}")

        audio_stream = generate(
            api_key=self.elevenlabs_api_key,
            text=text,
            voice="Alice",
            stream=True
        )

        stream(audio_stream)

# Main function
if __name__ == "__main__":
    # URL of the job description
    url = input("Enter the job description URL: ")

    # Scrape the job description
    print("Scraping the job description...")
    job_description = scrape_job_description(url)
    print("Job description retrieved successfully.")

    # Fetch interview questions
    print("Generating interview questions...")
    interview_questions = get_interview_questions(job_description)
    print("Interview questions generated successfully.")

    # Optionally, print the questions
    print("\nTechnical Questions:")
    for q in interview_questions.technical_questions:
        print(f"- {q}")

    print("\nBehavioral Questions:")
    for q in interview_questions.behavioral_questions:
        print(f"- {q}")

    # Initialize the AI assistant with the generated questions
    ai_assistant = AI_Assistant(interview_questions)

    # Start the interview
    ai_assistant.start_interview()
