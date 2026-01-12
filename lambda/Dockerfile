FROM public.ecr.aws/lambda/python:3.12

# Install Chrome dependencies
RUN dnf install -y \
    atk \
    cups-libs \
    gtk3 \
    libXcomposite \
    alsa-lib \
    libXcursor \
    libXdamage \
    libXext \
    libXi \
    libXrandr \
    libXScrnSaver \
    libXtst \
    pango \
    at-spi2-atk \
    libXt \
    xorg-x11-server-Xvfb \
    xorg-x11-xauth \
    dbus-glib \
    dbus-glib-devel \
    nss \
    mesa-libgbm \
    unzip \
    && dnf clean all

# Install Chrome
RUN curl -Lo "/tmp/chrome-linux64.zip" "https://storage.googleapis.com/chrome-for-testing-public/131.0.6778.87/linux64/chrome-linux64.zip" \
    && unzip -q /tmp/chrome-linux64.zip -d /opt/ \
    && rm /tmp/chrome-linux64.zip

# Install ChromeDriver
RUN curl -Lo "/tmp/chromedriver-linux64.zip" "https://storage.googleapis.com/chrome-for-testing-public/131.0.6778.87/linux64/chromedriver-linux64.zip" \
    && unzip -q /tmp/chromedriver-linux64.zip -d /opt/ \
    && rm /tmp/chromedriver-linux64.zip

# Set Chrome and ChromeDriver paths
ENV CHROME_BIN=/opt/chrome-linux64/chrome
ENV CHROMEDRIVER_BIN=/opt/chromedriver-linux64/chromedriver

# Install Python dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r requirements.txt

# Copy function code
COPY nafdac_validator_container.py ${LAMBDA_TASK_ROOT}/

# Set the CMD to your handler
CMD [ "nafdac_validator_container.lambda_handler" ]
