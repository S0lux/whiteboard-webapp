import { INestApplicationContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { Server, ServerOptions } from "socket.io";

export class SocketIOAdapter extends IoAdapter {
  constructor(
    private readonly app: INestApplicationContext,
    private readonly configService: ConfigService,
    private readonly sessionMiddleware: any,
    private readonly passportInitialize: any,
    private readonly passportSession: any,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server: Server = super.createIOServer(port, {
      cors: {
        origin: this.configService.getOrThrow<string>("FRONTEND_URL"),
        credentials: true,
        methods: ["GET", "POST"],
      },
    });
    const wrap = (middleware) => (socket, next) => middleware(socket.request, {}, next);

    server.use(wrap(this.sessionMiddleware));
    server.use(wrap(this.passportInitialize));
    server.use(wrap(this.passportSession));
    server.use((socket, next) => {
      if ((socket.request as any).user) {
        next();
      } else {
        next(new Error("unauthorized"));
      }
    });

    return server;
  }
}
