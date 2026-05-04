#!/usr/bin/env bash
# Script pour Windows (WSL/git bash) ou Linux
# Suppose que les images Docker et les archives de volumes se trouvent
dans le dossier "Documents" de l'utilisateur courant.

set -euo pipefail

DOCS="$HOME/Documents"

echo "=== Chargement des images Docker ==="
for img in odoo-custom.tar postgres.tar; do
    if [ -f "$DOCS/$img" ]; then
        echo "docker load -i $DOCS/$img"
        docker load -i "$DOCS/$img"
    else
        echo "[WARN] image $img absente dans $DOCS"
    fi
done

# noms de volumes attendus dans l'environnement de destination
ODOO_VOL="odoo_data"
PG_VOL="postgres_data"

# création des volumes si nécessaires
for vol in "$ODOO_VOL" "$PG_VOL"; do
    if ! docker volume inspect "$vol" >/dev/null 2>&1; then
        echo "Création du volume $vol"
        docker volume create "$vol"
    fi
done

# restauration des données depuis les archives
for archive in odoo_addons.tar.gz postgres_data.tar.gz; do
    if [ -f "$DOCS/$archive" ]; then
        case "$archive" in
            odoo_addons.tar.gz) target="$ODOO_VOL" ;; 
            postgres_data.tar.gz) target="$PG_VOL" ;; 
        esac
        echo "Restauration de $archive dans le volume $target"
        docker run --rm -v "$target":/data -v "$DOCS":/backup alpine \
            sh -c "tar xzf /backup/$archive -C /data"
    else
        echo "[WARN] archive $archive absente dans $DOCS"
    fi
done

echo "Terminé. Utilisez un docker-compose ou docker run pour créer les
containeurs odoo/postgres."
