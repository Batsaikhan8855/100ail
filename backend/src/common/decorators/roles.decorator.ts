import { SetMetadata } from "@nestjs/common";
import { UserRole } from "@prisma/client";

export const ROLES_KEY = "roles";

/** Зөвхөн заасан эрхтэй хэрэглэгчид нэвтрэх боломжтой */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
