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
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
