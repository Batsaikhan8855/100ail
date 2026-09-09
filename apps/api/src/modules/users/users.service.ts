import { Injectable } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(role?: UserRole) {
    return this.prisma.user.findMany({
      where: role ? { role } : {},
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        supplier: { select: { id: true, name: true } },
        organization: { select: { id: true, name: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  updateProfile(id: string, data: { name?: string; phone?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, phone: true, role: true },
    });
  }

  /** Админ: хэрэглэгчийг нийлүүлэгчид харьяалуулах */
  assignSupplier(id: string, supplierId: string | null) {
    return this.prisma.user.update({
      where: { id },
      data: {
        supplierId,
        role: supplierId ? UserRole.SUPPLIER : UserRole.BUYER,
      },
    });
  }
}
