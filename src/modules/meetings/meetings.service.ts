import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  buildPaginatedResult,
  PaginatedResult,
} from '../../common/dto/pagination.dto.js';
import { Worker } from '../workers/entities/worker.entity.js';
import { CreateMeetingDto } from './dto/create-meeting.dto.js';
import { FindMeetingsQueryDto } from './dto/find-meetings-query.dto.js';
import { UpdateMeetingDto } from './dto/update-meeting.dto.js';
import { Meeting } from './entities/meeting.entity.js';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting)
    private readonly repository: Repository<Meeting>,
    @InjectRepository(Worker)
    private readonly workersRepository: Repository<Worker>,
  ) {}

  async create(createMeetingDto: CreateMeetingDto): Promise<Meeting> {
    await this.ensureActNumberIsAvailable(createMeetingDto.actNumber);
    const workers = await this.loadWorkers(createMeetingDto.workerIds);

    const meeting = this.repository.create({
      actNumber: createMeetingDto.actNumber,
      meetingDate: new Date(createMeetingDto.meetingDate),
      agenda: createMeetingDto.agenda,
    });

    const saved = await this.repository.save(meeting);

    if (workers.length > 0) {
      await this.setParticipants(saved, workers);
    }

    return this.findOne(saved.id);
  }

  async findAll(
    query: FindMeetingsQueryDto,
  ): Promise<PaginatedResult<Meeting>> {
    const qb = this.repository
      .createQueryBuilder('meeting')
      .leftJoinAndSelect('meeting.workers', 'worker')
      .leftJoinAndSelect('meeting.contracts', 'contract')
      .leftJoinAndSelect('meeting.agreements', 'agreement');

    if (query.search) {
      qb.andWhere(
        '(meeting.actNumber LIKE :search OR meeting.agenda LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.workerId) {
      qb.andWhere('worker.id = :workerId', {
        workerId: query.workerId,
      });
    }

    if (query.fechaDesde) {
      qb.andWhere('meeting.meetingDate >= :fechaDesde', {
        fechaDesde: new Date(query.fechaDesde),
      });
    }

    if (query.fechaHasta) {
      qb.andWhere('meeting.meetingDate <= :fechaHasta', {
        fechaHasta: new Date(query.fechaHasta),
      });
    }

    const [meetings, total] = await qb
      .orderBy('meeting.meetingDate', 'DESC')
      .take(query.limit)
      .skip(query.skip)
      .getManyAndCount();

    return buildPaginatedResult(meetings, total, query.page, query.limit);
  }

  async findOne(id: number): Promise<Meeting> {
    const meeting = await this.repository.findOne({
      where: { id },
      relations: {
        workers: true,
        contracts: true,
        agreements: true,
      },
    });

    if (!meeting) {
      throw new NotFoundException(`Reunión / Acta con id ${id} no encontrada.`);
    }

    return meeting;
  }

  async update(id: number, updateMeetingDto: UpdateMeetingDto): Promise<Meeting> {
    const meeting = await this.findOne(id);

    if (
      updateMeetingDto.actNumber &&
      updateMeetingDto.actNumber !== meeting.actNumber
    ) {
      await this.ensureActNumberIsAvailable(updateMeetingDto.actNumber, id);
      meeting.actNumber = updateMeetingDto.actNumber;
    }

    if (updateMeetingDto.meetingDate !== undefined) {
      meeting.meetingDate = new Date(updateMeetingDto.meetingDate);
    }

    if (updateMeetingDto.agenda !== undefined) {
      meeting.agenda = updateMeetingDto.agenda;
    }

    await this.repository.save(meeting);

    if (updateMeetingDto.workerIds !== undefined) {
      const workers = await this.loadWorkers(updateMeetingDto.workerIds);
      await this.setParticipants(meeting, workers);
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const meeting = await this.findOne(id);

    if (meeting.contracts?.length > 0 || meeting.agreements?.length > 0) {
      throw new ConflictException(
        `No se puede eliminar el acta porque tiene contratos o acuerdos asociados.`,
      );
    }

    await this.repository.remove(meeting);
  }

  private async ensureActNumberIsAvailable(
    actNumber: string,
    ignoreId?: number,
  ): Promise<void> {
    const existing = await this.repository.findOne({
      where: { actNumber },
    });

    if (existing && existing.id !== ignoreId) {
      throw new ConflictException(
        `Ya existe un acta con el número ${actNumber}.`,
      );
    }
  }

  private async loadWorkers(workerIds?: number[]): Promise<Worker[]> {
    if (!workerIds || workerIds.length === 0) {
      return [];
    }

    const uniqueIds = Array.from(new Set(workerIds));
    const workers = await this.workersRepository.findBy({ id: In(uniqueIds) });

    if (workers.length !== uniqueIds.length) {
      const foundIds = new Set(workers.map((w) => w.id));
      const missing = uniqueIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Trabajador(es) con id(s) [${missing.join(', ')}] no encontrado(s).`,
      );
    }

    return workers;
  }

  private async setParticipants(
    meeting: Meeting,
    workers: Worker[],
  ): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .relation(Meeting, 'workers')
      .of(meeting)
      .addAndRemove(
        workers.map((w) => w.id),
        (meeting.workers ?? []).map((w) => w.id),
      );
  }
}
