FROM node:18-alpine as build
WORKDIR /app
COPY . .

If you add a build script to package.json, uncomment the next line:

RUN npm run build

FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]