"""
Email service for notifications.
"""
import os
import logging
import smtplib
from typing import Optional, List
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication

logger = logging.getLogger(__name__)


class EmailService:
    """Email service for sending notifications."""

    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@driverguard.ai")
        self.use_tls = os.getenv("SMTP_TLS", "true").lower() == "true"
        
        self._configured = bool(self.smtp_host and self.smtp_user and self.smtp_password)

    def is_configured(self) -> bool:
        """Check if email service is properly configured."""
        return self._configured

    def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        attachments: Optional[List[tuple]] = None,
    ) -> bool:
        """
        Send an email.
        
        Args:
            to: Recipient email address
            subject: Email subject
            body: Plain text body
            html_body: Optional HTML body
            attachments: Optional list of (filename, content, mimetype) tuples
        """
        if not self._configured:
            logger.warning("Email service not configured, skipping email send")
            return False

        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = self.from_email
            msg['To'] = to
            msg['Subject'] = subject

            # Plain text part
            msg.attach(MIMEText(body, 'plain'))

            # HTML part if provided
            if html_body:
                msg.attach(MIMEText(html_body, 'html'))

            # Attachments
            if attachments:
                for filename, content, mimetype in attachments:
                    attachment = MIMEApplication(content, _subtype=mimetype.split('/')[-1])
                    attachment.add_header('Content-Disposition', 'attachment', filename=filename)
                    msg.attach(attachment)

            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.use_tls:
                    server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            logger.info(f"Email sent to {to}: {subject}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to}: {e}")
            return False

    def send_driver_invitation(
        self,
        to: str,
        driver_name: str,
        invitation_link: str,
        company_name: str,
    ) -> bool:
        """Send driver invitation email."""
        subject = f"Invitation to join {company_name} on DriverGuard AI"
        body = f"""
Hello {driver_name},

You have been invited to join {company_name} on DriverGuard AI.

Click the link below to set up your driver account:
{invitation_link}

This link will expire in 7 days.

Best regards,
The DriverGuard AI Team
        """
        html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a2e;">DriverGuard AI</h2>
        <p>Hello <strong>{driver_name}</strong>,</p>
        <p>You have been invited to join <strong>{company_name}</strong> on DriverGuard AI.</p>
        <p style="text-align: center; margin: 30px 0;">
            <a href="{invitation_link}" style="background-color: #00d4aa; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Accept Invitation
            </a>
        </p>
        <p>This link will expire in 7 days.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Best regards,<br>The DriverGuard AI Team</p>
    </div>
</body>
</html>
        """
        return self.send_email(to, subject, body, html_body)

    def send_ride_report(
        self,
        to: str,
        driver_name: str,
        ride_summary: dict,
        pdf_bytes: Optional[bytes] = None,
    ) -> bool:
        """Send ride summary report email."""
        subject = f"Ride Safety Report - {driver_name}"
        body = f"""
Hello {driver_name},

Your ride safety report is ready.

Safety Score: {ride_summary.get('final_score', 'N/A')}/100 ({ride_summary.get('grade', 'N/A')})
Total Events: {ride_summary.get('total_events', 0)}
Distracted Duration: {ride_summary.get('total_distracted_duration', 0)}s

View the full report in the DriverGuard AI dashboard.

Best regards,
The DriverGuard AI Team
        """
        attachments = None
        if pdf_bytes:
            attachments = [("ride_report.pdf", pdf_bytes, "application/pdf")]
        
        return self.send_email(to, subject, body, attachments=attachments)

    def send_safety_alert(
        self,
        to: str,
        driver_name: str,
        alert_type: str,
        vehicle: str,
        timestamp: str,
    ) -> bool:
        """Send safety alert notification."""
        subject = f"Safety Alert: {alert_type} - {driver_name}"
        body = f"""
SAFETY ALERT

Driver: {driver_name}
Vehicle: {vehicle}
Alert Type: {alert_type}
Time: {timestamp}

Please check the DriverGuard AI dashboard for details.

DriverGuard AI Safety System
        """
        return self.send_email(to, subject, body)


# Global instance
email_service = EmailService()