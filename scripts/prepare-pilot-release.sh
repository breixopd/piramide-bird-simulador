#!/usr/bin/env bash

set -euo pipefail

usage() {
  echo "Uso: $0 RUTA_APK [NOMBRE_PUBLICO.apk]" >&2
  echo "Requiere EXPECTED_SIGNER_SHA256 y verifica firma, paquete y versión; no firma artefactos." >&2
}

if [[ $# -lt 1 || $# -gt 2 ]]; then
  usage
  exit 64
fi

apk_path=$1
public_name=${2:-"piramide-bird-piloto.apk"}
expected_application_id=${EXPECTED_APPLICATION_ID:-"com.breixopd.piramidebird"}
expected_version_name=${EXPECTED_VERSION_NAME:-"0.1.0"}
expected_signer=${EXPECTED_SIGNER_SHA256:-}

if [[ -z "$expected_signer" ]]; then
  echo "Error: define EXPECTED_SIGNER_SHA256 con la huella SHA-256 aprobada de la clave de publicación." >&2
  exit 64
fi

if [[ ! -f "$apk_path" ]]; then
  echo "Error: no existe la APK: $apk_path" >&2
  exit 66
fi

if [[ "$public_name" != *.apk || "$public_name" == */* ]]; then
  echo "Error: el nombre público debe ser un nombre de archivo terminado en .apk." >&2
  exit 64
fi

for command_name in apksigner apkanalyzer sha256sum; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Error: falta el comando obligatorio '$command_name'." >&2
    exit 69
  fi
done

verification_output=$(apksigner verify --verbose --print-certs "$apk_path")
printf '%s\n' "$verification_output"

if grep -q "CN=Android Debug" <<<"$verification_output"; then
  echo "Error: la APK usa el certificado de depuración y no puede publicarse." >&2
  exit 65
fi

actual_signer=$(sed -n 's/^Signer #1 certificate SHA-256 digest: //p' <<<"$verification_output" | head -n 1)
actual_signer=$(tr '[:upper:]' '[:lower:]' <<<"$actual_signer" | tr -d '[:space:]:')
expected_signer=$(tr '[:upper:]' '[:lower:]' <<<"$expected_signer" | tr -d '[:space:]:')
if [[ -z "$actual_signer" || "$actual_signer" != "$expected_signer" ]]; then
  echo "Error: la huella de firma no coincide con EXPECTED_SIGNER_SHA256." >&2
  exit 65
fi

actual_application_id=$(apkanalyzer manifest application-id "$apk_path")
actual_version_name=$(apkanalyzer manifest version-name "$apk_path")
if [[ "$actual_application_id" != "$expected_application_id" ]]; then
  echo "Error: applicationId inesperado: $actual_application_id" >&2
  exit 65
fi
if [[ "$actual_version_name" != "$expected_version_name" ]]; then
  echo "Error: versionName inesperada: $actual_version_name" >&2
  exit 65
fi

artifact_dir=$(dirname "$apk_path")
artifact_path="$artifact_dir/$public_name"

if [[ "$apk_path" != "$artifact_path" ]]; then
  if [[ -e "$artifact_path" ]]; then
    echo "Error: el artefacto de destino ya existe: $artifact_path" >&2
    exit 73
  fi
  cp -- "$apk_path" "$artifact_path"
fi

(
  cd "$artifact_dir"
  sha256sum "$public_name" >"$public_name.sha256"
)

echo
echo "Artefactos preparados:"
echo "  $artifact_path"
echo "  $artifact_path.sha256"
echo
echo "Publicación manual sugerida:"
printf '  gh release create <vX.Y.Z-pilot.N> %q %q --prerelease --generate-notes\n' \
  "$artifact_path" "$artifact_path.sha256"
