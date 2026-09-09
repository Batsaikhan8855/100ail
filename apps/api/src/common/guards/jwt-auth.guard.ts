import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

/**
 * Bearer token шалгаж `request.user`-ыг бөглөнө.
 * `@Public()` тэмдэглэгээтэй endpoint дээр алгасна.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException("Нэвтрэх шаардлагатай");
    }

    try {
      request.user = await this.jwt.verifyAsync(token);
      return true;
    } catch {
      if (isPublic) return true;
      throw new UnauthorizedException("Token хүчингүй байна");
    }
  }
}
