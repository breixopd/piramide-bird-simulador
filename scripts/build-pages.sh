#!/usr/bin/env bash

set -euo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
source_dir="$repo_root/site"
output_dir="$repo_root/.pages-dist"

if [[ ! -f "$source_dir/index.html" || ! -f "$source_dir/styles.css" ]]; then
  echo "Error: faltan los archivos fuente del sitio público." >&2
  exit 66
fi

rm -rf -- "$output_dir"
install -d -- "$output_dir/fonts"
cp -- "$source_dir"/*.html "$source_dir/styles.css" "$output_dir/"
cp -- "$repo_root/public/privacy.html" "$output_dir/privacy.html"
cp -- "$repo_root/public/favicon.svg" "$output_dir/favicon.svg"
cp -- "$repo_root/public/fonts/Inter-Variable.woff2" "$output_dir/fonts/Inter-Variable.woff2"
cp -- "$repo_root/LICENSE" "$output_dir/LICENSE.txt"

if grep -Rq -E '<bird-app|src/main\.ts|assets/index-' -- "$output_dir"; then
  echo "Error: el sitio público contiene una referencia a la aplicación ejecutable." >&2
  exit 65
fi

for required_path in index.html privacy.html license.html support.html styles.css LICENSE.txt; do
  if [[ ! -s "$output_dir/$required_path" ]]; then
    echo "Error: falta el artefacto público $required_path." >&2
    exit 65
  fi
done

echo "Sitio público preparado en $output_dir"
