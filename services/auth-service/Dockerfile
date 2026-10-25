# Build from the repo root: docker build -f services/auth-service/Dockerfile .
FROM node:20-alpine
WORKDIR /repo
COPY package.json yarn.lock ./
COPY packages ./packages
COPY services/auth-service ./services/auth-service
RUN apk add --no-cache python3 make g++ \
  && yarn install --production --non-interactive \
  && yarn cache clean
ENV NODE_ENV=production
WORKDIR /repo/services/auth-service
USER node
EXPOSE 4001
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://localhost:4001/health || exit 1
CMD ["node", "src/index.js"]
