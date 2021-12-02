FROM node:alpine
WORKDIR /usr/src/app
COPY ./package*.json ./
RUN npm install --only=production
COPY ./lib ./lib
CMD ["npm", "start"]