# Use a lightweight Node image for production
FROM node:20-alpine AS deps
WORKDIR /usr/src/app

# Install only production dependencies in a separate stage
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# App image
FROM node:20-alpine AS runner
WORKDIR /usr/src/app

# Copy node_modules and app source
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . ./

# Set production runtime env
ENV NODE_ENV=production
EXPOSE 8000

# Use non-root user for security
USER node

CMD ["npm", "start"]
