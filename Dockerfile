FROM python:3.12-slim

WORKDIR /app

# Install dependencies: rclone, cron, supervisor, unzip
RUN apt-get update && \
    apt-get install -y curl cron supervisor unzip && \
    curl https://rclone.org/install.sh | bash && \
    apt-get clean

# Copy all files
COPY . /app

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# Setup crontab for export script every 6h
RUN echo "0 */6 * * * python /app/data/rclone_link_exporter.py >> /var/log/cron.log 2>&1" > /etc/cron.d/exporter-cron && \
    chmod 0644 /etc/cron.d/exporter-cron && \
    crontab /etc/cron.d/exporter-cron

# Add supervisord config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 42069

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
