FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .
RUN npm run build

# Install Playwright browsers
RUN npx playwright install chromium
RUN npx playwright install-deps

EXPOSE 3001

CMD ["npm", "start"]