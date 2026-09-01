#!/bin/sh
# Wait for Rocket.Chat, create the first admin, register Custom OAuth "Alexol".
set -eu

apk add --no-cache curl jq >/dev/null

RC_URL="${RC_URL:-http://rocketchat:3000}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASS="${ADMIN_PASS:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@alexol.io}"
ADMIN_NAME="${ADMIN_NAME:-Alexol Admin}"
CLIENT_ID="${OAUTH_ROCKETCHAT_CLIENT_ID:-alexol-chat}"
CLIENT_SECRET="${OAUTH_ROCKETCHAT_CLIENT_SECRET:-}"
MAIL_PUBLIC_URL="${MAIL_PUBLIC_URL:-https://mail.alexol.io}"
ROOT_URL="${ROOT_URL:-https://chat.alexol.io}"
JITSI_DOMAIN="$(echo "${JITSI_PUBLIC_URL:-https://meet.alexol.io}" | sed -e 's|^https://||' -e 's|^http://||' -e 's|/.*||')"
JITSI_APP_ID="${JITSI_JWT_APP_ID:-alexol}"
JITSI_APP_SECRET="${JITSI_JWT_APP_SECRET:-}"

if [ -z "$ADMIN_PASS" ] || [ -z "$CLIENT_SECRET" ]; then
  echo "configure: ADMIN_PASS and OAUTH_ROCKETCHAT_CLIENT_SECRET are required"
  exit 1
fi

echo "configure: waiting for Rocket.Chat at $RC_URL"
i=0
while [ "$i" -lt 90 ]; do
  if curl -sf "$RC_URL/api/info" >/dev/null 2>&1; then
    echo "configure: API is up"
    break
  fi
  i=$((i + 1))
  sleep 4
done
if [ "$i" -ge 90 ]; then
  echo "configure: Rocket.Chat did not become ready"
  exit 1
fi

# Extra settle — first boot still compiles Meteor.
sleep 8

PASS_HASH="$(printf '%s' "$ADMIN_PASS" | sha256sum | awk '{print $1}')"

rc_login() {
  ident="$1"
  mode="${2:-}"
  body="$(jq -n --arg u "$ident" --arg p "$ADMIN_PASS" '{user:$u,password:$p}')"
  if [ "$mode" = "2fa" ]; then
    curl -sS -X POST "$RC_URL/api/v1/login" \
      -H "Content-Type: application/json" \
      -H "X-2FA-Code: $PASS_HASH" \
      -H "X-2FA-Method: password" \
      -d "$body" || true
  else
    curl -sS -X POST "$RC_URL/api/v1/login" \
      -H "Content-Type: application/json" \
      -d "$body" || true
  fi
}

try_login() {
  ident="$1"
  json="$(rc_login "$ident")"
  if echo "$json" | jq -e '.data.authToken' >/dev/null 2>&1; then
    echo "$json"
    return 0
  fi
  err="$(echo "$json" | jq -r '.error // .message // empty' 2>/dev/null || true)"
  echo "configure: login as $ident without 2FA: ${err:-no token}" >&2
  json="$(rc_login "$ident" 2fa)"
  if echo "$json" | jq -e '.data.authToken' >/dev/null 2>&1; then
    echo "$json"
    return 0
  fi
  err="$(echo "$json" | jq -r '.error // .message // empty' 2>/dev/null || true)"
  echo "configure: login as $ident with password 2FA: ${err:-no token}" >&2
  echo "$json"
  return 1
}

LOGIN_JSON="$(try_login "$ADMIN_USERNAME" || true)"
if ! echo "$LOGIN_JSON" | jq -e '.data.authToken' >/dev/null 2>&1; then
  if [ "$ADMIN_EMAIL" != "$ADMIN_USERNAME" ]; then
    LOGIN_JSON="$(try_login "$ADMIN_EMAIL" || true)"
  fi
fi
if ! echo "$LOGIN_JSON" | jq -e '.data.authToken' >/dev/null 2>&1; then
  err="$(echo "$LOGIN_JSON" | jq -r '.error // .message // empty' 2>/dev/null || true)"
  if [ "${RC_ADMIN_EXISTS:-0}" = "1" ]; then
    echo "configure: login failed ($err) — admin already exists, not registering another"
    echo "$LOGIN_JSON"
    exit 1
  fi
  case "$err" in
    error-unauthorized|error-invalid-email|error-invalid-password|error-login-blocked-for-user|totp-required)
      echo "configure: login failed ($err) — not registering another admin"
      echo "$LOGIN_JSON"
      exit 1
      ;;
  esac
  echo "configure: registering first admin $ADMIN_EMAIL"
  jq -n --arg u "$ADMIN_USERNAME" --arg e "$ADMIN_EMAIL" --arg p "$ADMIN_PASS" --arg n "$ADMIN_NAME" \
    '{username:$u,email:$e,pass:$p,name:$n}' \
    | curl -sS -X POST "$RC_URL/api/v1/users.register" \
      -H "Content-Type: application/json" \
      -d @- >/dev/null || true
  LOGIN_JSON="$(try_login "$ADMIN_USERNAME" || true)"
  if ! echo "$LOGIN_JSON" | jq -e '.data.authToken' >/dev/null 2>&1 && [ "$ADMIN_EMAIL" != "$ADMIN_USERNAME" ]; then
    LOGIN_JSON="$(try_login "$ADMIN_EMAIL" || true)"
  fi
fi

TOKEN="$(echo "$LOGIN_JSON" | jq -r '.data.authToken // empty')"
USER_ID="$(echo "$LOGIN_JSON" | jq -r '.data.userId // empty')"
if [ -z "$TOKEN" ] || [ -z "$USER_ID" ]; then
  echo "configure: login failed"
  echo "$LOGIN_JSON"
  exit 1
fi

auth() {
  curl -sS "$@" \
    -H "X-Auth-Token: $TOKEN" \
    -H "X-User-Id: $USER_ID" \
    -H "Content-Type: application/json"
}

# users.update / assets require password-2FA on Rocket.Chat 8.
auth2() {
  HASH="$(printf '%s' "$ADMIN_PASS" | sha256sum | awk '{print $1}')"
  curl -sS "$@" \
    -H "X-Auth-Token: $TOKEN" \
    -H "X-User-Id: $USER_ID" \
    -H "X-2FA-Code: $HASH" \
    -H "X-2FA-Method: password"
}

echo "configure: adding Custom OAuth service Alexol"
MSG='{"msg":"method","id":"1","method":"addOAuthService","params":["alexol"]}'
auth -X POST "$RC_URL/api/v1/method.call/addOAuthService" \
  -d "{\"message\":$(echo "$MSG" | jq -c -R .)}" >/dev/null || true

set_bool() {
  id="$1"
  value="$2"
  auth -X POST "$RC_URL/api/v1/settings/$id" -d "{\"value\":$value}" >/dev/null || true
}

set_string() {
  id="$1"
  value="$2"
  payload="$(jq -n --arg v "$value" '{value:$v}')"
  auth -X POST "$RC_URL/api/v1/settings/$id" -d "$payload" >/dev/null || true
}

MAIL="${MAIL_PUBLIC_URL%/}"

set_bool "Accounts_OAuth_Custom-Alexol" "true"
set_string "Accounts_OAuth_Custom-Alexol-url" "$MAIL"
set_string "Accounts_OAuth_Custom-Alexol-token_path" "/api/oauth/token"
set_string "Accounts_OAuth_Custom-Alexol-identity_path" "/api/oauth/userinfo"
set_string "Accounts_OAuth_Custom-Alexol-authorize_path" "/api/oauth/authorize"
set_string "Accounts_OAuth_Custom-Alexol-scope" "openid profile email"
set_string "Accounts_OAuth_Custom-Alexol-token_sent_via" "header"
set_string "Accounts_OAuth_Custom-Alexol-identity_token_sent_via" "header"
set_string "Accounts_OAuth_Custom-Alexol-access_token_param" "access_token"
set_string "Accounts_OAuth_Custom-Alexol-id" "$CLIENT_ID"
set_string "Accounts_OAuth_Custom-Alexol-secret" "$CLIENT_SECRET"
set_string "Accounts_OAuth_Custom-Alexol-login_style" "redirect"
set_string "Accounts_OAuth_Custom-Alexol-button_label_text" "Войти через Alexol"
set_string "Accounts_OAuth_Custom-Alexol-button_label_color" "#041018"
set_string "Accounts_OAuth_Custom-Alexol-button_color" "#06b6d4"
set_string "Accounts_OAuth_Custom-Alexol-key_field" "email"
set_string "Accounts_OAuth_Custom-Alexol-username_field" "username"
set_string "Accounts_OAuth_Custom-Alexol-email_field" "email"
set_string "Accounts_OAuth_Custom-Alexol-name_field" "name"
set_string "Accounts_OAuth_Custom-Alexol-avatar_field" "picture"
set_bool "Accounts_OAuth_Custom-Alexol-merge_users" "true"
set_bool "Accounts_OAuth_Custom-Alexol-show_button" "true"
set_bool "Accounts_RegistrationAuthenticationServicesEnabled" "true"
set_bool "Register_Server" "true"
set_bool "Cloud_Service_Agree_PrivacyTerms" "true"
set_string "Accounts_RegistrationForm" "Disabled"
set_string "Site_Url" "$ROOT_URL"
set_string "Site_Name" "Alexol"
set_string "DeepLink_Url" "$ROOT_URL"
set_bool "UI_Use_Real_Name" "true"
set_bool "Accounts_AllowUserAvatarChange" "true"
set_bool "Accounts_RequireEmailVerification" "false"
set_bool "Accounts_EmailVerification" "false"
set_bool "Accounts_Verify_Email_For_External_Accounts" "false"
set_bool "Accounts_AllowPasswordChangeForOAuthUsers" "false"
# Mail already authenticated the user. Do not email a second 2FA code after SSO.
set_bool "Accounts_twoFactorAuthentication_email_available_for_OAuth_users" "false"
set_bool "Accounts_TwoFactorAuthentication_By_Email_Auto_Opt_In" "false"
set_bool "Iframe_Restrict_Access" "false"
set_bool "Message_Read_Receipt_Enabled" "true"
set_bool "Message_Read_Receipt_StoreUsers" "false"
set_bool "Push_enable" "true"
set_bool "Push_enable_gateway" "true"
set_bool "Accounts_CustomFieldsEnable" "true"
set_string "Accounts_CustomFields" '{"phone":{"type":"text","required":false,"maxLength":40},"telegram":{"type":"text","required":false,"maxLength":64},"jobTitle":{"type":"text","required":false,"maxLength":80}}'
set_string "VideoConf_Default_Provider" "jitsi"

# Custom Jitsi open/closed picker removed — native Video Call only.
payload="$(jq -n --arg s '' '{value:$s}')"
auth -X POST "$RC_URL/api/v1/settings/Custom_Script_Logged_In" -d "$payload" >/dev/null || true
# Drop login overlay / custom CSS left from earlier branding experiments.
payload="$(jq -n --arg s '' '{value:$s}')"
auth -X POST "$RC_URL/api/v1/settings/Custom_Script_Logged_Out" -d "$payload" >/dev/null || true
auth -X POST "$RC_URL/api/v1/settings/theme-custom-css" -d "$payload" >/dev/null || true
auth -X POST "$RC_URL/api/v1/settings/css" -d "$payload" >/dev/null || true
set_bool "Layout_Login_Hide_Logo" "false"
set_bool "Layout_Login_Hide_Title" "false"
set_bool "Layout_Login_Hide_Powered_By" "false"
set_string "Layout_Login_Terms" ""
set_string "Layout_Sidenav_Footer" ""
set_string "Layout_Sidenav_Footer_Dark" ""
HASH="$(printf '%s' "$ADMIN_PASS" | sha256sum | awk '{print $1}')"
for asset in logo favicon logo_dark; do
  curl -sS -X POST "$RC_URL/api/v1/assets.unsetAsset" \
    -H "X-Auth-Token: $TOKEN" \
    -H "X-User-Id: $USER_ID" \
    -H "X-2FA-Code: $HASH" \
    -H "X-2FA-Method: password" \
    -H "Content-Type: application/json" \
    -d "{\"assetName\":\"$asset\"}" >/dev/null || true
done
echo "configure: login and sidebar branding cleared"

offset=0
while [ "$offset" -lt 500 ]; do
  page="$(auth "$RC_URL/api/v1/users.list?count=100&offset=$offset" || echo '{}')"
  ids="$(echo "$page" | jq -r '.users[]?._id // empty')"
  [ -z "$ids" ] && break
  echo "$ids" | while read -r uid; do
    [ -z "$uid" ] && continue
    payload="$(jq -n --arg id "$uid" '{userId:$id,data:{verified:true,requirePasswordChange:false}}')"
    auth2 -X POST "$RC_URL/api/v1/users.update" \
      -H "Content-Type: application/json" \
      -d "$payload" >/dev/null || true
  done
  count="$(echo "$page" | jq -r '.count // 0')"
  [ "$count" -lt 100 ] && break
  offset=$((offset + 100))
done
echo "configure: mailbox/OAuth users marked verified (no reset-password trap)"

# Built-in Jitsi keys (ignored if the workspace uses the Marketplace app instead).
set_bool "Jitsi_Enabled" "true"
set_string "Jitsi_Domain" "$JITSI_DOMAIN"
set_bool "Jitsi_SSL" "true"
set_bool "Jitsi_Enable_JWT" "true"
set_string "Jitsi_Application_ID" "$JITSI_APP_ID"
if [ -n "$JITSI_APP_SECRET" ]; then
  set_string "Jitsi_Application_Secret" "$JITSI_APP_SECRET"
fi
set_bool "Jitsi_Limit_Token_To_Room" "true"

# LDAP: same mailbox password on the Rocket.Chat login form.
LDAP_HOST="${MAIL_LDAP_HOST:-host.docker.internal}"
LDAP_PORT="${MAIL_LDAP_PORT:-389}"
LDAP_BIND_DN="${MAIL_LDAP_BIND_DN:-admin@alexol.io}"
LDAP_BIND_PASSWORD="${MAIL_LDAP_BIND_PASSWORD:-}"
LDAP_BASE_DN="${MAIL_LDAP_BASE_DN:-dc=alexol,dc=io}"

set_int() {
  id="$1"
  value="$2"
  auth -X POST "$RC_URL/api/v1/settings/$id" -d "{\"value\":$value}" >/dev/null || true
}

if [ -n "$LDAP_BIND_PASSWORD" ]; then
  echo "configure: enabling LDAP against $LDAP_HOST:$LDAP_PORT ($LDAP_BASE_DN)"
  set_string "LDAP_Server_Type" ""
  set_string "LDAP_Host" "$LDAP_HOST"
  set_int "LDAP_Port" "$LDAP_PORT"
  set_bool "LDAP_Reconnect" "true"
  set_bool "LDAP_Login_Fallback" "true"
  set_bool "LDAP_Authentication" "true"
  set_string "LDAP_Authentication_UserDN" "$LDAP_BIND_DN"
  set_string "LDAP_Authentication_Password" "$LDAP_BIND_PASSWORD"
  set_string "LDAP_Encryption" "plain"
  set_int "LDAP_Connect_Timeout" "10000"
  set_int "LDAP_Timeout" "60000"
  set_string "LDAP_BaseDN" "$LDAP_BASE_DN"
  set_string "LDAP_User_Search_Filter" "(objectclass=inetOrgPerson)"
  set_string "LDAP_User_Search_Scope" "sub"
  set_string "LDAP_User_Search_Field" "uid,mail,sAMAccountName"
  set_int "LDAP_Search_Page_Size" "0"
  set_string "LDAP_Unique_Identifier_Field" "mail,uid"
  set_bool "LDAP_Merge_Existing_Users" "true"
  set_bool "LDAP_Update_Data_On_Login" "true"
  set_string "LDAP_Default_Domain" "alexol.io"
  set_string "LDAP_Username_Field" "uid"
  set_string "LDAP_Email_Field" "mail"
  set_string "LDAP_Name_Field" "cn"
  set_bool "LDAP_Sync_User_Avatar" "true"
  set_string "LDAP_Avatar_Field" "jpegPhoto"
  set_bool "LDAP_Enable" "true"
  echo "configure: LDAP is ready — form login uses mailbox passwords"
else
  echo "configure: LDAP skipped (set MAIL_LDAP_BIND_PASSWORD — deploy stitches it from MAIL_ENV DEFAULT_ADMIN_PASSWORD)"
fi

SMTP_HOST="${SMTP_HOST:-mail.alexol.io}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USERNAME="${SMTP_USERNAME:-chat@alexol.io}"
SMTP_PASSWORD="${SMTP_PASSWORD:-}"
FROM_EMAIL="${FROM_EMAIL:-Support Chat <chat@alexol.io>}"
SMTP_PROTOCOL="${SMTP_PROTOCOL:-smtp}"

if [ -n "$SMTP_PASSWORD" ]; then
  echo "configure: SMTP From=$FROM_EMAIL via $SMTP_HOST:$SMTP_PORT"
  set_string "SMTP_Protocol" "$SMTP_PROTOCOL"
  set_string "SMTP_Host" "$SMTP_HOST"
  set_int "SMTP_Port" "$SMTP_PORT"
  set_bool "SMTP_IgnoreTLS" "false"
  set_bool "SMTP_Pool" "true"
  set_string "SMTP_Username" "$SMTP_USERNAME"
  set_string "SMTP_Password" "$SMTP_PASSWORD"
  set_string "From_Email" "$FROM_EMAIL"
else
  echo "configure: SMTP skipped (set SMTP_PASSWORD in ROCKET_ENV — mailbox chat@alexol.io)"
fi

echo "configure: Custom OAuth Alexol is ready"
echo "configure: Jitsi app still needs Marketplace install — Domain=$JITSI_DOMAIN AppID=$JITSI_APP_ID"
exit 0
