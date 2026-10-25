# Build from the repo root: docker build -f apps/web/Dockerfile .
FROM node:20-alpine AS build
WORKDIR /repo
COPY package.json yarn.lock ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN yarn install --non-interactive
ARG GATEWAY_URL=http://gateway:4000
ENV GATEWAY_URL=${GATEWAY_URL}
RUN yarn --cwd apps/web build

FROM node:20-alpine
WORKDIR /repo
COPY --from=build /repo /repo
ENV NODE_ENV=production
WORKDIR /repo/apps/web
USER node
EXPOSE 3000
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
