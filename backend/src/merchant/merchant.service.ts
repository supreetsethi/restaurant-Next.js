import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { Audit } from './../domain/audit/audit';
import { Result } from './../domain/result/result';
import { MerchantRepository } from './../infrastructure/data_access/repositories/merchant-repository';
import { MerchantDocument } from './../infrastructure/data_access/repositories/schemas/merchant.schema';
import { Merchant } from './../merchant/merchant';
import { CreateMerchantDTO } from './create-merchant.dto';
import { MerchantParser } from './merchant-parser';
import { IMerchantResponseDTO } from './merchant-response.dto';
import { IMerchantService } from './merchant-service.interface';
import { MerchantMapper } from './merchant.mapper';
import { ISignUpTokens } from './tokens.interface';

@Injectable()
export class MerchantService implements IMerchantService {
  constructor(
    private readonly merchantRepository: MerchantRepository,
    private readonly merchantMapper: MerchantMapper,
  ) {}

  // async signUp(props: CreateMerchantDTO): Promise<ISignUpTokens> {}

  async createMerchant(
    props: CreateMerchantDTO,
  ): Promise<Result<IMerchantResponseDTO>> {
    const merchantDocuments: MerchantDocument[] =
      await this.merchantRepository.find({});
    const existingMerchant = merchantDocuments.find(
      (merchant) => merchant.email === props.email,
    );
    if (existingMerchant) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: `Restaurant with email ${props.email} already exists`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const audit: Audit = Audit.createInsertContext();
    const hashedPassword = await this.hashPassword(props.passwordHash);
    const merchant: Merchant = Merchant.create({
      ...props,
      passwordHash: hashedPassword,
      audit,
    }).getValue();
    const newMerchant = await this.merchantRepository.create(
      this.merchantMapper.toPersistence(merchant),
    );
    return Result.ok(
      MerchantParser.createMerchantResponse(
        this.merchantMapper.toDomain(newMerchant),
      ),
    );
  }

  async getMerchantById(
    id: Types.ObjectId,
  ): Promise<Result<IMerchantResponseDTO>> {
    const merchantDoc = await this.merchantRepository.findById(id);
    return Result.ok(
      MerchantParser.createMerchantResponse(
        this.merchantMapper.toDomain(merchantDoc),
      ),
    );
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}
