import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { createClient } from "redis";
import { ConfigService } from "@nestjs/config";
import RedisStore from "connect-redis";
import session from "express-session";
import passport from "passport";
import { SocketIOAdapter } from "./shared/socket-io.adapter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService>(ConfigService);

  const port =
    configService.getOrThrow<string>("NODE_ENV").toUpperCase() === "PRODUCTION" ? 443 : 3000;

  const redisStore = await createRedisStore(
    configService.getOrThrow<string>("REDIS_PASSWORD"),
    configService.getOrThrow<string>("REDIS_HOST"),
  );

  const sessionMiddleware = session({
    store: redisStore,
    resave: false,
    saveUninitialized: false,
    secret: configService.getOrThrow<string>("SESSION_SECRET"),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 31,
    },
  });

  const passportSessionMiddleware = passport.session();

  app.enableCors({
    origin: [configService.getOrThrow<string>("FRONTEND_URL")],
    credentials: true,
  });

  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passportSessionMiddleware);
  app.useWebSocketAdapter(
    new SocketIOAdapter(
      app,
      configService,
      sessionMiddleware,
      passport.initialize(),
      passport.session(),
    ),
  );

  console.log("Port: ", port);
  await app.listen(port);
}

async function createRedisStore(redisPassword: string, redisHost: string): Promise<RedisStore> {
  const redisClient = createClient({
    url: `redis://:${redisPassword}@${redisHost}:6379`,
  });

  await redisClient.connect();

  return new RedisStore({
    client: redisClient,
    prefix: "whiteboard:",
  });
}

bootstrap();
