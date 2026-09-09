import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { StorageService } from "./storage.service";

@ApiTags("storage")
@Controller("storage")
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Public()
  @Get("status")
  status() {
    return { enabled: this.storage.enabled };
  }

  /** Барааны зураг, баримтыг клиентээс шууд S3 руу байршуулах URL */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @Post("presign")
  presign(
    @Body() body: { contentType: string; fileName?: string; folder?: string },
  ) {
    return this.storage.presignUpload(body);
  }
}
