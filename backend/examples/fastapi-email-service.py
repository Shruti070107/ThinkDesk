"""
FastAPI Email Service Example
Implements Gmail email integration using Gmail API
"""

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import httpx
import asyncio
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import os

app = FastAPI(title="ThinkDesk Email API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Email data models
class Email(BaseModel):
    id: str
    threadId: str
    from_: dict  # {name: str, email: str}
    to: List[str]
    subject: str
    snippet: str
    body: str
    receivedAt: datetime
    isRead: bool
    isStarred: bool
    labels: List[str]
    category: str
    extractedData: Optional[dict] = None
    suggestedActions: Optional[List[dict]] = None

    class Config:
        json_schema_extra = {
            "example": {
                "id": "email-123",
                "threadId": "thread-456",
                "from_": {"name": "John Doe", "email": "john@example.com"},
                "to": ["you@example.com"],
                "subject": "Meeting Request",
                "snippet": "Can we meet tomorrow?",
                "body": "Full email body...",
                "receivedAt": "2024-01-15T10:00:00",
                "isRead": False,
                "isStarred": False,
                "labels": ["INBOX"],
                "category": "meeting"
            }
        }

# WebSocket connections manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)

manager = ConnectionManager()

# Gmail OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")

SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
]

@app.get("/api/auth/google")
async def google_auth():
    """Initiate Google OAuth flow"""
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [GOOGLE_REDIRECT_URI],
            }
        },
        scopes=SCOPES,
    )
    flow.redirect_uri = GOOGLE_REDIRECT_URI
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    
    return {"auth_url": authorization_url, "state": state}

@app.get("/api/auth/google/callback")
async def google_callback(code: str, state: str):
    """Handle Google OAuth callback"""
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [GOOGLE_REDIRECT_URI],
            }
        },
        scopes=SCOPES,
    )
    flow.redirect_uri = GOOGLE_REDIRECT_URI
    
    flow.fetch_token(code=code)
    credentials = flow.credentials
    
    # Store credentials in database (implement your storage)
    # await save_user_credentials(user_id, credentials)
    
    return {"status": "success", "message": "Gmail connected"}

@app.get("/api/emails", response_model=List[Email])
async def get_emails(user_id: str = "default_user"):
    """Fetch emails from Gmail"""
    try:
        # Get user credentials from database
        # credentials = await get_user_credentials(user_id)
        
        # For demo, using mock data
        # In production, fetch from Gmail API
        emails = await fetch_gmail_emails(user_id)
        
        return emails
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def fetch_gmail_emails(user_id: str, max_results: int = 50) -> List[Email]:
    """Fetch emails from Gmail API"""
    # Get credentials from database
    # credentials = await get_user_credentials(user_id)
    # creds = Credentials.from_authorized_user_info(credentials)
    
    # service = build('gmail', 'v1', credentials=creds)
    
    # # List messages
    # results = service.users().messages().list(
    #     userId='me',
    #     maxResults=max_results,
    #     q='in:inbox'
    # ).execute()
    
    # messages = results.get('messages', [])
    
    # emails = []
    # for msg in messages:
    #     message = service.users().messages().get(
    #         userId='me',
    #         id=msg['id'],
    #         format='full'
    #     ).execute()
    #     emails.append(parse_gmail_message(message))
    
    # For now, return empty list (implement actual Gmail fetching)
    return []

def parse_gmail_message(gmail_message: dict) -> Email:
    """Parse Gmail message to Email model"""
    headers = {h['name'].lower(): h['value'] for h in gmail_message['payload']['headers']}
    
    return Email(
        id=gmail_message['id'],
        threadId=gmail_message['threadId'],
        from_={
            "name": extract_name(headers.get('from', '')),
            "email": extract_email(headers.get('from', ''))
        },
        to=[extract_email(to) for to in headers.get('to', '').split(',')],
        subject=headers.get('subject', ''),
        snippet=gmail_message.get('snippet', ''),
        body=decode_email_body(gmail_message['payload']),
        receivedAt=datetime.fromtimestamp(int(gmail_message['internalDate']) / 1000),
        isRead='UNREAD' not in gmail_message.get('labelIds', []),
        isStarred='STARRED' in gmail_message.get('labelIds', []),
        labels=gmail_message.get('labelIds', []),
        category='unclassified'  # Will be set by AI
    )

def extract_name(from_string: str) -> str:
    """Extract name from 'Name <email@example.com>' format"""
    import re
    match = re.match(r'^(.+?)\s*<.+>$', from_string)
    return match.group(1).strip('"\'') if match else from_string

def extract_email(from_string: str) -> str:
    """Extract email from 'Name <email@example.com>' format"""
    import re
    match = re.search(r'<(.+?)>', from_string)
    return match.group(1) if match else from_string

def decode_email_body(payload: dict) -> str:
    """Decode email body from Gmail format"""
    if 'body' in payload and 'data' in payload['body']:
        import base64
        return base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8')
    
    if 'parts' in payload:
        for part in payload['parts']:
            if part.get('mimeType') == 'text/plain' and 'body' in part and 'data' in part['body']:
                import base64
                return base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
    
    return ''

@app.websocket("/ws/emails/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time email updates"""
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(user_id)

async def poll_emails_periodically():
    """Background task to poll for new emails and send via WebSocket"""
    while True:
        await asyncio.sleep(30)  # Poll every 30 seconds
        
        # Get all connected users
        for user_id in manager.active_connections.keys():
            try:
                # Fetch new emails
                new_emails = await fetch_new_emails(user_id)
                
                if new_emails:
                    # Send to frontend via WebSocket
                    await manager.send_personal_message({
                        "type": "new_emails",
                        "emails": [email.dict() for email in new_emails]
                    }, user_id)
            except Exception as e:
                print(f"Error polling emails for {user_id}: {e}")

async def fetch_new_emails(user_id: str) -> List[Email]:
    """Fetch only new emails since last check"""
    # Implement logic to track last email ID and fetch only new ones
    return []

@app.on_event("startup")
async def startup_event():
    """Start background tasks on startup"""
    asyncio.create_task(poll_emails_periodically())

@app.post("/api/emails/{email_id}/read")
async def mark_as_read(email_id: str, user_id: str = "default_user"):
    """Mark email as read"""
    # Implement Gmail API call to mark as read
    return {"status": "success"}

@app.post("/api/emails/{email_id}/star")
async def toggle_star(email_id: str, user_id: str = "default_user"):
    """Toggle star on email"""
    # Implement Gmail API call to toggle star
    return {"status": "success"}

@app.post("/api/emails/send")
async def send_email(to: str, subject: str, body: str, user_id: str = "default_user"):
    """Send email via Gmail API"""
    # Implement Gmail API call to send email
    return {"status": "success", "message": "Email sent"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
