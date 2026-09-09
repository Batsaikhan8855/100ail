# 100 Айл API — repo-гийн ҮНДЭСНЭЭС бүтээх хувилбар.
#
# `backend/Dockerfile` нь `backend/`-ийг контекст болгодог (docker-compose
# үүнийг ашиглана). Харин зарим хостинг (Render) Dockerfile-ын замыг үргэлж
# repo-гийн үндэснээс тоолдог тул энэ хувилбар нь ямар ч тохиргоонд
# ажиллана — контекст нь repo-гийн үндэс, замууд `backend/`-ээр эхэлнэ.
#
# Хоёр файл ижил дүрс гаргана; аль нэгийг өөрчилбөл нөгөөг нь дагуулна.

FROM node:22-alpine AS deps
WORKDIR /app
# Prisma нь Alpine дээр libssl шаарддаг (linux-musl-openssl-3.0.x engine)
RUN apk add --no-cache openssl
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY backend/ ./
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY backend/prisma ./prisma
COPY backend/docker-entrypoint.sh ./
EXPOSE 4000
CMD ["./docker-entrypoint.sh"]
