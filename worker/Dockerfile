FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Install Playwright browsers
RUN npx playwright install chromium
RUN npx playwright install-deps

# Remove dev dependencies after build
RUN npm prune --production

EXPOSE 3001

CMD ["npm", "start"]