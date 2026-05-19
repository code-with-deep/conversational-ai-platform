import logging
import re
from pathlib import Path

from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def send_email(
    email_to: str,
    subject: str,
    html_content: str,
) -> None:
    settings = get_settings()

    if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password:
        if settings.email_mock_enabled and not settings.is_production:
            await _mock_send_email(email_to, subject, html_content)
            return
        raise RuntimeError("SMTP credentials are not configured")

    try:
        import aiosmtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        sender_email = settings.emails_from_email or settings.smtp_user
        message = MIMEMultipart()
        message["From"] = f"{settings.emails_from_name} <{sender_email}>"
        message["To"] = email_to
        message["Subject"] = subject
        message.attach(MIMEText(html_content, "html", "utf-8"))

        password = settings.smtp_password
        if settings.smtp_host.lower() == "smtp.gmail.com":
            # Gmail App Password is displayed in 4x4 blocks; spaces are not part of the secret.
            password = password.replace(" ", "")
            if len(password) != 16:
                raise RuntimeError(
                    "Gmail SMTP requires a 16-character App Password. "
                    "Generate one in Google Account Security and set SMTP_PASSWORD."
                )

        use_tls = settings.smtp_port == 465
        start_tls = settings.smtp_port == 587 and settings.smtp_use_tls

        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=password,
            use_tls=use_tls,
            start_tls=start_tls,
            timeout=settings.smtp_timeout_seconds,
        )
        logger.info("Email sent to %s with subject '%s'", email_to, subject)
    except ModuleNotFoundError as exc:
        if exc.name == "aiosmtplib":
            raise RuntimeError(
                "Email service dependency missing: install `aiosmtplib` in the backend environment."
            ) from exc
        raise
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", email_to, exc)
        if settings.email_mock_enabled and not settings.is_production:
            await _mock_send_email(email_to, subject, html_content)
            return
        if isinstance(exc, RuntimeError):
            raise exc
        raise RuntimeError("Unable to send password reset email right now. Please try again later.") from exc


async def _mock_send_email(email_to: str, subject: str, html_content: str) -> None:
    log_dir = Path("logs/emails")
    log_dir.mkdir(parents=True, exist_ok=True)

    from datetime import datetime

    safe_recipient = re.sub(r"[^a-zA-Z0-9_.-]", "_", email_to)
    filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{safe_recipient}.html"
    file_path = log_dir / filename

    with open(file_path, "w", encoding="utf-8") as handle:
        handle.write(f"To: {email_to}\nSubject: {subject}\n\n{html_content}")

    logger.info("Mock email saved to %s", file_path)


async def send_reset_password_email(email_to: str, token: str) -> None:
    settings = get_settings()
    reset_link = f"{settings.frontend_url}/reset-password?token={token}"

    subject = f"Reset your password - {settings.app_name}"
    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#080c14;">
  <div style="max-width:560px;margin:40px auto;background:#0f172a;border:1px solid rgba(51,65,85,0.4);border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;">Password Reset</h1>
    </div>
    <div style="padding:32px 24px;">
      <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin-top:0;">
        We received a request to reset your password. Click the button below to create a new one:
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="{reset_link}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;font-size:14px;">
          Reset Password
        </a>
      </div>
      <p style="color:#64748b;font-size:13px;line-height:1.5;">
        If the button does not work, copy and paste this link into your browser:
      </p>
      <p style="color:#6366f1;font-size:12px;word-break:break-all;">{reset_link}</p>
      <hr style="border:none;border-top:1px solid rgba(51,65,85,0.3);margin:24px 0;">
      <p style="color:#475569;font-size:12px;line-height:1.5;margin-bottom:0;">
        This link expires in {settings.reset_token_expire_minutes} minutes. If you did not request this, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>"""
    await send_email(email_to, subject, html_content)
