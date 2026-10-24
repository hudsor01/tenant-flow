#!/usr/bin/env bash
# Runs this action's script through missing and legacy-format values, each HTTP
# status the script tells apart, no response, bodies that are not JSON, and its
# success paths, with a local stand-in for GoTrue answering the cases that need
# a response. That checks the contract in action.yml -- which place an error
# names (the secret store, the variables page, or neither) -- for those cases
# instead of only restating it.
#
#   bash .github/actions/verify-supabase-test-auth/test.sh [path/to/action.yml]
#
# Needs the action's own curl and jq, plus python3 for the stand-in and bun to
# read the YAML. The `checks` job in ci-cd.yml runs it.
#
# The stand-in binds port 0, so each case that starts one gets a free port of
# its own. With a fixed port, whatever was already listening there answered
# every request, so cases read that process's replies instead of their own
# stand-in's. It also exits once it has gone about ten seconds without a
# request, so one that a kill does not reach -- after an interrupted run, say --
# does not linger.
set -euo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
action=${1:-$here/action.yml}
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

script=$work/step.sh
ACTION_FILE=$action OUT_FILE=$script bun -e '
const parsed = Bun.YAML.parse(await Bun.file(process.env.ACTION_FILE).text());
await Bun.write(process.env.OUT_FILE, parsed.runs.steps[0].run);
'

# The token endpoint answers with the case's status and body, the logout
# endpoint with the case's logout status -- or, for logout status 0, by closing
# the connection without a reply.
server_py='
import http.server, sys, threading, time
portfile, status, body, logout = sys.argv[1], int(sys.argv[2]), sys.argv[3].encode(), int(sys.argv[4])
last = [time.monotonic()]
class Handler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        last[0] = time.monotonic()
        length = int(self.headers.get("Content-Length") or 0)
        if length:
            self.rfile.read(length)
        if self.path.startswith("/auth/v1/token"):
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path.startswith("/auth/v1/logout") and logout == 0:
            self.close_connection = True
        else:
            self.send_response(logout if self.path.startswith("/auth/v1/logout") else 404)
            self.end_headers()
    def log_message(self, *args):
        pass
server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
def exit_when_idle():
    while time.monotonic() - last[0] < 10:
        time.sleep(0.5)
    server.shutdown()
threading.Thread(target=exit_when_idle, daemon=True).start()
with open(portfile, "w") as fh:
    fh.write(str(server.server_address[1]))
server.serve_forever()
'

# A port that was free a moment ago, for the no-response case.
free_port() {
	python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()'
}

# Both callers pass `credentials: |`, a YAML block that ends in a newline, so
# every case does too: that trailing empty line is what the script's
# blank-line guards skip.
credentials=$'owner-a=a@example.test:pw\n'

passed=0
failed=0
case_no=0

# run_case NAME WANT_EXIT STATUS BODY [VAR=value ...]
# STATUS "none" starts no stand-in. LOGOUT (default 204) is the stand-in's
# logout status. Reads the EXPECT and ABSENT arrays; "{url}" in a pattern of
# either becomes the case's URL.
run_case() {
	local name=$1 want=$2 status=$3 body=$4
	shift 4
	case_no=$((case_no + 1))
	local port pid=""
	if [ "$status" = none ]; then
		port=$(free_port)
	else
		local portfile=$work/port.$case_no
		python3 -c "$server_py" "$portfile" "$status" "$body" "${LOGOUT:-204}" &
		pid=$!
		for _ in $(seq 1 100); do
			[ -s "$portfile" ] && break
			sleep 0.05
		done
		port=$(<"$portfile")
	fi
	local url="http://127.0.0.1:$port/"
	local out code=0
	out=$(env -i PATH="$PATH" HOME="$HOME" \
		SUPABASE_URL="$url" PUBLISHABLE_KEY=sb_publishable_test \
		CREDENTIALS="$credentials" SECRET_KEY= REQUIRE_SECRET_KEY=false ACTOR=someone \
		"$@" bash --noprofile --norc -eo pipefail "$script" 2>&1) || code=$?
	if [ -n "$pid" ]; then
		kill "$pid" 2>/dev/null || true
		wait "$pid" 2>/dev/null || true
	fi
	local ok=1 pattern
	[ "$code" = "$want" ] || { ok=0; echo "   exit $code, wanted $want"; }
	for pattern in ${EXPECT[@]+"${EXPECT[@]}"}; do
		pattern=${pattern//\{url\}/$url}
		grep -qF -- "$pattern" <<<"$out" || { ok=0; echo "   missing: $pattern"; }
	done
	for pattern in ${ABSENT[@]+"${ABSENT[@]}"}; do
		pattern=${pattern//\{url\}/$url}
		grep -qF -- "$pattern" <<<"$out" && { ok=0; echo "   unexpected: $pattern"; }
	done
	if [ "$ok" = 1 ]; then
		passed=$((passed + 1))
		echo "PASS $name"
	else
		failed=$((failed + 1))
		echo "FAIL $name"
		sed 's/^/   | /' <<<"$out"
	fi
}

variables_page="::error::Repository variables: Settings -> Secrets and variables -> Actions -> Variables"
actions_store="::error::Secret store for this run: Settings -> Secrets and variables -> ACTIONS"
dependabot_store="::error::Secret store for this run: Settings -> Secrets and variables -> DEPENDABOT"

EXPECT=("::error::Missing required repository variables: NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" "$variables_page")
ABSENT=("Missing required secrets" "Secret store for this run")
run_case "both variables missing" 1 none "" SUPABASE_URL= PUBLISHABLE_KEY=

EXPECT=("::error::Missing required secrets: owner-a: password" "$actions_store")
ABSENT=("Missing required repository variables" "Repository variables:")
run_case "a password missing" 1 none "" CREDENTIALS=$'owner-a=a@example.test:\n'

EXPECT=("::error::Missing required secrets: owner-a: email" "$actions_store")
ABSENT=("Missing required repository variables" "Repository variables:")
run_case "an email missing" 1 none "" CREDENTIALS=$'owner-a=:pw\n'

EXPECT=("::error::Missing required repository variables: NEXT_PUBLIC_SUPABASE_URL" "$variables_page" "::error::Missing required secrets: SUPABASE_SECRET_KEY owner-a: password" "$dependabot_store")
ABSENT=()
run_case "a variable and secrets missing, dependabot actor" 1 none "" SUPABASE_URL= CREDENTIALS=$'owner-a=a@example.test:\n' REQUIRE_SECRET_KEY=true ACTOR="dependabot[bot]"

EXPECT=("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is a legacy JWT" "$variables_page")
ABSENT=("Secret store for this run")
run_case "legacy-format publishable key" 1 none "" PUBLISHABLE_KEY=eyJlegacy

EXPECT=("SUPABASE_SECRET_KEY is a legacy JWT" "$actions_store")
ABSENT=("Repository variables:")
run_case "legacy-format secret key" 1 none "" SECRET_KEY=eyJlegacy

EXPECT=("does not authenticate: HTTP 400, invalid_credentials: Invalid login credentials" "$actions_store")
ABSENT=("Repository variables:")
run_case "400, wrong pair" 1 400 '{"code":400,"error_code":"invalid_credentials","msg":"Invalid login credentials"}'

EXPECT=("does not authenticate: HTTP 400" "$dependabot_store")
ABSENT=("Repository variables:")
run_case "400, wrong pair, dependabot actor" 1 400 '{"code":400,"error_code":"invalid_credentials","msg":"Invalid login credentials"}' ACTOR="dependabot[bot]"

EXPECT=("does not authenticate: HTTP 400, invalid_grant: Invalid login credentials" "$actions_store")
ABSENT=("Repository variables:")
run_case "400, OAuth-style error body" 1 400 '{"error":"invalid_grant","error_description":"Invalid login credentials"}'

EXPECT=("does not authenticate: HTTP 403, user_banned: User is banned" "$actions_store")
ABSENT=("Repository variables:")
run_case "403, account blocked" 1 403 '{"code":403,"error_code":"user_banned","msg":"User is banned"}'

EXPECT=("HTTP 401, unknown: Invalid API key (Double check your API key.)" "$variables_page")
ABSENT=("Secret store for this run")
run_case "401, publishable key rejected" 1 401 '{"message":"Invalid API key","hint":"Double check your API key."}'

EXPECT=("HTTP 404, unknown: no message. There is no auth endpoint at that address" "$variables_page")
ABSENT=("Secret store for this run")
run_case "404, no auth API at the URL" 1 404 '{}'

EXPECT=("rate-limited this runner's IP")
ABSENT=("Secret store for this run" "Repository variables:")
run_case "429, rate limited" 1 429 '{"code":429,"error_code":"over_request_rate_limit","msg":"Request rate limit reached"}'

EXPECT=("returned an unexpected status")
ABSENT=("Secret store for this run" "Repository variables:")
run_case "500, unexpected status" 1 500 '{"message":"boom"}'

EXPECT=("HTTP 502, unknown: no message. The responder returned an unexpected status")
ABSENT=("Secret store for this run" "Repository variables:")
run_case "502, a gateway page that is not JSON" 1 502 '<html><body>502 Bad Gateway</body></html>'

EXPECT=("no HTTP response (network/DNS/timeout)" "$variables_page")
ABSENT=("Secret store for this run")
run_case "no response" 1 none ""

# curl rejects the brackets in a placeholder like this one before sending
# anything, and writes no status code at all.
EXPECT=("no HTTP response (network/DNS/timeout)" "$variables_page")
ABSENT=("Secret store for this run" "unexpected status")
run_case "a URL curl cannot parse" 1 none "" SUPABASE_URL='https://[project-ref].supabase.co/'

EXPECT=("Verified 1 credential pair(s) authenticate against {url}: owner-a")
ABSENT=("::error::" "::warning::")
run_case "200, signed in and out" 0 200 '{"access_token":"token","token_type":"bearer"}'

EXPECT=("Verified 1 credential pair(s) authenticate against {url}: owner-a")
ABSENT=("::error::" "::warning::")
run_case "200, secret key required and present" 0 200 '{"access_token":"token","token_type":"bearer"}' REQUIRE_SECRET_KEY=true SECRET_KEY=sb_secret_test

EXPECT=("::warning::sign-out of the verification probe for 'owner-a' returned HTTP 500" "Verified 1 credential pair(s) authenticate against {url}: owner-a")
ABSENT=("::error::")
LOGOUT=500 run_case "200, sign-out refused" 0 200 '{"access_token":"token","token_type":"bearer"}'

EXPECT=("::warning::sign-out of the verification probe for 'owner-a' returned HTTP 000" "Verified 1 credential pair(s) authenticate against {url}: owner-a")
ABSENT=("::error::")
LOGOUT=0 run_case "200, sign-out connection dropped" 0 200 '{"access_token":"token","token_type":"bearer"}'

EXPECT=("::warning::the verification probe for 'owner-a' got HTTP 200 with no readable access_token" "Verified 1 credential pair(s) authenticate against {url}: owner-a")
ABSENT=("::error::")
run_case "200, no access_token in the body" 0 200 '{}'

EXPECT=("::warning::the verification probe for 'owner-a' got HTTP 200 with no readable access_token" "Verified 1 credential pair(s) authenticate against {url}: owner-a")
ABSENT=("::error::")
run_case "200, a body that is not JSON" 0 200 '{"access_token":"tok'

echo "---- $passed passed, $failed failed"
[ "$failed" -eq 0 ]
