import os
import requests
import json
import assemblyai as aai
from typing import List
from pydantic import BaseModel
from dotenv import load_dotenv
from elevenlabs import generate, stream
from selenium import webdriver
from selenium.webdriver.common.by import By
from groq import Groq

# Load environment variables
load_dotenv()

# Environment variables
XI_API_KEY = os.getenv("XI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
AAI_API_KEY = os.getenv("AAI_API_KEY")

# Selenium setup to scrape the job description
url = "https://www.metacareers.com/v2/jobs/1303076114202551/"
driver = webdriver.Chrome()
driver.get(url)
job_description = driver.find_element(By.XPATH, "/html/body/div/div/div[3]/div/div[3]/div[2]/div/div/div[1]/div[1]").text
driver.quit()

# Pydantic data model for output structure
class InterviewQuestions(BaseModel):
    technical_questions: List[str]
    behaviorial_questions: List[str]

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
                Based on the provided job description generate 3 technical interview questions and 3 behavioral interview questions.

                Job Description:
                {description}

                Let the output be a JSON object in the following format:

                {{
                    "technical_questions": ["question_1", "question_2", "question_3"],
                    "behaviorial_questions": ["question_1", "question_2", "question_3"]
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

# Fetch interview questions
interview_questions = get_interview_questions(job_description)

# Print the output
print(json.dumps(interview_questions.model_dump(), indent=2))


class AI_Assistant:
    def __init__(self):
        aai.settings.api_key = AAI_API_KEY
        self.groq_client = groq = Groq(api_key=GROQ_API_KEY)
        self.elevenlabs_api_key = XI_API_KEY

        self.transcriber = None

        # Prompt
        self.full_transcript = [
            {"role": "system", "content": "You are an expert interviewer for job roles in the tech industry. You ask good follow up questions to make sure the candidate is the right fit for the role."},
        ]

    ###### Step 2: Real-Time Transcription with AssemblyAI ######

    def start_transcription(self):
        self.transcriber = aai.RealtimeTranscriber(
            sample_rate=16000,
            on_data=self.on_data,
            on_error=self.on_error,
            on_open=self.on_open,
            on_close=self.on_close,
            end_utterance_silence_threshold=1000
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
            self.generate_ai_response(transcript)
        else:
            print(transcript.text, end="\r")

    def on_error(self, error: aai.RealtimeError):
        print("An error occured:", error)
        return

    def on_close(self):
        # print("Closing Session")
        return

    ###### Step 3: Pass real-time transcript to OpenAI ######

    def generate_ai_response(self, transcript):

        self.stop_transcription()

        self.full_transcript.append({"role": "user", "content": transcript.text})
        print(f"\nInterviewee: {transcript.text}", end="\r\n")

        response = self.groq_client.chat.completions.create(
            model="llama3-groq-70b-8192-tool-use-preview",
            messages=self.full_transcript
        )

        ai_response = response.choices[0].message.content

        self.generate_audio(ai_response)

        self.start_transcription()
        print(f"\nReal-time transcription: ", end="\r\n")

    ###### Step 4: Generate audio with ElevenLabs ######

    def generate_audio(self, text):

        self.full_transcript.append({"role": "assistant", "content": text})
        print(f"\nAI Receptionist: {text}")

        audio_stream = generate(
            api_key=self.elevenlabs_api_key,
            text=text,
            voice="Alice",
            stream=True
        )

        stream(audio_stream)


greeting = "Hi Chey, how are you today?"
ai_assistant = AI_Assistant()
ai_assistant.generate_audio(greeting)
ai_assistant.start_transcription()