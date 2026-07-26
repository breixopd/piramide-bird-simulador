#!/usr/bin/env bash

set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
release_script="$script_dir/prepare-pilot-release.sh"
fixture_dir=$(mktemp -d)
trap 'rm -rf -- "$fixture_dir"' EXIT

apk_path="$fixture_dir/app-release.apk"
: >"$apk_path"

apksigner() {
  local signer_dn=${FAKE_SIGNER_DN:-'CN=Pirámide de Bird Upload'}
  printf '%s\n' \
    'Verifies' \
    "Signer #1 certificate DN: $signer_dn" \
    'Signer #1 certificate SHA-256 digest: aabbccdd'
}

apkanalyzer() {
  case "$2" in
    application-id) printf '%s\n' 'com.breixopd.piramidebird' ;;
    version-name) printf '%s\n' '1.0.0' ;;
    version-code) printf '%s\n' '1000007' ;;
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
  EXPECTED_VERSION_CODE='1000007' \
  "$release_script" "$apk_path" piramide-bird-correct-version.apk >/dev/null

if [[ ! -f "$fixture_dir/piramide-bird-correct-version.apk.sha256" ]]; then
  echo 'Fallo: una APK con versionCode correcto no produjo su suma SHA-256.' >&2
  exit 1
fi

set +e
debug_output=$(
  FAKE_SIGNER_DN='C=US, O=Android, CN=Android Debug' \
    EXPECTED_SIGNER_SHA256='aa:bb:cc:dd' \
    EXPECTED_VERSION_CODE='1000007' \
    "$release_script" "$apk_path" piramide-bird-debug-rejected.apk 2>&1
)
debug_status=$?
set -e

if [[ $debug_status -eq 0 || "$debug_output" != *'certificado de depuración'* ]]; then
  printf 'Fallo: una firma de depuración debería rechazarse por defecto. Salida:\n%s\n' "$debug_output" >&2
  exit 1
fi

FAKE_SIGNER_DN='C=US, O=Android, CN=Android Debug' \
  ALLOW_DEBUG_SIGNER='1' \
  EXPECTED_VERSION_CODE='1000007' \
  "$release_script" "$apk_path" piramide-bird-debug-device-test.apk >/dev/null

if [[ ! -f "$fixture_dir/piramide-bird-debug-device-test.apk.sha256" ]]; then
  echo 'Fallo: el modo explícito de prueba no preparó la APK de depuración.' >&2
  exit 1
fi

echo 'OK: versiones y firmantes se validan; la firma de depuración exige autorización explícita.'
