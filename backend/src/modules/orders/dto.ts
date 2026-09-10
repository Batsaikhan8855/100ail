import { DeliveryMethod, PaymentMethod } from "@prisma/client";
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class CreateOrderDto {
  @IsString() @MinLength(2) buyerName!: string;
  @IsString() @MinLength(6) phone!: string;
  @IsString() city!: string;
  @IsOptional() @IsString() district?: string;
  @IsString() @MinLength(3) address!: string;

  /** Хаягийн координат — байвал хүргэлтийн зам зөв гарна */
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsString() note?: string;

  @IsOptional() @IsEnum(DeliveryMethod) deliveryMethod?: DeliveryMethod;
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;

  /** Байгууллагын нэрээр нэхэмжлэх авах бол */
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() companyRegNo?: string;
}
