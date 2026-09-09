import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../common/prisma.service";
import { LoginDto, RegisterDto } from "./dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("Энэ и-мэйл хаягаар бүртгэл үүссэн байна");
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        phone: dto.phone,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: UserRole.BUYER,
      },
    });

    return this.sign(user.id);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("И-мэйл эсвэл нууц үг буруу байна");
    }
    return this.sign(user.id);
  }

  /** Token-д хэрэглэгчийн эрх, нийлүүлэгчийн харьяаллыг шингээнэ */
  private async sign(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { supplier: true, organization: true },
    });

    const payload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      supplierId: user.supplierId,
      organizationId: user.organizationId,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        supplier: user.supplier
          ? { id: user.supplier.id, name: user.supplier.name }
          : null,
        organization: user.organization
          ? { id: user.organization.id, name: user.organization.name }
          : null,
      },
    };
  }
}
