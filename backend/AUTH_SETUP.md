# PeopleOS authentication environment variables

Set these on the FastAPI/Render backend:

PEOPLEOS_ADMIN_EMAIL=your-admin-email@example.com
PEOPLEOS_ADMIN_PASSWORD=use-a-strong-unique-password
PEOPLEOS_JWT_SECRET=use-a-long-random-secret
PEOPLEOS_SESSION_TTL_SECONDS=28800

The first startup creates the admin user if that email does not already exist. The password is stored as a salted PBKDF2-HMAC-SHA256 hash.

Do not commit the real values to GitHub.
