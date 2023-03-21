FROM node:current-alpine3.17
WORKDIR /app
COPY package.json .
RUN npm i
COPY . .
EXPOSE 5001
ENV PORT=5001
CMD ["npm","run","dev"]
