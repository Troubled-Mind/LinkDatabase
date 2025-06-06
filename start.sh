#!/bin/sh

# Run initial export if collection.json is missing
if [ ! -f /data/collection.json ]; then
  echo '📦 collection.json not found, running initial export...'
  python /app/rclone_link_exporter.py
else
  echo '✅ collection.json exists'
fi

# Start supervisord
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
