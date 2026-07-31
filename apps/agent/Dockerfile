FROM node:24-bookworm AS build

WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/agent/package.json apps/agent/package.json
COPY apps/broker/package.json apps/broker/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile
COPY apps/agent apps/agent
COPY packages/contracts packages/contracts
RUN pnpm --filter @musaed/agent build
RUN pnpm --filter @musaed/agent deploy --prod --legacy /out

FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=build /workspace/apps/agent/dist ./dist
COPY --from=build /out/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/server.js"]
