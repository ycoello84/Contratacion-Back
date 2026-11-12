/**
 * Jerarquía documental según nomenclatura oficial ECIE (Ej: ECIE YYYY-XX-NNN):
 * - MASTER_CONTRACT:   ECIE 2019-20-135 (Contrato Principal o Marco)
 * - SPECIFIC_CONTRACT: ECIE 2019-20-135-01 (Sufijo de 2 dígitos)
 * - ADDENDUM:          ECIE 2019-20-135-2 (Sufijo de 1 dígito)
 */
export enum InstrumentCategory {
  MASTER_CONTRACT = 'MASTER_CONTRACT',
  SPECIFIC_CONTRACT = 'SPECIFIC_CONTRACT',
  ADDENDUM = 'ADDENDUM',
}

/**
 * Estados del flujo de aprobación en los Comités de Contratación (Hoja "Leyenda").
 */
export enum RequestStatus {
  /** Expediente incompleto en recepción (Rojo en Leyenda) */
  MISSING_DATA = 'MISSING_DATA',
  /** En análisis en el Comité de Contratación de la UEB */
  PENDING_UEB_CC = 'PENDING_UEB_CC',
  /** No aprobado en el CC de la UEB (Salmón en Leyenda) */
  REJECTED_UEB_CC = 'REJECTED_UEB_CC',
  /** Enviado al CC de la Empresa, pendiente de aprobación (Verde oscuro en Leyenda) */
  PENDING_COMPANY = 'PENDING_COMPANY',
  /** No aprobado en el CC de la Empresa (Marrón en Leyenda) */
  REJECTED_COMPANY = 'REJECTED_COMPANY',
  /** Aprobado por la Empresa, pendiente de formalización/firma (Verde brillante en Leyenda) */
  APPROVED_COMPANY = 'APPROVED_COMPANY',
  /** Aprobado, firmado y conforme (Blanco / OK en Leyenda) */
  APPROVED_OK = 'APPROVED_OK',
  /** Cancelado o desestimado (Azul oscuro en Leyenda) */
  CANCELLED = 'CANCELLED',
}

/**
 * Control de archivo físico y legal en el Departamento de Economía.
 */
export enum EconomyArchiveStatus {
  /** Pendiente de entrega o revisión en Economía */
  PENDING = 'PENDING',
  /** Copia archivada en Economía y conforme ("OK" gris en Leyenda) */
  ARCHIVED_OK = 'ARCHIVED_OK',
  /** Archivado con pendientes documentales (Ej: "falta certifico legal", "sin firma") */
  WITH_OBSERVATIONS = 'WITH_OBSERVATIONS',
}

/**
 * Naturaleza del valor económico del contrato.
 */
export enum AmountType {
  /** Cuantía monetaria fija determinada */
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  /** Contrato marco cuya ejecución es la sumatoria de sus contratos específicos */
  SUMMATION = 'SUMMATION',
  /** Suplemento o acuerdo marco que no refiere valor económico directo */
  NO_VALUE_REFERRED = 'NO_VALUE_REFERRED',
}

/**
 * Modalidad de vigencia temporal del instrumento contractual.
 */
export enum ValidityType {
  /** Vigencia hasta una fecha calendario exacta */
  SPECIFIC_DATE = 'SPECIFIC_DATE',
  /** Vigente hasta el cumplimiento total de las obligaciones ("Cmpto de las Oblig") */
  OBLIGATIONS_FULFILLMENT = 'OBLIGATIONS_FULFILLMENT',
  /** Vigencia indeterminada en el tiempo ("Indefinido") */
  INDEFINITE = 'INDEFINITE',
}

/**
 * Estado de ejecución de un acuerdo adoptado por el Comité de Contratación.
 */
export enum ResolutionStatus {
  /** En plazo de ejecución */
  PENDING = 'PENDING',
  /** Ejecutado satisfactoriamente */
  FULFILLED = 'FULFILLED',
  /** Incumplido fuera de fecha */
  UNFULFILLED = 'UNFULFILLED',
}

/**
 * Naturaleza jurídica de la contraparte contractual.
 */
export enum LegalNature {
  /** Empresa Estatal / OSDE (GEYSEL, INEL, ATI, etc.) */
  STATE_ENTERPRISE = 'STATE_ENTERPRISE',
  /** Unidad Empresarial de Base */
  UEB = 'UEB',
  /** CPA, CCS, CNA (Ej: CPA Carlos Marx) */
  COOPERATIVE = 'COOPERATIVE',
  /** MIPYME / SRL / S.A. (Ej: SEPSA, Islazul) */
  SME_LLC = 'SME_LLC',
  /** Trabajador por Cuenta Propia (TCP) */
  SELF_EMPLOYED = 'SELF_EMPLOYED',
  /** Otra naturaleza no clasificada */
  OTHER = 'OTHER',
}

/**
 * Metadatos visuales asociados a cada estado según la hoja "Leyenda" del Excel.
 * Útil para exponer un endpoint de configuración hacia el Frontend.
 */
export const REQUEST_STATUS_METADATA: Record<
  RequestStatus,
  { label: string; colorHex: string; order: number }
> = {
  [RequestStatus.MISSING_DATA]: {
    label: 'Faltan datos',
    colorHex: '#E91E63',
    order: 1,
  },
  [RequestStatus.PENDING_UEB_CC]: {
    label: 'Pendiente en CC de la UEB',
    colorHex: '#95A5A6',
    order: 2,
  },
  [RequestStatus.REJECTED_UEB_CC]: {
    label: 'No se aprobó en el CC de la UEB',
    colorHex: '#E67E22',
    order: 3,
  },
  [RequestStatus.PENDING_COMPANY]: {
    label: 'Enviado al CC de la Empresa (Pendiente)',
    colorHex: '#1E8449',
    order: 4,
  },
  [RequestStatus.REJECTED_COMPANY]: {
    label: 'No se aprobó en el CC de la Empresa',
    colorHex: '#7E5109',
    order: 5,
  },
  [RequestStatus.APPROVED_COMPANY]: {
    label: 'Aprobado por la Empresa',
    colorHex: '#2ECC71',
    order: 6,
  },
  [RequestStatus.APPROVED_OK]: {
    label: 'Está aprobado y OK',
    colorHex: '#FFFFFF',
    order: 7,
  },
  [RequestStatus.CANCELLED]: {
    label: 'Cancelado',
    colorHex: '#1B4F72',
    order: 8,
  },
};
