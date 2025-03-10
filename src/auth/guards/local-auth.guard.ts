import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

@Injectable()
export class LocalAuthGuard extends AuthGuard("local") {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const result = (await super.canActivate(context)) as boolean;
    await super.logIn(request);
    return result;
  }
}
