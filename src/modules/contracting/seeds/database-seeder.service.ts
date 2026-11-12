import { Injectable, Logger } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
} from 'typeorm';
import { CommitteeMinute } from '../entities/committee-minute.entity.js';
import { CommitteeResolution } from '../entities/committee-resolution.entity.js';
import { ContractRequest } from '../entities/contract-request.entity.js';
import { ContractType } from '../entities/contract-type.entity.js';
import { Counterparty } from '../entities/counterparty.entity.js';
import { SpecializedArea } from '../entities/specialized-area.entity.js';
import {
  CONTRACT_TYPES_SEED,
  COUNTERPARTIES_SEED,
  SPECIALIZED_AREAS_SEED,
} from './catalogs.seed.data.js';
import {
  CONTRACT_REQUESTS_SEED,
  MINUTES_SEED,
} from './contracts-and-minutes.seed.data.js';

/**
 * Servicio idempotente encargado de poblar la base de datos inicial (Seeds).
 * Ejecuta todo el proceso dentro de una transacción ACID garantizando que:
 *  1. Se carguen catálogos base (Tipos, Áreas, Contrapartes).
 *  2. Se inserten primero los Contratos Principales y luego sus Específicos/Suplementos
 *     resolviendo automáticamente el `parentContractId`.
 *  3. Se carguen Actas y Acuerdos vinculándolos por código ECIE a cada solicitud.
 */
@Injectable()
export class DatabaseSeederService {
  private readonly logger = new Logger(DatabaseSeederService.name);

  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      this.logger.log('Iniciando carga de catálogos maestros...');

      for (const item of CONTRACT_TYPES_SEED) {
        await this.upsertBy(manager, ContractType, { code: item.code }, item);
      }
      for (const item of SPECIALIZED_AREAS_SEED) {
        await this.upsertBy(manager, SpecializedArea, { code: item.code }, item);
      }
      for (const item of COUNTERPARTIES_SEED) {
        await this.upsertBy(
          manager,
          Counterparty,
          { officialName: item.officialName },
          item,
        );
      }

      const typesMap = new Map(
        (await manager.find(ContractType)).map((t) => [t.code, t]),
      );
      const areasMap = new Map(
        (await manager.find(SpecializedArea)).map((a) => [a.code, a]),
      );
      const counterpartiesMap = new Map(
        (await manager.find(Counterparty)).map(
          (c) => [c.acronym ?? c.officialName, c],
        ),
      );

      this.logger.log('Cargando solicitudes de contrato y resolviendo jerarquías...');
      const requestsByCode = new Map<string, ContractRequest>();

      for (const item of CONTRACT_REQUESTS_SEED) {
        let req = await manager.findOne(ContractRequest, {
          where: { ecieInternalCode: item.ecieInternalCode },
        });

        if (!req) {
          req = manager.create(ContractRequest, {
            registrationYear: item.registrationYear,
            consecutiveNumber: item.consecutiveNumber,
            ecieInternalCode: item.ecieInternalCode,
            counterpartyContractNumber: item.counterpartyContractNumber,
            instrumentCategory: item.instrumentCategory,
            subInstrumentNumber: item.subInstrumentNumber,
            counterparty: counterpartiesMap.get(item.counterpartyAcronym)!,
            contractType: typesMap.get(item.contractTypeCode)!,
            specializedArea: areasMap.get(item.areaCode)!,
            subject: item.subject,
            uebEntryDate: new Date(item.uebEntryDate),
            legalOpinionDate: item.legalOpinionDate
              ? new Date(item.legalOpinionDate)
              : null,
            signatureDate: item.signatureDate
              ? new Date(item.signatureDate)
              : null,
            amountType: item.amountType,
            amount: item.amount,
            currency: 'CUP',
            validityType: item.validityType,
            expirationDate: item.expirationDate
              ? new Date(item.expirationDate)
              : null,
            validityDescription: item.validityDescription,
            approvalStatus: item.approvalStatus,
            economyArchiveStatus: item.economyArchiveStatus,
            uebMinutesReference: item.uebMinutesReference,
            remarks: item.remarks,
          });
          req = await manager.save(req);
        }
        requestsByCode.set(req.ecieInternalCode, req);
      }

      for (const item of CONTRACT_REQUESTS_SEED) {
        if (!item.parentCode) continue;
        const child = requestsByCode.get(item.ecieInternalCode);
        const parent = requestsByCode.get(item.parentCode);
        if (child && parent && !child.parentContractId) {
          child.parentContractId = parent.id;
          await manager.save(child);
        }
      }

      this.logger.log(
        'Cargando Actas y Acuerdos del Comité de Contratación...',
      );
      for (const minuteSeed of MINUTES_SEED) {
        let minute = await manager.findOne(CommitteeMinute, {
          where: {
            year: minuteSeed.year,
            minuteNumber: minuteSeed.minuteNumber,
          },
        });

        if (!minute) {
          minute = await manager.save(
            manager.create(CommitteeMinute, {
              year: minuteSeed.year,
              minuteNumber: minuteSeed.minuteNumber,
              sessionDate: new Date(minuteSeed.sessionDate),
            }),
          );
        }

        for (const resSeed of minuteSeed.resolutions) {
          let resolution = await manager.findOne(CommitteeResolution, {
            where: {
              minuteId: minute.id,
              resolutionNumber: resSeed.resolutionNumber,
            },
          });

          if (!resolution) {
            const relatedRequests = resSeed.relatedContractCodes
              .map((code) => requestsByCode.get(code))
              .filter((r): r is ContractRequest => Boolean(r));

            resolution = manager.create(CommitteeResolution, {
              minute,
              agendaItem: resSeed.agendaItem,
              resolutionNumber: resSeed.resolutionNumber,
              description: resSeed.description,
              responsible: resSeed.responsible,
              dueDate: resSeed.dueDate ? new Date(resSeed.dueDate) : null,
              completedDate: resSeed.completedDate
                ? new Date(resSeed.completedDate)
                : null,
              status: resSeed.status,
              remarks: resSeed.remarks,
              relatedRequests,
            });
            await manager.save(resolution);
          }
        }
      }

      this.logger.log('Proceso de seeding completado exitosamente.');
    });
  }

  private async upsertBy(
    manager: EntityManager,
    entityClass: any,
    where: any,
    data: any,
  ): Promise<void> {
    const existing = await manager.findOne(entityClass, { where } as any);
    if (existing) {
      Object.assign(existing, data);
      await manager.save(existing);
    } else {
      await manager.save(manager.create(entityClass, data));
    }
  }
}
