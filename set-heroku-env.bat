@echo off
echo Setting Heroku environment variables for NLOMS...

REM Replace 'your-app-name' with your actual Heroku app name
set APP_NAME=nloms-backend
echo Setting core configuration...
heroku config:set NODE_ENV=production -a %APP_NAME%
heroku config:set PORT=8080 -a %APP_NAME%
heroku config:set API_VERSION=v1 -a %APP_NAME%

echo Setting JWT configuration...
heroku config:set JWT_SECRET=nloms2025-cameroon-land-management-secure-jwt-secret-key-nebota-ismael-production -a %APP_NAME%
heroku config:set JWT_EXPIRES_IN=24h -a %APP_NAME%
heroku config:set JWT_REFRESH_SECRET=nloms2025-cameroon-refresh-token-secret-key-land-ownership-system-secure -a %APP_NAME%
heroku config:set JWT_REFRESH_EXPIRES_IN=7d -a %APP_NAME%

echo Setting database configuration...
heroku config:set DB_POOL_MIN=2 -a %APP_NAME%
heroku config:set DB_POOL_MAX=20 -a %APP_NAME%
heroku config:set DB_CONNECTION_TIMEOUT=2000 -a %APP_NAME%
heroku config:set DB_IDLE_TIMEOUT=30000 -a %APP_NAME%

echo Setting application URLs...
heroku config:set APP_NAME=NLOMS -a %APP_NAME%
heroku config:set APP_URL=https://%APP_NAME%.herokuapp.com -a %APP_NAME%
heroku config:set ADMIN_EMAIL=admin@nloms.gov.cm -a %APP_NAME%

echo Setting security configuration...
heroku config:set BCRYPT_ROUNDS=12 -a %APP_NAME%
heroku config:set SESSION_SECRET=nloms-session-secret-cameroon-land-management-2025-secure -a %APP_NAME%
heroku config:set RATE_LIMIT_WINDOW_MS=900000 -a %APP_NAME%
heroku config:set RATE_LIMIT_MAX_REQUESTS=100 -a %APP_NAME%
heroku config:set RATE_LIMIT_AUTH_MAX=5 -a %APP_NAME%

echo Setting file upload configuration...
heroku config:set MAX_FILE_SIZE_MB=10 -a %APP_NAME%
heroku config:set ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx -a %APP_NAME%
heroku config:set UPLOAD_FOLDER=uploads -a %APP_NAME%

echo Setting feature flags...
heroku config:set ENABLE_EMAIL_VERIFICATION=true -a %APP_NAME%
heroku config:set ENABLE_SMS_NOTIFICATIONS=false -a %APP_NAME%
heroku config:set ENABLE_AUDIT_LOGGING=true -a %APP_NAME%
heroku config:set ENABLE_RATE_LIMITING=true -a %APP_NAME%
heroku config:set ENABLE_CORS=true -a %APP_NAME%

echo Setting logging configuration...
heroku config:set LOG_LEVEL=info -a %APP_NAME%
heroku config:set LOG_FILE_MAX_SIZE=10485760 -a %APP_NAME%
heroku config:set LOG_FILE_MAX_FILES=5 -a %APP_NAME%

echo.
echo ===============================================
echo IMPORTANT: You still need to manually set:
echo ===============================================
echo 1. CLOUDINARY_API_KEY (your actual API key)
echo 2. CLOUDINARY_API_SECRET (your actual secret)
echo 3. SMTP_PASS (your actual email app password)
echo 4. FRONTEND_URL (your frontend app URL)
echo.
echo Example commands:
echo heroku config:set CLOUDINARY_API_KEY=your-actual-key -a %APP_NAME%
echo heroku config:set CLOUDINARY_API_SECRET=your-actual-secret -a %APP_NAME%
echo heroku config:set SMTP_PASS=your-actual-password -a %APP_NAME%
echo heroku config:set FRONTEND_URL=https://your-frontend.herokuapp.com -a %APP_NAME%
echo.
echo Environment variables have been set successfully!
echo.
echo To check database addon status:
echo heroku addons -a %APP_NAME%
echo.
echo To view database URL:
echo heroku config:get DATABASE_URL -a %APP_NAME%
echo.
echo To view all config vars: heroku config -a %APP_NAME%
echo.
echo If DATABASE_URL is missing, ensure PostgreSQL addon is attached:
echo heroku addons:create heroku-postgresql:hobby-dev -a %APP_NAME%
