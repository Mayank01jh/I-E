"""
Alert Dispatcher — Twilio (WhatsApp) + Resend (Email)
=======================================================
Falls back to console mock logging when SDK keys / packages
are not yet installed, so the rest of the platform keeps
working without real credentials.
"""
import os

TWILIO_ACCOUNT_SID   = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN    = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER   = os.environ.get("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")
RESEND_API_KEY       = os.environ.get("RESEND_API_KEY", "")
ALERT_FROM_EMAIL     = os.environ.get("ALERT_FROM_EMAIL", "alerts@yourdomain.com")


def _safe_print(text: str):
    safe_text = text.replace("₹", "Rs.").replace("—", "-").replace("➜", "->")
    try:
        print(safe_text)
    except UnicodeEncodeError:
        try:
            print(safe_text.encode('cp1252', errors='replace').decode('cp1252'))
        except Exception:
            print(safe_text.encode('ascii', errors='replace').decode('ascii'))


def send_whatsapp_alert(to_number: str, message: str) -> dict:
    """Dispatches a WhatsApp message via Twilio Sandbox.
    Prints a mock log when credentials are missing."""
    if not to_number:
        return {"status": "skipped", "reason": "no whatsapp number provided"}

    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        try:
            from twilio.rest import Client  # type: ignore
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            msg = client.messages.create(
                from_=TWILIO_FROM_NUMBER,
                body=message,
                to=f"whatsapp:{to_number}" if not to_number.startswith("whatsapp:") else to_number,
            )
            return {"status": "success", "sid": msg.sid}
        except ImportError:
            pass
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    # --- Mock fallback ---
    _safe_print(f"\n[WhatsApp MOCK] -> {to_number}")
    _safe_print(f"  {message}\n")
    return {"status": "mock_sent", "to": to_number, "message": message}


def send_email_alert(to_email: str, subject: str, html_content: str) -> dict:
    """Dispatches an email via Resend.
    Prints a mock log when credentials are missing."""
    if not to_email:
        return {"status": "skipped", "reason": "no email provided"}

    if RESEND_API_KEY:
        try:
            import resend  # type: ignore
            resend.api_key = RESEND_API_KEY
            params = {
                "from": f"I & E Alerts <{ALERT_FROM_EMAIL}>",
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            }
            email = resend.Emails.send(params)
            return {"status": "success", "id": getattr(email, "id", str(email))}
        except ImportError:
            pass
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    # --- Mock fallback ---
    _safe_print(f"\n[Email MOCK] -> {to_email}")
    _safe_print(f"  Subject : {subject}")
    _safe_print(f"  Content : {html_content[:120]}...\n")
    return {"status": "mock_sent", "to": to_email, "subject": subject}
