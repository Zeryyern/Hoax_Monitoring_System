import hashlib
import secrets
import hmac
import json
import base64
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
from config import SECRET_KEY, TOKEN_EXPIRY_HOURS
from database import get_connection, dict_from_row

# ===============================
# PASSWORD HANDLING
# ===============================

def hash_password(password: str) -> str:
    """Hash a password with salt"""
    salt = secrets.token_hex(32)
    hash_obj = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}${hash_obj.hex()}"

def verify_password(password: str, hash_value: str) -> bool:
    """Verify a password against its hash"""
    try:
        salt, hash_hex = hash_value.split('$')
        hash_obj = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return hash_obj.hex() == hash_hex
    except Exception:
        return False

# ===============================
# JWT TOKEN HANDLING
# ===============================

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')

def _b64url_decode(data: str) -> bytes:
    padding = '=' * ((4 - len(data) % 4) % 4)
    return base64.urlsafe_b64decode((data + padding).encode('ascii'))

def _jwt_encode(payload: dict, secret: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = _b64url_encode(json.dumps(header, separators=(',', ':')).encode('utf-8'))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(',', ':')).encode('utf-8'))
    signing_input = f"{header_b64}.{payload_b64}".encode('ascii')
    signature = hmac.new(secret.encode('utf-8'), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{sig_b64}"

def _jwt_decode(token: str, secret: str) -> dict:
    parts = token.split('.')
    if len(parts) != 3:
        raise ValueError("Invalid token format")

    header_b64, payload_b64, sig_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode('ascii')
    expected_sig = hmac.new(secret.encode('utf-8'), signing_input, hashlib.sha256).digest()
    received_sig = _b64url_decode(sig_b64)

    if not hmac.compare_digest(expected_sig, received_sig):
        raise ValueError("Invalid token signature")

    payload = json.loads(_b64url_decode(payload_b64).decode('utf-8'))
    exp = payload.get('exp')
    if exp is None:
        raise ValueError("Invalid token payload")

    if datetime.utcnow().timestamp() > float(exp):
        raise TimeoutError("Token expired")

    return payload

def create_token(user_id: int, username: str, role: str) -> str:
    """Create JWT token for user"""
    iat = int(datetime.utcnow().timestamp())
    exp = int((datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS)).timestamp())
    payload = {
        'user_id': user_id,
        'username': username,
        'role': role,
        'iat': iat,
        'exp': exp
    }
    return _jwt_encode(payload, SECRET_KEY)

def verify_token(token: str) -> dict:
    """Verify JWT token and return payload"""
    try:
        return _jwt_decode(token, SECRET_KEY)
    except TimeoutError:
        return {'error': 'Token expired'}
    except Exception:
        return {'error': 'Invalid token'}

# ===============================
# AUTHENTICATION DECORATORS
# ===============================

def token_required(f):
    """Decorator to check if valid token is provided"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'status': 'error', 'message': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'status': 'error', 'message': 'Token is missing'}), 401
        
        payload = verify_token(token)
        if 'error' in payload:
            return jsonify({'status': 'error', 'message': payload['error']}), 401
        
        request.current_user = payload
        return f(*args, **kwargs)
    
    return decorated

def admin_required(f):
    """Decorator to check if user is admin"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'status': 'error', 'message': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'status': 'error', 'message': 'Token is missing'}), 401
        
        payload = verify_token(token)
        if 'error' in payload:
            return jsonify({'status': 'error', 'message': payload['error']}), 401
        
        if payload.get('role') != 'admin':
            return jsonify({'status': 'error', 'message': 'Admin access required'}), 403
        
        request.current_user = payload
        return f(*args, **kwargs)
    
    return decorated

# ===============================
# USER MANAGEMENT
# ===============================

def get_user_by_id(user_id: int) -> dict:
    """Get user by ID"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email, role, created_at FROM users WHERE id = ?", (user_id,))
    user = dict_from_row(cursor.fetchone())
    conn.close()
    return user

def get_user_by_email(email: str) -> dict:
    """Get user by email"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email, role, password_hash, is_active, created_at FROM users WHERE email = ?", (email,))
    user = dict_from_row(cursor.fetchone())
    conn.close()
    return user

def get_user_by_username(username: str) -> dict:
    """Get user by username"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email, role, password_hash, is_active, created_at FROM users WHERE username = ?", (username,))
    user = dict_from_row(cursor.fetchone())
    conn.close()
    return user

def create_user(username: str, email: str, password: str, role: str = 'user') -> tuple:
    """Create new user. Returns (success_bool, user_dict, error_message)"""
    
    # Validation
    if not all([username, email, password]):
        return False, None, "Missing required fields"
    
    if len(password) < 8:
        return False, None, "Password must be at least 8 characters"
    
    # Check if user already exists
    if get_user_by_email(email):
        return False, None, "Email already registered"
    
    if get_user_by_username(username):
        return False, None, "Username already taken"
    
    # Create user
    password_hash = hash_password(password)
    
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO users (username, email, password_hash, role)
            VALUES (?, ?, ?, ?)
        """, (username, email, password_hash, role))
        
        conn.commit()
        user_id = cursor.lastrowid
        
        user = get_user_by_id(user_id)
        return True, user, None
        
    except Exception as e:
        conn.rollback()
        return False, None, str(e)
    finally:
        conn.close()

def authenticate_user(email: str, password: str) -> tuple:
    """Authenticate user. Returns (success_bool, token, user_dict, error_message)"""
    
    user = get_user_by_email(email)
    
    if not user:
        return False, None, None, "Invalid email or password"
    
    if not user.get('is_active'):
        return False, None, None, "Account is deactivated"
    
    if not verify_password(password, user.get('password_hash', '')):
        return False, None, None, "Invalid email or password"
    
    token = create_token(user['id'], user['username'], user['role'])
    user_response = {
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'role': user['role']
    }
    
    return True, token, user_response, None

def log_admin_action(admin_id: int, action: str, details: str = None):
    """Log admin action"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO admin_logs (admin_id, action, details)
            VALUES (?, ?, ?)
        """, (admin_id, action, details))
        conn.commit()
    finally:
        conn.close()
