import os
import json
from typing import List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from groq import Groq
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from contextlib import contextmanager
from fastapi.middleware.cors import CORSMiddleware  # Add this import
# Load environment variables
load_dotenv()

# Environment variables with error handling
XI_API_KEY = os.getenv("XI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is not set")

# FastAPI setup
app = FastAPI()
# FastAPI setup
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Pydantic data model for output structure
class InterviewQuestions(BaseModel):
    technical_questions: List[str]
    behaviorial_questions: List[str]

@contextmanager
def get_chrome_driver():
    """Context manager for Chrome driver to ensure proper cleanup"""
    chrome_options = Options()
    chrome_options.add_argument('--headless')  # Run in headless mode
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    
    service = Service('./driver/chromedriver')
    driver = webdriver.Chrome(service=service, options=chrome_options)
    try:
        yield driver
    finally:
        driver.quit()

async def scrape_job_description(url: str) -> str:
    """
    Scrape job description with proper error handling and timeouts
    """
    try:
        with get_chrome_driver() as driver:
            driver.get(url)
            
            # Wait up to 10 seconds for the element to be present
            wait = WebDriverWait(driver, 10)
            job_description_element = wait.until(
                EC.presence_of_element_located((
                    By.XPATH, 
                    "/html/body/div/div/div[3]/div/div[3]/div[2]/div/div/div[1]/div[1]"
                ))
            )
            
            return job_description_element.text
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to scrape job description: {str(e)}"
        )

async def get_interview_questions(description: str) -> InterviewQuestions:
    """
    Get interview questions with error handling
    """
    try:
        groq = Groq(api_key=GROQ_API_KEY)
        print('reached here')
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
        print('reached her2e')

        return InterviewQuestions.model_validate_json(chat_completion.choices[0].message.content)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate interview questions: {str(e)}"
        )

@app.get("/questions/technical", response_model=dict)
async def get_technical_questions(url: str):
    """
    API endpoint with proper error handling and async support
    """
    try:
        job_description = await scrape_job_description(url)
        interview_questions = await get_interview_questions(job_description)
        print({"technical_questions": interview_questions.technical_questions})
        return {"technical_questions": interview_questions.technical_questions}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )