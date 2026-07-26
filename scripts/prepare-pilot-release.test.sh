#!/usr/bin/env bash

set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
release_script="$script_dir/prepare-pilot-release.sh"
fixture_dir=$(mktemp -d)
trap 'rm -rf -- "$fixture_dir"' EXIT

apk_path="$fixture_dir/app-release.apk"
: >"$apk_path"

apksigner() {
  printf '%s\n' \
    'Verifies' \
    'Signer #1 certificate DN: CN=Pirámide de Bird Upload' \
    'Signer #1 certificate SHA-256 digest: aabbccdd'
}

apkanalyzer() {
  case "$2" in
    application-id) printf '%s\n' 'com.breixopd.piramidebird' ;;
    version-name) printf '%s\n' '1.0.0-alpha.6' ;;
    version-code) printf '%s\n' '1000006' ;;
    *) return 64 ;;
  esac
}

sha256sum() {
  command /usr/bin/sha256sum "$@"
}

export -f apksigner apkanalyzer sha256sum

set +e
missing_output=$(EXPECTED_SIGNER_SHA256='aa:bb:cc:dd' "$release_script" "$apk_path" 2>&1)
missing_status=$?
set -e

if [[ $missing_status -eq 0 || "$missing_output" != *'define EXPECTED_VERSION_CODE'* ]]; then
  printf 'Fallo: EXPECTED_VERSION_CODE debería ser obligatorio. Salida:\n%s\n' "$missing_output" >&2
  exit 1
fi

set +e
output=$(
  EXPECTED_SIGNER_SHA256='aa:bb:cc:dd' \
    EXPECTED_VERSION_CODE='9999999' \
    "$release_script" "$apk_path" piramide-bird-wrong-version.apk 2>&1
)
status=$?
set -e

if [[ $status -eq 0 ]]; then
  echo 'Fallo: se aceptó una APK cuyo versionCode no coincide.' >&2
  exit 1
fi

if [[ "$output" != *'versionCode inesperado'* ]]; then
  printf 'Fallo: el rechazo no explica el versionCode inesperado. Salida:\n%s\n' "$output" >&2
  exit 1
fi

EXPECTED_SIGNER_SHA256='aa:bb:cc:dd' \
  EXPECTED_VERSION_CODE='1000006' \
  "$release_script" "$apk_path" piramide-bird-correct-version.apk >/dev/null

if [[ ! -f "$fixture_dir/piramide-bird-correct-version.apk.sha256" ]]; then
  echo 'Fallo: una APK con versionCode correcto no produjo su suma SHA-256.' >&2
  exit 1
fi

echo 'OK: EXPECTED_VERSION_CODE es obligatorio, rechaza discrepancias y acepta coincidencias.'
