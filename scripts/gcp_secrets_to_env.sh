#!/usr/bin/env bash
set -euo pipefail

SECRETS_PROJECT_ID="${SECRETS_PROJECT_ID:-shemaobt-secrets}"
REPO_PREFIX="${REPO_PREFIX:-}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-env}"

usage() {
  echo "Usage: REPO_PREFIX=<repo_prefix> $0 [--env-file] [--exports]"
  echo ""
  echo "Fetches secret values from GCP Secret Manager (project: $SECRETS_PROJECT_ID)"
  echo "for secrets whose ID starts with REPO_PREFIX_ and writes them for local use."
  echo ""
  echo "  REPO_PREFIX   Required. Example: mm_poc_v2 → fetches mm_poc_v2_neon_database_url, etc."
  echo "  --env-file    Write KEY=VALUE lines (default). Safe for .env (no export)."
  echo "  --exports    Write 'export KEY=VALUE' lines for sourcing in the shell."
  echo ""
  echo "Optional: SECRETS_PROJECT_ID (default: shemaobt-secrets), OUTPUT_FORMAT=env|exports"
  echo ""
  echo "Example:"
  echo "  REPO_PREFIX=mm_poc_v2 $0 > .env"
  echo "  REPO_PREFIX=mm_poc_v2 $0 --exports | source /dev/stdin"
  exit 1
}

if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
  usage
fi
if [[ "${1:-}" == "--exports" ]]; then
  OUTPUT_FORMAT=exports
fi
if [[ "${1:-}" == "--env-file" ]]; then
  OUTPUT_FORMAT=env
fi

if [[ -z "$REPO_PREFIX" ]]; then
  echo "Error: REPO_PREFIX is required (e.g. mm_poc_v2)" >&2
  usage
fi

if ! command -v gcloud &>/dev/null; then
  echo "Error: gcloud CLI not found" >&2
  exit 1
fi

if ! gcloud projects describe "$SECRETS_PROJECT_ID" &>/dev/null; then
  echo "Error: Project $SECRETS_PROJECT_ID not found or no access." >&2
  exit 1
fi

prefix_lower="${REPO_PREFIX}_"
fetched=0
skipped=0

secret_names=$(gcloud secrets list --project="$SECRETS_PROJECT_ID" --format="value(name)" 2>&1) || {
  echo "Error: Cannot list secrets in project $SECRETS_PROJECT_ID." >&2
  echo "The user needs the 'Secret Manager Viewer' role (roles/secretmanager.viewer) on project $SECRETS_PROJECT_ID." >&2
  echo "Grant it with: gcloud projects add-iam-policy-binding $SECRETS_PROJECT_ID --member='user:<EMAIL>' --role='roles/secretmanager.viewer'" >&2
  exit 1
}

if [[ -z "$secret_names" ]]; then
  echo "Error: No secrets found in project $SECRETS_PROJECT_ID. Check that secrets exist and you have list permissions." >&2
  exit 1
fi

while IFS= read -r full_name; do
  [[ -z "$full_name" ]] && continue
  secret_id=$(basename "$full_name")
  [[ "$secret_id" != "$prefix_lower"* ]] && continue
  env_key="${secret_id#"$REPO_PREFIX"_}"
  env_key=$(echo "$env_key" | tr '[:lower:]' '[:upper:]' | tr '-' '_')
  value=$(gcloud secrets versions access latest --project="$SECRETS_PROJECT_ID" --secret="$secret_id" 2>&1) || {
    echo "Warning: Cannot access secret '$secret_id': $value" >&2
    skipped=$((skipped + 1))
    continue
  }
  value=$(printf '%s' "$value" | tr -d '\n')
  if [[ -z "${value:-}" ]]; then
    echo "Warning: secret '$secret_id' is empty, skipping." >&2
    skipped=$((skipped + 1))
    continue
  fi
  if [[ "$OUTPUT_FORMAT" == "exports" ]]; then
    printf "export %s='%s'\n" "$env_key" "$value"
  else
    printf "%s='%s'\n" "$env_key" "$value"
  fi
  fetched=$((fetched + 1))
done <<< "$secret_names"

echo "Fetched $fetched secret(s) with prefix '$prefix_lower' ($skipped skipped)." >&2

if [[ "$fetched" -eq 0 ]]; then
  echo "Error: No secrets were fetched. The user likely needs the 'Secret Manager Secret Accessor' role (roles/secretmanager.secretAccessor) on project $SECRETS_PROJECT_ID." >&2
  echo "Grant it with: gcloud projects add-iam-policy-binding $SECRETS_PROJECT_ID --member='user:<EMAIL>' --role='roles/secretmanager.secretAccessor'" >&2
  exit 1
fi
