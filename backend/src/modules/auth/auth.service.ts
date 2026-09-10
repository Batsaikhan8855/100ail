import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../common/prisma.service";
import { LoginDto, RegisterDto } from "./dto";

/** Утасны дугаарыг зөвхөн цифр болгоно: "9911-2233" → "99112233" */
export const normalizePhone = (value: string): string => value.replace(/\D/g, "");

/** Оруулсан утга и-мэйл мөн эсэх */
const looksLikeEmail = (value: string): boolean => value.includes("@");

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

    const phone = dto.phone ? normalizePhone(dto.phone) : null;
    if (phone) {
      const taken = await this.prisma.user.findUnique({ where: { phone } });
      if (taken) {
        throw new ConflictException("Энэ утасны дугаараар бүртгэл үүссэн байна");
      }
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        phone,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: UserRole.BUYER,
      },
    });

    return this.sign(user.id);
  }

  async login(dto: LoginDto) {
    const identifier = (dto.identifier ?? dto.email ?? "").trim();
    if (!identifier) {
      throw new UnauthorizedException("И-мэйл эсвэл утасны дугаараа оруулна уу");
    }

    // И-мэйл эсвэл утас — аль нэгээр нь нэвтэрч болно
    const user = looksLikeEmail(identifier)
      ? await this.prisma.user.findUnique({
          where: { email: identifier.toLowerCase() },
        })
      : await this.prisma.user.findUnique({
          where: { phone: normalizePhone(identifier) },
        });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException(
        "И-мэйл, утасны дугаар эсвэл нууц үг буруу байна",
      );
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
