#!/usr/bin/env bash
set -euo pipefail

API="${API:-http://localhost:3001}"
APP="${APP:-http://localhost:3000}"
ORIGIN="${ORIGIN:-$APP}"
EMAIL="smoke-$(date +%s)@example.com"
PASSWORD="smoke-password-123"
JAR="$(mktemp)"

wait_for() {
	local url="$1"
	for _ in $(seq 1 90); do
		if curl -fsS -o /dev/null "$url"; then
			echo "ok   $url"
			return 0
		fi
		sleep 5
	done
	echo "FAIL $url never answered"
	return 1
}

expect_status() {
	local label="$1" expected="$2" actual="$3"
	if [ "$actual" != "$expected" ]; then
		echo "FAIL $label: expected $expected, got $actual"
		exit 1
	fi
	echo "ok   $label ($actual)"
}

wait_for "$API/health"
wait_for "$APP/sign-in"

status=$(curl -sS -o /tmp/signup.json -w '%{http_code}' -c "$JAR" \
	-H "Content-Type: application/json" -H "Origin: $ORIGIN" \
	-d "{\"name\":\"Smoke Test\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
	"$API/api/auth/sign-up/email")
cat /tmp/signup.json; echo
expect_status "sign-up with an allowed address" 200 "$status"

status=$(curl -sS -o /dev/null -w '%{http_code}' \
	-H "Content-Type: application/json" -H "Origin: $ORIGIN" \
	-d '{"name":"Outsider","email":"outsider@not-allowed.test","password":"smoke-password-123"}' \
	"$API/api/auth/sign-up/email")
expect_status "sign-up with a refused address" 403 "$status"

status=$(curl -sS -o /dev/null -w '%{http_code}' \
	-H "Content-Type: application/json" -H "Origin: $ORIGIN" \
	-d "{\"email\":\"$EMAIL\",\"password\":\"wrong-password-000\"}" \
	"$API/api/auth/sign-in/email")
expect_status "sign-in with a wrong password" 401 "$status"

: > "$JAR"
status=$(curl -sS -o /dev/null -w '%{http_code}' -c "$JAR" \
	-H "Content-Type: application/json" -H "Origin: $ORIGIN" \
	-d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
	"$API/api/auth/sign-in/email")
expect_status "sign-in with the right password" 200 "$status"

session=$(curl -sS -b "$JAR" -H "Origin: $ORIGIN" "$API/api/auth/get-session")
echo "$session"
if ! grep -q "\"email\":\"$EMAIL\"" <<<"$session"; then
	echo "FAIL session does not name $EMAIL"
	exit 1
fi
echo "ok   session is signed in"

status=$(curl -sS -o /dev/null -w '%{http_code}' -b "$JAR" "$APP/")
case "$status" in
	200 | 307 | 308) echo "ok   app home for a signed-in user ($status)" ;;
	*) echo "FAIL app home returned $status"; exit 1 ;;
esac

echo "Smoke test passed."
