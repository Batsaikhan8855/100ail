import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail({}, { message: "И-мэйл хаяг буруу байна" })
  email!: string;

  @IsString()
  @MinLength(6, { message: "Нууц үг доод тал нь 6 тэмдэгт байна" })
  password!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginDto {
  /**
   * И-мэйл эсвэл утасны дугаар. Хуучин клиентүүд `email` талбараар
   * илгээдэг тул хоёуланг нь хүлээж авна.
   */
  @IsOptional()
  @IsString()
  @MinLength(4, { message: "И-мэйл эсвэл утасны дугаараа оруулна уу" })
  identifier?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsString()
  password!: string;
}
