from selenium import webdriver
from selenium.webdriver.chrome.service import Service

# Use the path relative to app.py
service = Service('./driver/chromedriver')
driver = webdriver.Chrome(service=service)

driver.get('https://www.google.com')
print(driver.title)
driver.quit()