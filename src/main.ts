import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { createClient } from "redis";
import { ConfigService } from "@nestjs/config";
import RedisStore from "connect-redis";
import session from "express-session";
import passport from "passport";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService>(ConfigService);
  const redisStore = await createRedisStore(configService.getOrThrow<string>("REDIS_PASSWORD"));

  app.use(
    session({
      store: redisStore,
      resave: false,
      saveUninitialized: false,
      secret: configService.getOrThrow<string>("SESSION_SECRET"),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 31,
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  await app.listen(3000);
}

async function createRedisStore(redisPassword: string): Promise<RedisStore> {
  const redisClient = createClient({
    password: redisPassword,
  });

  await redisClient.connect();

  return new RedisStore({
    client: redisClient,
    prefix: "whiteboard:",
  });
}

bootstrap();
