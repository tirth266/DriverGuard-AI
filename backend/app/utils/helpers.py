import re

def is_valid_email(email: str) -> bool:
    """Validates email format."""
    if not email or not isinstance(email, str):
        return False
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return bool(re.match(pattern, email.strip()))

def sanitize_string(val: str) -> str:
    """Sanitizes input strings."""
    if not val or not isinstance(val, str):
        return ''
    return val.strip()
