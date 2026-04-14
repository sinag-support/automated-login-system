FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Copy package files and pre-built code
COPY package*.json ./
COPY dist ./dist

# Install only production dependencies
RUN npm ci --only=production

# Install Playwright browsers
RUN npx playwright install chromium
RUN npx playwright install-deps

EXPOSE 3001

CMD ["npm", "start"]