import os
from dotenv import load_dotenv
from gliner import GLiNER
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

# Environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
UPLOAD_FOLDER = "temp_uploads"
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# Supported file types
SUPPORTED_EXTENSIONS = {'.pdf', '.txt', '.json', '.docx'}

# Compliance mapping
COMPLIANCE_MAPPING = {
    1: "GDPR",
    2: "HIPAA", 
    3: "DPDP"
}

# Global models (initialized on startup)
gliner_model = None
llm_model = None

def initialize_models():
    """Initialize GLiNER and LLM models"""
    global gliner_model, llm_model
    
    try:
        gliner_model = GLiNER.from_pretrained("urchade/gliner_medium-v2.1")
        print("✅ GLiNER NER model loaded")
    except Exception as e:
        print(f"❌ Failed to load GLiNER model: {e}")
        gliner_model = None

    try:
        if GEMINI_API_KEY:
            llm_model = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                temperature=0,
                google_api_key=GEMINI_API_KEY,
                timeout=30
            )
            print("✅ LLM loaded for compliance validation")
        else:
            print("⚠️ GEMINI_API_KEY not found, LLM features disabled")
    except Exception as e:
        print(f"❌ Failed to load Gemini LLM: {e}")
        llm_model = None

def ensure_upload_folder():
    """Ensure upload folder exists"""
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)