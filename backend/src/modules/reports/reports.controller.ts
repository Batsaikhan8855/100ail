import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser, type AuthUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ReportsService } from "./reports.service";

@ApiTags("reports")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Roles(UserRole.ADMIN)
  @Get("admin")
  admin() {
    return this.reports.adminDashboard();
  }

  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Get("supplier")
  supplier(@CurrentUser() user: AuthUser) {
    return this.reports.supplierDashboard(user);
  }
}
