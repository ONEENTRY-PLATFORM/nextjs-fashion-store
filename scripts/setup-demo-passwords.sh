#!/usr/bin/env bash
# setup-demo-passwords.sh
# ----------------------------------------------------------------------------
# One-shot dev utility: assigns a known bcrypt hash of the password "demo123"
# to every user with identifier "seed-demo-user-*" in the local CMS database.
#
# Why:
#   The demo seed leaves `password_hash = NULL` so users cannot log in via
#   the `/users-auth-providers/marker/email/users/auth` endpoint. This script
#   makes the 10 demo users instantly usable from the playground UI for QA
#   without touching backend code.
#
# Re-run safe: just sets the same hash again. Does not touch production DBs —
# only the local docker container `cms-sb-db` with database
# `test_db_dataset_clean` is targeted.
#
# Usage:
#   ./scripts/setup-demo-passwords.sh
#
# Configuration (override via env vars if needed):
#   DB_CONTAINER     default: cms-sb-db
#   DB_USER          default: postgres
#   DB_NAME          default: test_db_dataset_clean
#   DEMO_PASSWORD    default: demo123
#   BACKEND_CONTAINER default: cms-backend-clean (used to compute bcrypt hash)
# ----------------------------------------------------------------------------

set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-cms-sb-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-test_db_dataset_clean}"
DEMO_PASSWORD="${DEMO_PASSWORD:-demo123}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-cms-backend-clean}"

if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo "[setup-demo-passwords] DB container '${DB_CONTAINER}' is not running" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${BACKEND_CONTAINER}$"; then
  echo "[setup-demo-passwords] Backend container '${BACKEND_CONTAINER}' is not running" >&2
  echo "[setup-demo-passwords] Need it to compute the bcrypt hash (uses native bcrypt available there)" >&2
  exit 1
fi

echo "[setup-demo-passwords] Computing bcrypt(${DEMO_PASSWORD})..."
HASH="$(docker exec "${BACKEND_CONTAINER}" node -e \
  "const b=require('bcrypt'); console.log(b.hashSync('${DEMO_PASSWORD}', 10))")"

if [[ -z "${HASH}" ]]; then
  echo "[setup-demo-passwords] Failed to compute bcrypt hash" >&2
  exit 1
fi

echo "[setup-demo-passwords] Updating users.password_hash for seed-demo-user-*..."
docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 \
  -c "UPDATE users SET password_hash = '${HASH}' WHERE identifier LIKE 'seed-demo-user-%';"

echo "[setup-demo-passwords] Ensuring email auth provider + login form exist..."
# Idempotent bootstrap of:
#   1. users_auth_providers row (identifier=email, type=email)
#   2. attributes_sets row with login/password markers (isLogin/isPassword)
#   3. forms row pointing at that attribute set
#   4. attaches users_auth_providers.form_id and users.auth_provider_id
# Without all four, the CMS endpoint
# /api/content/users-auth-providers/marker/email/users/auth returns
# "Define an auth provider" / "form is not defined".
docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO users_auth_providers (identifier, type, is_active, is_check_code, user_group_id)
VALUES ('email', 'email', true, false, 1)
ON CONFLICT DO NOTHING;

WITH set_ins AS (
  INSERT INTO attributes_sets (identifier, type_id, is_visible, schema, title)
  VALUES (
    'auth_email_set',
    (SELECT id FROM attribute_set_types WHERE type = 'forForms'),
    true,
    '{"login":{"id":1,"identifier":"login","type":"string","isLogin":true},"password":{"id":2,"identifier":"password","type":"string","isPassword":true}}'::jsonb,
    'Email login attribute set'
  )
  ON CONFLICT (identifier) DO UPDATE SET schema = EXCLUDED.schema
  RETURNING id
),
form_ins AS (
  INSERT INTO forms (identifier, attribute_set_id, processing_type, attributes_sets)
  SELECT 'auth_email_form', id, 'system', '{}'::json FROM set_ins
  ON CONFLICT (identifier) DO UPDATE SET attribute_set_id = EXCLUDED.attribute_set_id
  RETURNING id
)
UPDATE users_auth_providers
SET form_id = (SELECT id FROM form_ins)
WHERE identifier = 'email';

UPDATE users
SET auth_provider_id = (SELECT id FROM users_auth_providers WHERE identifier = 'email')
WHERE identifier LIKE 'seed-demo-user-%' AND auth_provider_id IS NULL;
SQL

echo "[setup-demo-passwords] Done. Login via:"
echo "    identifier: seed-demo-user-active-1 (or any other seed-demo-user-*)"
echo "    password:   ${DEMO_PASSWORD}"
