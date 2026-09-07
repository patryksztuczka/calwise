# Auth

Who the caller is. Covers creating an account, signing in and out, and the session that identifies a signed-in user on every request.

## Language

**Account**:
An email address with a password. Creating one needs nothing else, and there is no verification step: the account is usable immediately.
_Avoid_: User record, Login

**Sign up**:
Creating an account. It also signs the new account in.
_Avoid_: Register, Create user

**Sign in**:
Proving ownership of an account with its email and password, which starts a session.
_Avoid_: Log in, Authenticate

**Session**:
The signed-in state a browser keeps in a cookie. A request with a valid session identifies its caller; a request without one is anonymous.
_Avoid_: Token, Auth state

**Anonymous**:
A caller without a session. Anonymous visitors only see the sign-in and sign-up screens and the greeting smoke test.
_Avoid_: Guest, Logged out
