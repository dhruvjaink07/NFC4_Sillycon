# Flask Agent API

This project is a Flask-based API for processing and redacting sensitive information from various file types. It utilizes multiple agent classes to handle different aspects of the redaction process, including detecting personally identifiable information (PII) and applying compliance policies.

## Project Structure

```
flask-agent-api
├── app
│   ├── __init__.py          # Initializes the Flask application
│   ├── routes.py            # Defines API routes
│   ├── agents                # Contains agent classes for processing
│   │   ├── runner_agent.py   # Handles loading and processing text files
│   │   ├── redactor_agent.py  # Detects and redacts sensitive information
│   │   ├── pii_agent.py       # Detects personally identifiable information
│   │   ├── compliance_agent.py # Applies compliance policies
│   │   └── audit_agent.py     # Logs metadata about the redaction process
│   └── utils
│       └── file_utils.py      # Utility functions for file handling
├── tests                      # Contains unit tests for the agents
│   └── test_agents.py         # Tests for agent classes
├── requirements.txt           # Lists project dependencies
├── config.py                  # Configuration settings for the application
├── README.md                  # Project documentation
└── run.py                     # Entry point for running the Flask application
```

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd flask-agent-api
   ```

2. **Install dependencies:**
   ```
   pip install -r requirements.txt
   ```

3. **Run the application:**
   ```
   python run.py
   ```

## Usage

Once the application is running, you can access the API endpoints defined in `app/routes.py`. The API allows you to upload files for redaction and retrieve the processed files.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.