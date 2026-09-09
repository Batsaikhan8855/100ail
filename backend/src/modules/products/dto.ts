import { Transform, Type } from "class-transformer";
import { IsBooleanString, IsInt, IsOptional, IsString, Min } from "class-validator";

/** Олон утгыг `?city=УБ&city=Дархан` эсвэл `?city=УБ,Дархан` хэлбэрээр хүлээж авна */
const toArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) return value.map(String);
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export class ProductQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() category?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxPrice?: number;

  @IsOptional() @Transform(toArray) city?: string[];

  /** Meilisearch-ээс ирсэн бүтээгдэхүүний id-ууд (дотоод хэрэглээ) */
  @IsOptional() @Transform(toArray) ids?: string[];
  @IsOptional() @Transform(toArray) supplier?: string[];
  @IsOptional() @Transform(toArray) manufacturer?: string[];

  /** "true" бол зөвхөн үлдэгдэлтэй саналыг харуулна */
  @IsOptional() @IsBooleanString() inStock?: string;

  /** price | popular | new | rating */
  @IsOptional() @IsString() sort?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class CreateProductDto {
  @IsString() slug!: string;
  @IsString() name!: string;
  @IsString() categoryId!: string;
  @IsOptional() @IsString() variantLabel?: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() art?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() standard?: string;
}
