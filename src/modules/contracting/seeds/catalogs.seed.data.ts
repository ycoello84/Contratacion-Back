import { LegalNature } from '../enums/contracting.enums.js';

/** Catálogo inicial de Tipos de Contrato extraídos del Excel ECIE */
export const CONTRACT_TYPES_SEED = [
  { code: 'PRESTACION_SERVICIOS', name: 'Contrato de Prestación de Servicios' },
  { code: 'COMPRAVENTA', name: 'Contrato de Compraventa' },
  { code: 'TRANSPORTACION', name: 'Contrato de Transportación' },
  { code: 'EJECUCION_OBRA', name: 'Contrato de Ejecución de Obras' },
  { code: 'SUMINISTRO', name: 'Contrato Marco de Suministro' },
  { code: 'INVESTIGACION', name: 'Contrato General de Investigaciones Aplicadas' },
  { code: 'CAPACITACION', name: 'Contrato de Prestación de Servicios de Capacitación' },
  { code: 'ALQUILER_EQUIPOS', name: 'Contrato de Alquiler de Equipos' },
  { code: 'SEGURIDAD_PROTECCION', name: 'Contrato de Servicios de Seguridad y Protección' },
];

/** Catálogo inicial de Áreas Especializadas de la ECIE */
export const SPECIALIZED_AREAS_SEED = [
  { code: 'CONST_INV', name: 'Construcción e Inversiones' },
  { code: 'EQ_TRANSP', name: 'Equipo y Transporte' },
  { code: 'CO_TRANSMISION', name: 'CO Transmisión' },
  { code: 'CO_COMPRAS_SERV', name: 'CO Compras y Servicios' },
  { code: 'RRHH', name: 'Recursos Humanos' },
  { code: 'SEG_PROT', name: 'Seguridad y Protección' },
  { code: 'ORG_SISTEMA', name: 'Organización y Sistema' },
  { code: 'COMUNICACIONES', name: 'Comunicaciones' },
  { code: 'ENERGETICA', name: 'Energética' },
  { code: 'CLIENTE_1', name: 'Cliente No.1' },
  { code: 'CLIENTE_2', name: 'Cliente No.2' },
];

/** Catálogo inicial de Contrapartes normalizadas (evitando duplicidades ortográficas) */
export const COUNTERPARTIES_SEED = [
  {
    officialName: 'Empresa de Grupos Electrógenos y Servicios Eléctricos',
    acronym: 'GEYSEL',
    parentAgency: 'UNE / MINEM',
    legalNature: LegalNature.STATE_ENTERPRISE,
  },
  {
    officialName: 'Empresa Constructora de Obras para el Turismo Ramón de Antilla',
    acronym: 'ECOT Ramón de Antilla',
    parentAgency: 'MINTUR',
    legalNature: LegalNature.STATE_ENTERPRISE,
  },
  {
    officialName: 'Servicios Especializados de Protección S.A., UEB SEPSA Holguín',
    acronym: 'SEPSA Holguín',
    parentAgency: 'MININT',
    legalNature: LegalNature.SME_LLC,
  },
  {
    officialName: 'Empresa Agencia de Protección Contra Incendios APCI Moa',
    acronym: 'APCI Moa',
    parentAgency: 'MININT',
    legalNature: LegalNature.STATE_ENTERPRISE,
  },
  {
    officialName: 'Empresa de Tecnología de la Información y Automática, UEB ATI Santiago',
    acronym: 'ATI Santiago',
    parentAgency: 'UNE / MINEM',
    legalNature: LegalNature.STATE_ENTERPRISE,
  },
  {
    officialName: 'Cooperativa de Producción Agropecuaria Carlos Marx',
    acronym: 'CPA Carlos Marx',
    parentAgency: 'ANAP',
    legalNature: LegalNature.COOPERATIVE,
  },
  {
    officialName: 'Grupo Empresarial Hotelero Islazul S.A.',
    acronym: 'Islazul S.A.',
    parentAgency: 'MINTUR',
    legalNature: LegalNature.SME_LLC,
  },
  {
    officialName: 'Empresa Productora y Comercializadora de Semillas, UEB Semillas Holguín',
    acronym: 'UEB Semillas Holguín',
    parentAgency: 'MINAG',
    legalNature: LegalNature.UEB,
  },
  {
    officialName: 'Unidad Empresarial de Base de Recuperación y Ventas Holguín',
    acronym: 'UEB Recuperación Holguín',
    parentAgency: 'MINDUS',
    legalNature: LegalNature.UEB,
  },
  {
    officialName: 'Rubisel Almarales Hernández',
    acronym: 'TCP Rubisel Almarales',
    parentAgency: null,
    legalNature: LegalNature.SELF_EMPLOYED,
  },
  {
    officialName: 'Joel Ignacio Garcés Prieto',
    acronym: 'TCP Joel Ignacio Garcés',
    parentAgency: null,
    legalNature: LegalNature.SELF_EMPLOYED,
  },
  {
    officialName: 'Empresa de Revisión Técnica Automotor, UEB ERTA Oriente',
    acronym: 'UEB ERTA Oriente',
    parentAgency: 'MITRANS',
    legalNature: LegalNature.UEB,
  },
  {
    officialName: 'Empresa Nacional de Gases Industriales, UEB Gases Holguín',
    acronym: 'UEB Gases Holguín',
    parentAgency: 'MINDUS',
    legalNature: LegalNature.UEB,
  },
  {
    officialName: 'Empresa Comercial del Cemento, UEB Holguín',
    acronym: 'UEB Cemento Holguín',
    parentAgency: 'MICONS',
    legalNature: LegalNature.UEB,
  },
  {
    officialName: 'Empresa de Calzado COMBELL, UEB Calzado Jesús Argüelles Hidalgo',
    acronym: 'UEB Calzado COMBELL',
    parentAgency: 'MINDUS',
    legalNature: LegalNature.UEB,
  },
  {
    officialName: 'Empresa Taxi-Cuba, UEB Taxi Holguín',
    acronym: 'UEB Taxi Holguín',
    parentAgency: 'MITRANS',
    legalNature: LegalNature.UEB,
  },
  {
    officialName: 'Empresa de Ingeniería y Proyectos de la Electricidad',
    acronym: 'INEL',
    parentAgency: 'UNE / MINEM',
    legalNature: LegalNature.STATE_ENTERPRISE,
  },
];
