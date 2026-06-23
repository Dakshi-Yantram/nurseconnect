import asyncio
import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr
from app.core.config import settings

logger = logging.getLogger(__name__)

def _send_message(message: EmailMessage) -> None:
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
        if settings.SMTP_USE_TLS:
            smtp.starttls()
        if settings.SMTP_USERNAME:
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        smtp.send_message(message)

async def send_verification_email(email: str, code: str) -> None:
    if settings.EMAIL_DEV_MODE or not settings.SMTP_HOST:
        logger.info("DEV email verification email=%s code=%s", email, code)
        return
    message = EmailMessage()
    message["Subject"] = "Verify your NurseConnect account"
    message["From"] = formataddr((settings.SMTP_FROM_NAME, settings.SMTP_FROM_EMAIL))
    message["To"] = email
    message.set_content(
        f"Your verification code is: {code}\n\n"
        f"This code expires in {settings.EMAIL_VERIFICATION_EXPIRE_MINUTES} minutes."
    )
    await asyncio.to_thread(_send_message, message)