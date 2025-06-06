FROM python:3.12-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && \
    apt-get install -y curl cron supervisor unzip && \
    curl https://rclone.org/install.sh | bash && \
    apt-get clean

# Copy files
COPY . /app

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# Cron job (every 6h)
RUN echo "0 */6 * * * python /app/rclone_link_exporter.py >> /var/log/cron.log 2>&1" > /etc/cron.d/exporter-cron && \
    chmod 0644 /etc/cron.d/exporter-cron && \
    crontab /etc/cron.d/exporter-cron

# Supervisord config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 42069
# Symlink collection.json so it's web-accessible
RUN ln -s /data/collection.json /app/collection.json

CMD ["/app/start.sh"]
