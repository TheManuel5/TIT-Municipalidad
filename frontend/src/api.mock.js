/**
 * api.mock.js - Simulación completa del Contrato de API REST
 * Municipalidad de San Pablo - Plan Informático Municipal 2027-2031 (Proyecto A)
 * Cumple con los endpoints definidos en docs/contrato-api.md
 * Datos iniciales: 106 activos del informe (64 PC, 18 Impresoras, 14 Red, 2 Servidores, 8 Apps)
 */

const STORAGE_KEY_ACTIVOS = 'san_pablo_activos_v1';
const STORAGE_KEY_HISTORIAL = 'san_pablo_historial_v1';
const STORAGE_KEY_AUTH = 'san_pablo_auth_user_v1';
const STORAGE_KEY_CONCILIACIONES = 'san_pablo_conciliaciones_v1';

// Catálogos institucionales
export const CATALOGOS = {
  categorias: ['PC', 'Portátil', 'Servidor', 'Red', 'Impresora', 'Software', 'Nube'],
  estados_operativos: ['Bueno', 'Regular', 'Malo', 'En reparación', 'De baja'],
  unidades: [
    'Alcaldía',
    'Secretaría Municipal',
    'Control',
    'SECPLAN',
    'Juzgado de Policía Local',
    'Asesoría Jurídica',
    'DOM',
    'Aseo y Ornato',
    'DIDECO',
    'Salud',
    'Educación',
    'DAF',
    'Informática'
  ],
  criticidades: ['Alta', 'Media', 'Baja'],
  tipos_mantenimiento: ['Preventiva', 'Correctiva', 'Sin mantención']
};

// 3 Usuarios de prueba iniciales (uno por cada rol)
export const USUARIOS_PRUEBA = [
  {
    id: 1,
    username: 'admin',
    password: 'password123',
    nombre: 'Felipe Oyarzún Mansilla',
    rol: 'admin_ti',
    unidad: 'Informática'
  },
  {
    id: 2,
    username: 'jefe_dideco',
    password: 'password123',
    nombre: 'Marcela Huenchumán Soto',
    rol: 'jefatura',
    unidad: 'DIDECO'
  },
  {
    id: 3,
    username: 'auditor',
    password: 'password123',
    nombre: 'Luis Contreras Paredes',
    rol: 'lectura',
    unidad: 'Control'
  }
];

// Generador de los 106 activos del informe
function generarSeedActivos() {
  const activos = [];

  // Helper para generar fechas
  const pad = (n) => String(n).padStart(4, '0');

  // 1. Servidores (2 locales en Sala de Servidores Consistorial)
  activos.push({
    id_activo: 'SP-SRV-0001',
    categoria: 'Servidor',
    marca_modelo: 'Dell PowerEdge R440 Rack 1U',
    descripcion: 'Xeon Silver 4210R, 64GB RAM, 4x2TB SAS RAID 10. Servidor Principal BD y Directorio',
    ubicacion: 'Edificio Consistorial - Sala Servidores TI',
    unidad: 'Informática',
    custodio: 'Felipe Oyarzún Mansilla',
    estado_operativo: 'Bueno',
    ultimo_mantenimiento: '2026-10-10',
    tipo_mantenimiento: 'Preventiva',
    criticidad: 'Alta',
    proceso_asociado: 'Todos los procesos (S-01, S-04)',
    fecha_adquisicion: '2023-05-15',
    fecha_garantia: '2026-12-15', // Alerta por vencer
    licencias_asociadas: 'Windows Server 2022 Standard (16 Cores)',
    proveedor: 'Sistemas & Redes Austral SpA',
    contrato_oc: 'OC 4521-10-SE23',
    costo_inicial: 2400000,
    costo_anual: 300000,
    configuracion_red: 'IP 192.168.1.10 / VLAN 10 (Gestión) / BIOS v2.14 / WinServer 22H2',
    fecha_revision: '2026-11-05',
    responsable_revision: 'Felipe Oyarzún Mansilla',
    motivo_baja: null
  });

  activos.push({
    id_activo: 'SP-SRV-0002',
    categoria: 'Servidor',
    marca_modelo: 'HPE ProLiant DL380 Gen10',
    descripcion: 'Xeon Silver 4110, 32GB RAM, 8x1TB SATA. Servidor de Respaldos Locales y Archivos',
    ubicacion: 'Edificio Consistorial - Sala Servidores TI',
    unidad: 'Informática',
    custodio: 'Felipe Oyarzún Mansilla',
    estado_operativo: 'Regular',
    ultimo_mantenimiento: '2026-09-02',
    tipo_mantenimiento: 'Preventiva',
    criticidad: 'Alta',
    proceso_asociado: 'Proceso B, F (Respaldos)',
    fecha_adquisicion: '2022-03-20',
    fecha_garantia: '2025-03-20', // Vencida
    licencias_asociadas: 'Ubuntu Server LTS / Veeam Backup Community',
    proveedor: 'Tecnologías del Sur Ltda.',
    contrato_oc: 'OC 4521-04-SE22',
    costo_inicial: 2400000,
    costo_anual: 300000,
    configuracion_red: 'IP 192.168.1.15 / VLAN 10 / Ubuntu 22.04 LTS',
    fecha_revision: '2026-10-25',
    responsable_revision: 'Felipe Oyarzún Mansilla',
    motivo_baja: null
  });

  // 2. Red y Comunicaciones (10 switches + 4 routers de borde) = 14
  const switches = [
    { loc: 'Piso 1 - Edificio Consistorial', un: 'Informática', ip: '192.168.1.2', mod: 'Cisco Catalyst 2960X-24TS-L' },
    { loc: 'Piso 2 - Edificio Consistorial (DOM)', un: 'DOM', ip: '192.168.1.3', mod: 'Cisco Catalyst 2960X-24TS-L' },
    { loc: 'Piso 3 - Alcaldía y SECPLAN', un: 'SECPLAN', ip: '192.168.1.4', mod: 'Cisco Catalyst 2960X-24TS-L' },
    { loc: 'DIDECO - Sede Central San Pablo', un: 'DIDECO', ip: '192.168.20.2', mod: 'Cisco Catalyst 2960-Plus 24' },
    { loc: 'Consultorio General San Pablo', un: 'Salud', ip: '192.168.30.2', mod: 'HP Aruba 2530-24G' },
    { loc: 'Posta Rural Quilacahuín', un: 'Salud', ip: '192.168.31.2', mod: 'D-Link DGS-1210-24' },
    { loc: 'Posta Rural Trumao', un: 'Salud', ip: '192.168.32.2', mod: 'D-Link DGS-1210-10' },
    { loc: 'Departamento de Educación (DAEM)', un: 'Educación', ip: '192.168.40.2', mod: 'Cisco Catalyst 2960-Plus 24' },
    { loc: 'Juzgado de Policía Local', un: 'Juzgado de Policía Local', ip: '192.168.50.2', mod: 'HP Aruba 2530-8G' },
    { loc: 'Bodega Municipal y Taller Aseo', un: 'Aseo y Ornato', ip: '192.168.60.2', mod: 'TP-Link JetStream 16P' },
  ];

  switches.forEach((sw, idx) => {
    activos.push({
      id_activo: `SP-NET-${pad(idx + 1)}`,
      categoria: 'Red',
      marca_modelo: `Switch ${sw.mod}`,
      descripcion: `Switch de distribución acceso ${sw.loc}`,
      ubicacion: sw.loc,
      unidad: sw.un,
      custodio: 'Felipe Oyarzún Mansilla',
      estado_operativo: idx === 6 ? 'Regular' : 'Bueno',
      ultimo_mantenimiento: '2026-08-15',
      tipo_mantenimiento: 'Preventiva',
      criticidad: idx < 3 ? 'Alta' : 'Media',
      proceso_asociado: 'Infraestructura de Red (S-08)',
      fecha_adquisicion: '2023-01-15',
      fecha_garantia: idx === 1 ? '2026-12-30' : '2027-01-15', // Alerta en switch 2
      licencias_asociadas: 'Firmware propietario fabricante',
      proveedor: 'Conectividad & Redes Patagonia SpA',
      contrato_oc: 'OC 4521-02-SE23',
      costo_inicial: 450000,
      costo_anual: 25000,
      configuracion_red: `IP ${sw.ip} / VLAN 10-60 / IOS 15.2`,
      fecha_revision: '2026-10-12',
      responsable_revision: 'Felipe Oyarzún Mansilla',
      motivo_baja: null
    });
  });

  const routers = [
    { loc: 'Consistorial - Enlace Principal', ip: '192.168.1.1', mod: 'Fortinet FortiGate 60F', cr: 'Alta' },
    { loc: 'Consistorial - Enlace Respaldo 4G', ip: '192.168.1.254', mod: 'MikroTik Cloud Router RB4011', cr: 'Alta' },
    { loc: 'DIDECO San Pablo Urbano', ip: '192.168.20.1', mod: 'MikroTik hEX S RouterBoard', cr: 'Media' },
    { loc: 'Consultorio General San Pablo', ip: '192.168.30.1', mod: 'MikroTik hEX S RouterBoard', cr: 'Media' },
  ];

  routers.forEach((r, idx) => {
    activos.push({
      id_activo: `SP-NET-${pad(idx + 11)}`,
      categoria: 'Red',
      marca_modelo: `Router Firewall ${r.mod}`,
      descripcion: `Router de borde y gateway seguro para ${r.loc}`,
      ubicacion: r.loc,
      unidad: 'Informática',
      custodio: 'Felipe Oyarzún Mansilla',
      estado_operativo: 'Bueno',
      ultimo_mantenimiento: '2026-09-10',
      tipo_mantenimiento: 'Preventiva',
      criticidad: r.cr,
      proceso_asociado: 'Seguridad y Conectividad Perimetral',
      fecha_adquisicion: '2024-04-10',
      fecha_garantia: '2027-04-10',
      licencias_asociadas: idx === 0 ? 'FortiCare Unified Threat Protection (UTP)' : 'RouterOS Level 5',
      proveedor: 'Conectividad & Redes Patagonia SpA',
      contrato_oc: 'OC 4521-14-SE24',
      costo_inicial: 850000,
      costo_anual: 75000,
      configuracion_red: `IP ${r.ip} / VLAN Troncal / FortiOS 7.2.5`,
      fecha_revision: '2026-11-02',
      responsable_revision: 'Felipe Oyarzún Mansilla',
      motivo_baja: null
    });
  });

  // 3. Aplicaciones y Sistemas Municipales (8 aplicaciones según A-10 y sección 6.1)
  const softwareApps = [
    { id: 'SP-SW-0001', nombre: 'DocDigital (Gobierno Digital)', prov: 'División de Gobierno Digital', un: 'Secretaría Municipal', tco_ini: 0, tco_rec: 0, gar: '2027-12-31', crit: 'Alta' },
    { id: 'SP-SW-0002', nombre: 'Plataforma SIMPLE (Trámites Vecinales)', prov: 'División de Gobierno Digital', un: 'DIDECO', tco_ini: 0, tco_rec: 0, gar: '2027-12-31', crit: 'Alta' },
    { id: 'SP-SW-0003', nombre: 'Sistema de Contabilidad y Presupuesto CAS-Chile', prov: 'CAS-Chile S.A.', un: 'DAF', tco_ini: 1800000, tco_rec: 950000, gar: '2026-12-31', crit: 'Alta' }, // Alerta por vencer
    { id: 'SP-SW-0004', nombre: 'Sistema de Personal y Remuneraciones SIGPER', prov: 'Sistemas de Gestión SpA', un: 'DAF', tco_ini: 1200000, tco_rec: 600000, gar: '2027-06-30', crit: 'Alta' },
    { id: 'SP-SW-0005', nombre: 'Sistema Registro Social de Hogares (RSH Conexión)', prov: 'MDSF / Subdere', un: 'DIDECO', tco_ini: 0, tco_rec: 0, gar: '2027-12-31', crit: 'Alta' },
    { id: 'SP-SW-0006', nombre: 'Plataforma de Expedientes y Obras DOM en Línea', prov: 'Soluciones Urbano Digital', un: 'DOM', tco_ini: 1500000, tco_rec: 450000, gar: '2027-08-15', crit: 'Media' },
    { id: 'SP-SW-0007', nombre: 'Servidor de Correo Institucional Zimbra Collaboration', prov: 'Open Source Community / Alojamiento Local', un: 'Informática', tco_ini: 0, tco_rec: 200000, gar: '2028-01-01', crit: 'Alta' },
    { id: 'SP-SW-0008', nombre: 'Consola Central Antivirus EDR Endpoint', prov: 'Seguridad Informática Chile Ltda.', un: 'Informática', tco_ini: 900000, tco_rec: 800000, gar: '2026-12-20', crit: 'Alta' }, // Alerta por vencer
  ];

  softwareApps.forEach((sw) => {
    activos.push({
      id_activo: sw.id,
      categoria: 'Software',
      marca_modelo: sw.nombre,
      descripcion: `Sistema institucional de soporte a procesos (${sw.un})`,
      ubicacion: 'Nube Estatal / Servidor Consistorial',
      unidad: sw.un,
      custodio: sw.un === 'Informática' ? 'Felipe Oyarzún Mansilla' : (sw.un === 'DIDECO' ? 'Marcela Huenchumán Soto' : 'Patricia Navarro Díaz'),
      estado_operativo: 'Bueno',
      ultimo_mantenimiento: '2026-10-20',
      tipo_mantenimiento: 'Preventiva',
      criticidad: sw.crit,
      proceso_asociado: `Procesos Municipales (${sw.un})`,
      fecha_adquisicion: '2024-01-01',
      fecha_garantia: sw.gar,
      licencias_asociadas: 'Licencia institucional suscripción anual / convenio estatal',
      proveedor: sw.prov,
      contrato_oc: 'Convenio Marco / Trato Directo Exento',
      costo_inicial: sw.tco_ini,
      costo_anual: sw.tco_rec,
      configuracion_red: 'Acceso HTTPS TLS 1.3 / API REST / SSO ClaveÚnica',
      fecha_revision: '2026-11-01',
      responsable_revision: 'Felipe Oyarzún Mansilla',
      motivo_baja: null
    });
  });

  // 4. Impresoras y Multifuncionales (18 unidades según informe 6.1)
  const impresorasConfig = [
    { un: 'Secretaría Municipal', loc: 'Oficina de Partes Ventanilla', mod: 'HP LaserJet Pro 4003dw', est: 'Bueno' },
    { un: 'Alcaldía', loc: 'Secretaría de Gabinete', mod: 'Epson EcoTank L5290', est: 'Bueno' },
    { un: 'DIDECO', loc: 'Atención Vecinal Central', mod: 'Ricoh Aficio MP 3055 Multifuncional', est: 'Bueno' },
    { un: 'DIDECO', loc: 'Equipo Territorial Quilacahuín', mod: 'HP LaserJet M111w', est: 'Regular' },
    { un: 'DIDECO', loc: 'Oficina Fomento Productivo', mod: 'Epson EcoTank L3250', est: 'Bueno' },
    { un: 'DOM', loc: 'Oficina Director de Obras', mod: 'HP DesignJet T230 Plotter 24"', est: 'Bueno' },
    { un: 'DOM', loc: 'Mesa de Entradas y Permisos', mod: 'Ricoh Aficio MP 2554 Multifuncional', est: 'Bueno' },
    { un: 'DAF', loc: 'Oficina de Rentas y Patentes', mod: 'HP LaserJet Pro MFP 4103fdw', est: 'Bueno' },
    { un: 'DAF', loc: 'Tesorería Municipal', mod: 'Epson EcoTank L4260', est: 'Bueno' },
    { un: 'DAF', loc: 'Oficina Adquisiciones e Inventario', mod: 'HP LaserJet Pro 4003dn', est: 'Bueno' },
    { un: 'Salud', loc: 'Consultorio San Pablo Admisión', mod: 'Ricoh Aficio MP 2014', est: 'Regular' },
    { un: 'Salud', loc: 'Posta Quilacahuín Box', mod: 'HP LaserJet M111w', est: 'Bueno' },
    { un: 'Salud', loc: 'Posta Trumao Box', mod: 'HP LaserJet M111w', est: 'Bueno' },
    { un: 'Educación', loc: 'DAEM San Pablo Administración', mod: 'HP LaserJet Pro MFP 4103fdw', est: 'Bueno' },
    { un: 'Juzgado de Policía Local', loc: 'Secretaría de Causas', mod: 'HP LaserJet Enterprise M507x', est: 'Bueno' },
    { un: 'Control', loc: 'Oficina Auditoría', mod: 'Epson EcoTank L3250', est: 'Bueno' },
    { un: 'Informática', loc: 'Taller de Soporte Consistorial', mod: 'Epson EcoTank L6270', est: 'En reparación' },
    { un: 'Aseo y Ornato', loc: 'Oficina Bodega Municipal', mod: 'HP LaserJet 1020 Legacy', est: 'De baja' },
  ];

  impresorasConfig.forEach((imp, idx) => {
    const isBaja = imp.est === 'De baja';
    activos.push({
      id_activo: `SP-PRN-${pad(idx + 1)}`,
      categoria: 'Impresora',
      marca_modelo: imp.mod,
      descripcion: `Impresora / Multifunción para soporte documental en ${imp.un}`,
      ubicacion: imp.loc,
      unidad: imp.un,
      custodio: imp.un === 'DIDECO' ? 'Marcela Huenchumán Soto' : (imp.un === 'Secretaría Municipal' ? 'Carolina Muñoz Vera' : 'Funcionario Asignado'),
      estado_operativo: imp.est,
      ultimo_mantenimiento: isBaja ? '2025-02-10' : '2026-08-20',
      tipo_mantenimiento: isBaja ? 'Correctiva' : 'Preventiva',
      criticidad: idx < 3 ? 'Alta' : 'Media',
      proceso_asociado: 'Proceso B (Custodia Documental y Decretos)',
      fecha_adquisicion: '2023-06-10',
      fecha_garantia: idx === 0 ? '2026-12-18' : '2027-06-10', // Alerta para la de Secretaría
      licencias_asociadas: 'Controlador PCL6 Oficial',
      proveedor: 'Ofimática Austral Ltda.',
      contrato_oc: 'OC 4521-08-SE23',
      costo_inicial: imp.mod.includes('Plotter') ? 1100000 : (imp.mod.includes('Ricoh') ? 850000 : 250000),
      costo_anual: 40000,
      configuracion_red: `IP 192.168.1.${50 + idx} / RAW Port 9100 / SNMP v2c`,
      fecha_revision: '2026-10-18',
      responsable_revision: 'Felipe Oyarzún Mansilla',
      motivo_baja: isBaja ? 'Falla en fusor térmico y obsolescencia de repuestos' : null
    });
  });

  // 5. Computadores y Portátiles (64 unidades según informe 6.1)
  const usuariosFicticios = [
    { nom: 'Carolina Muñoz Vera', un: 'Secretaría Municipal', ubi: 'Ventanilla Oficina de Partes', cat: 'PC', mod: 'HP ProDesk 400 G7 SFF' },
    { nom: 'Luis Contreras Paredes', un: 'Control', ubi: 'Oficina de Control y Auditoría', cat: 'PC', mod: 'Dell OptiPlex 3090 Micro' },
    { nom: 'Marcela Huenchumán Soto', un: 'DIDECO', ubi: 'Dirección DIDECO San Pablo', cat: 'Portátil', mod: 'Lenovo ThinkPad E14 Gen 4' },
    { nom: 'Rodrigo Alarcón Fuentes', un: 'DOM', ubi: 'Dirección de Obras Municipales', cat: 'PC', mod: 'HP ProDesk 600 G6 MT' },
    { nom: 'Patricia Navarro Díaz', un: 'DAF', ubi: 'Dirección Finanzas Piso 2', cat: 'PC', mod: 'Lenovo ThinkCentre M70q' },
    { nom: 'Felipe Oyarzún Mansilla', un: 'Informática', ubi: 'Jefatura de TI Consistorial', cat: 'Portátil', mod: 'Dell Latitude 5430 Rugged' },
    { nom: 'Claudio Arriagada Solís', un: 'SECPLAN', ubi: 'Oficina de Proyectos SECPLAN', cat: 'PC', mod: 'Dell OptiPlex 5090 SFF' },
    { nom: 'Claudia Silva Méndez', un: 'DIDECO', ubi: 'Equipo Territorial Quilacahuín', cat: 'Portátil', mod: 'Lenovo ThinkPad E14 Gen 4' },
    { nom: 'Jorge Barrientos P.', un: 'DIDECO', ubi: 'Equipo Territorial Trumao', cat: 'Portátil', mod: 'Lenovo ThinkPad E14 Gen 4' },
    { nom: 'Mónica Cárdenas V.', un: 'Salud', ubi: 'Consultorio San Pablo Box 1', cat: 'PC', mod: 'HP ProDesk 400 G7 SFF' },
    { nom: 'Raúl Santana Vargas', un: 'Salud', ubi: 'Posta Quilacahuín Estación', cat: 'Portátil', mod: 'HP ProBook 440 G8' },
    { nom: 'Verónica Ruiz Gómez', un: 'Educación', ubi: 'DAEM Subvenciones', cat: 'PC', mod: 'Lenovo ThinkCentre M70q' },
    { nom: 'Esteban Lagos Soto', un: 'Alcaldía', ubi: 'Gabinete Alcaldía', cat: 'Portátil', mod: 'Lenovo ThinkPad L13 Yoga' },
    { nom: 'Soledad Pardo C.', un: 'Juzgado de Policía Local', ubi: 'Actuaría Juzgado', cat: 'PC', mod: 'Dell OptiPlex 3090 Micro' },
    { nom: 'Gonzalo Vera H.', un: 'Asesoría Jurídica', ubi: 'Oficina Asesor Jurídico', cat: 'Portátil', mod: 'Dell Latitude 3420' },
    { nom: 'Mario Antillanca', un: 'Aseo y Ornato', ubi: 'Taller Municipal', cat: 'PC', mod: 'HP Compaq Pro 6300 Legacy' },
  ];

  const unidadesLista = [
    'DIDECO', 'DIDECO', 'DIDECO', 'DIDECO', 'DOM', 'DOM', 'DOM', 'DAF',
    'DAF', 'DAF', 'Secretaría Municipal', 'Secretaría Municipal', 'Salud',
    'Salud', 'Educación', 'Educación', 'SECPLAN', 'Alcaldía', 'Control', 'Informática'
  ];

  for (let i = 1; i <= 64; i++) {
    const preset = usuariosFicticios[i - 1];
    const cat = preset ? preset.cat : (i % 3 === 0 ? 'Portátil' : 'PC');
    const unidad = preset ? preset.un : unidadesLista[(i - 1) % unidadesLista.length];
    const custodio = preset ? preset.nom : `Funcionario ${unidad} ${i}`;
    const ubicacion = preset ? preset.ubi : `Oficina ${unidad} - Puesto ${i}`;
    const marcaModelo = preset ? preset.mod : (cat === 'Portátil' ? 'Lenovo ThinkPad E14' : 'HP ProDesk 400 G7');

    let estado = 'Bueno';
    let motivoBaja = null;
    let criticidad = (i <= 10) ? 'Alta' : (i <= 40 ? 'Media' : 'Baja');

    // Algunos equipos con estados variados o baja
    if (i === 16) {
      estado = 'De baja';
      motivoBaja = 'Equipo legacy del año 2013 con falla en condensadores y fuente (A-01)';
    } else if (i === 22) {
      estado = 'De baja';
      motivoBaja = 'Dañado por filtración de agua en bodega municipal (baja administrativa)';
    } else if (i === 35) {
      estado = 'En reparación';
    } else if (i === 48) {
      estado = 'Regular';
    }

    // Alerta de garantía en 2 equipos para prueba de 60 días
    let fechaGarantia = '2027-04-20';
    if (i === 3) {
      fechaGarantia = '2026-12-10'; // < 30 días
    } else if (i === 7) {
      fechaGarantia = '2026-12-28'; // < 45 días
    } else if (i === 16 || i === 22) {
      fechaGarantia = '2016-05-10'; // Expirada hace años
    }

    // Datos incompletos a propósito en algunos registros (como pide el informe)
    const sinIP = (i === 12 || i === 29 || i === 51);
    const sinMantenimiento = (i === 18 || i === 41);

    activos.push({
      id_activo: `SP-HW-${pad(i)}`,
      categoria: cat,
      marca_modelo: marcaModelo,
      descripcion: `${cat === 'Portátil' ? 'Notebook' : 'Equipo Escritorio'} Corporativo Intel Core i5, 16GB RAM, SSD 512GB`,
      ubicacion: ubicacion,
      unidad: unidad,
      custodio: custodio,
      estado_operativo: estado,
      ultimo_mantenimiento: sinMantenimiento ? null : '2026-09-15',
      tipo_mantenimiento: sinMantenimiento ? 'Sin mantención' : 'Preventiva',
      criticidad: criticidad,
      proceso_asociado: unidad === 'DIDECO' ? 'Proceso A (Solicitudes)' : (unidad === 'Secretaría Municipal' ? 'Proceso B (Expedientes)' : 'Operación General'),
      fecha_adquisicion: i <= 20 ? '2024-03-15' : '2025-01-20',
      fecha_garantia: fechaGarantia,
      licencias_asociadas: 'Windows 11 Pro OEM, Microsoft Office 2021 Hogar y Empresas',
      proveedor: 'Proveedor TI Sur Ltda.',
      contrato_oc: `OC 4521-${String(10 + (i % 8))}-SE24`,
      costo_inicial: cat === 'Portátil' ? 680000 : 590000,
      costo_anual: 0,
      configuracion_red: sinIP ? null : `192.168.${10 + (i % 40)}.${10 + (i % 200)} / VLAN ${10 + (i % 5)*10} / Win 11 Pro 22H2 BitLocker: ON`,
      fecha_revision: '2026-10-30',
      responsable_revision: 'Felipe Oyarzún Mansilla',
      motivo_baja: motivoBaja
    });
  }

  return activos;
}

// Historial inicial
function generarSeedHistorial() {
  return [
    {
      id: 1,
      id_activo: 'SP-HW-0003',
      fecha: '2025-01-15T10:00:00Z',
      tipo_evento: 'IMPORTACION',
      usuario: 'Felipe Oyarzún Mansilla',
      unidad_origen: null,
      unidad_destino: 'DIDECO',
      custodio_anterior: null,
      custodio_nuevo: 'Marcela Huenchumán Soto',
      motivo: 'Alta inicial de equipamiento Plan Informático',
      detalles: 'Ingreso al inventario general con verificación física y etiquetado con código de barra.'
    },
    {
      id: 2,
      id_activo: 'SP-HW-0003',
      fecha: '2026-04-12T15:30:00Z',
      tipo_evento: 'TRASLADO',
      usuario: 'Felipe Oyarzún Mansilla',
      unidad_origen: 'DIDECO Central',
      unidad_destino: 'DIDECO - Equipo Territorial Quilacahuín',
      custodio_anterior: 'Marcela Huenchumán Soto',
      custodio_nuevo: 'Claudia Silva Méndez',
      motivo: 'Reasignación a operativo social en terreno sector rural',
      detalles: 'Entrega en terreno con acta de responsabilidad firmada conforme a Ley 18.695.'
    },
    {
      id: 3,
      id_activo: 'SP-HW-0016',
      fecha: '2026-07-20T11:15:00Z',
      tipo_evento: 'BAJA',
      usuario: 'Felipe Oyarzún Mansilla',
      unidad_origen: 'Aseo y Ornato',
      unidad_destino: 'Aseo y Ornato',
      custodio_anterior: 'Mario Antillanca',
      custodio_nuevo: null,
      motivo: 'Equipo legacy con falla en placa madre no reparable',
      detalles: 'Baja decretada según Informe Técnico TI N° 04-2026. Almacenado en bodega para enajenación.'
    }
  ];
}

// Inicializar almacenamiento local
function initStorage() {
  if (!localStorage.getItem(STORAGE_KEY_ACTIVOS)) {
    const iniciales = generarSeedActivos();
    localStorage.setItem(STORAGE_KEY_ACTIVOS, JSON.stringify(iniciales));
  }
  if (!localStorage.getItem(STORAGE_KEY_HISTORIAL)) {
    const inicialesH = generarSeedHistorial();
    localStorage.setItem(STORAGE_KEY_HISTORIAL, JSON.stringify(inicialesH));
  }
  if (!localStorage.getItem(STORAGE_KEY_CONCILIACIONES)) {
    localStorage.setItem(STORAGE_KEY_CONCILIACIONES, JSON.stringify([]));
  }
}

// Helpers
function getStoredActivos() {
  initStorage();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_ACTIVOS) || '[]');
  } catch (e) {
    return [];
  }
}

function saveStoredActivos(activos) {
  localStorage.setItem(STORAGE_KEY_ACTIVOS, JSON.stringify(activos));
}

function getStoredHistorial() {
  initStorage();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORIAL) || '[]');
  } catch (e) {
    return [];
  }
}

function saveStoredHistorial(historial) {
  localStorage.setItem(STORAGE_KEY_HISTORIAL, JSON.stringify(historial));
}

function getStoredConciliaciones() {
  initStorage();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_CONCILIACIONES) || '[]');
  } catch (e) {
    return [];
  }
}

function saveStoredConciliaciones(conciliaciones) {
  localStorage.setItem(STORAGE_KEY_CONCILIACIONES, JSON.stringify(conciliaciones));
}

function getSessionUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH);
    return raw ? JSON.parse(raw) : USUARIOS_PRUEBA[0]; // Default admin si no hay sesión
  } catch (e) {
    return USUARIOS_PRUEBA[0];
  }
}

// Función que aplica las reglas de visibilidad por ROL (Contrato API sección 3)
function aplicarFiltroRol(activo, user) {
  if (!activo) return null;
  const copia = { ...activo };

  // Si no es admin_ti, los campos estrictamente reservados se ocultan
  if (!user || user.rol !== 'admin_ti') {
    copia.criticidad = '[RESERVADO]';
    copia.configuracion_red = '[RESERVADO - Conf. de red / IP / versión]';
  }

  return copia;
}

// Simular retraso de red
const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================
// EXPORTACIÓN DE LA API MOCK CON LOS 13 ENDPOINTS
// ==========================================
export const apiMock = {
  // 1. POST /api/auth/login
  async login(username, password) {
    await delay();
    const user = USUARIOS_PRUEBA.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (!user || password !== 'password123') {
      const err = new Error('Credenciales incorrectas. Verifique usuario o contraseña.');
      err.status = 401;
      throw err;
    }

    const token = `mock-jwt-token-for-${user.username}-${Date.now()}`;
    const userData = {
      id: user.id,
      username: user.username,
      nombre: user.nombre,
      rol: user.rol,
      unidad: user.unidad
    };

    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(userData));
    return {
      success: true,
      data: {
        token,
        user: userData
      }
    };
  },

  // Obtener usuario activo
  getCurrentUser() {
    return getSessionUser();
  },

  // 2. GET /api/activos
  async getActivos({ q = '', categoria = '', estado = '', unidad = '', page = 1, limit = 10 } = {}) {
    await delay();
    const currentUser = getSessionUser();
    let lista = getStoredActivos();

    // REGLA DE ROL: jefatura solo ve su propia unidad
    if (currentUser.rol === 'jefatura') {
      lista = lista.filter((a) => a.unidad.toLowerCase() === currentUser.unidad.toLowerCase());
    } else if (unidad) {
      lista = lista.filter((a) => a.unidad.toLowerCase() === unidad.toLowerCase());
    }

    // Filtro por categoría
    if (categoria) {
      lista = lista.filter((a) => a.categoria.toLowerCase() === categoria.toLowerCase());
    }

    // Filtro por estado
    if (estado) {
      lista = lista.filter((a) => a.estado_operativo.toLowerCase() === estado.toLowerCase());
    }

    // Búsqueda q libre
    if (q) {
      const query = q.toLowerCase().trim();
      lista = lista.filter(
        (a) =>
          a.id_activo.toLowerCase().includes(query) ||
          a.marca_modelo.toLowerCase().includes(query) ||
          (a.custodio && a.custodio.toLowerCase().includes(query)) ||
          (a.ubicacion && a.ubicacion.toLowerCase().includes(query)) ||
          (a.descripcion && a.descripcion.toLowerCase().includes(query))
      );
    }

    const total = lista.length;
    const startIndex = (page - 1) * limit;
    const paginados = lista.slice(startIndex, startIndex + limit);

    // Aplicar máscaras de rol a cada ítem
    const data = paginados.map((a) => aplicarFiltroRol(a, currentUser));

    return {
      success: true,
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  },

  // 3. GET /api/activos/:id
  async getActivoById(id) {
    await delay();
    const currentUser = getSessionUser();
    const lista = getStoredActivos();
    const activo = lista.find((a) => a.id_activo.toUpperCase() === id.toUpperCase());

    if (!activo) {
      const err = new Error(`Activo con código ${id} no encontrado.`);
      err.status = 404;
      throw err;
    }

    // Si es jefatura y no pertenece a su unidad -> 403 Forbidden
    if (currentUser.rol === 'jefatura' && activo.unidad.toLowerCase() !== currentUser.unidad.toLowerCase()) {
      const err = new Error(`Acceso denegado: este activo pertenece a la unidad ${activo.unidad}.`);
      err.status = 403;
      throw err;
    }

    return {
      success: true,
      data: aplicarFiltroRol(activo, currentUser)
    };
  },

  // 4. GET /api/activos/:id/historial
  async getHistorial(id) {
    await delay();
    const historial = getStoredHistorial();
    const filtrado = historial
      .filter((h) => h.id_activo.toUpperCase() === id.toUpperCase())
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return {
      success: true,
      data: filtrado
    };
  },

  // 5. GET /api/alertas?dias=60
  async getAlertas(dias = 60) {
    await delay();
    const lista = getStoredActivos();
    const currentUser = getSessionUser();
    const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' });
    const hoyMs = Date.parse(`${hoy}T00:00:00Z`);

    let accesibles = lista;
    if (currentUser.rol === 'jefatura') {
      accesibles = accesibles.filter((a) => a.unidad.toLowerCase() === currentUser.unidad.toLowerCase());
    }

    const garantiasPorVencer = [];
    const licenciasPorVencer = [];

    accesibles.forEach((a) => {
      if (a.estado_operativo === 'De baja') return;

      if (a.fecha_garantia) {
        const fechaMs = Date.parse(`${a.fecha_garantia}T00:00:00Z`);
        const diffDias = Math.round((fechaMs - hoyMs) / (1000 * 60 * 60 * 24));
        if (diffDias >= 0 && diffDias <= Number(dias)) {
          if (a.categoria === 'Software') {
            licenciasPorVencer.push({
              id_activo: a.id_activo,
              nombre_software: a.marca_modelo,
              unidad: a.unidad,
              fecha_vencimiento: a.fecha_garantia,
              dias_restantes: diffDias,
              costo_renovacion: a.costo_anual || 0
            });
          } else {
            garantiasPorVencer.push({
              id_activo: a.id_activo,
              marca_modelo: a.marca_modelo,
              categoria: a.categoria,
              unidad: a.unidad,
              custodio: a.custodio,
              fecha_garantia: a.fecha_garantia,
              dias_restantes: diffDias,
              proveedor: a.proveedor
            });
          }
        }
      }
    });

    return {
      success: true,
      data: {
        garantias_por_vencer: garantiasPorVencer.sort((a, b) => a.dias_restantes - b.dias_restantes),
        licencias_por_vencer: licenciasPorVencer.sort((a, b) => a.dias_restantes - b.dias_restantes)
      }
    };
  },

  // 6. GET /api/catalogos
  async getCatalogos() {
    await delay(50);
    return {
      success: true,
      data: CATALOGOS
    };
  },

  // 7. POST /api/activos (Alta)
  async createActivo(payload) {
    await delay();
    const currentUser = getSessionUser();
    if (currentUser.rol !== 'admin_ti') {
      const err = new Error('Solo el rol admin_ti puede dar de alta nuevos activos.');
      err.status = 403;
      throw err;
    }

    if (payload.recepcion_verificada !== true) {
      const err = new Error('Confirme la verificación física y documental de la recepción antes de registrar el activo.');
      err.status = 400;
      throw err;
    }

    if (!payload.id_activo || !payload.id_activo.trim()) {
      const err = new Error('El ID de activo es obligatorio.');
      err.status = 400;
      throw err;
    }
    if (!String(payload.contrato_oc || '').trim()) {
      const err = new Error('La orden de compra o contrato es obligatoria para documentar la recepción.');
      err.status = 400;
      throw err;
    }

    const lista = getStoredActivos();
    const idNormalizado = payload.id_activo.trim().toUpperCase();
    if (lista.some((a) => a.id_activo.toUpperCase() === idNormalizado)) {
      const err = new Error(`El código de activo ${idNormalizado} ya se encuentra registrado.`);
      err.status = 409;
      throw err;
    }

    const datosActivo = { ...payload };
    delete datosActivo.recepcion_verificada;
    const nuevo = {
      ...datosActivo,
      id_activo: idNormalizado,
      costo_inicial: Number(payload.costo_inicial) || 0,
      costo_anual: Number(payload.costo_anual) || 0,
      fecha_revision: new Date().toISOString().split('T')[0],
      responsable_revision: currentUser.nombre,
      motivo_baja: null
    };

    lista.unshift(nuevo);
    saveStoredActivos(lista);

    // Registro automático en historial
    const historial = getStoredHistorial();
    historial.push({
      id: Date.now(),
      id_activo: idNormalizado,
      fecha: new Date().toISOString(),
      tipo_evento: 'ALTA',
      usuario: currentUser.nombre,
      unidad_origen: null,
      unidad_destino: nuevo.unidad,
      custodio_anterior: null,
      custodio_nuevo: nuevo.custodio,
      motivo: `Alta inicial en sistema bajo OC ${nuevo.contrato_oc || 'Directa'}`,
      detalles: `Recepción física y documental verificada por ${currentUser.nombre} antes del alta; documento: ${nuevo.contrato_oc || 'Sin OC registrada'}.`
    });
    saveStoredHistorial(historial);

    return {
      success: true,
      message: 'Activo registrado exitosamente con bitácora de auditoría.',
      data: { id_activo: idNormalizado }
    };
  },

  // 8. PUT /api/activos/:id (Edición)
  async updateActivo(id, payload) {
    await delay();
    const currentUser = getSessionUser();
    if (currentUser.rol !== 'admin_ti') {
      const err = new Error('Solo el rol admin_ti tiene privilegios para modificar activos.');
      err.status = 403;
      throw err;
    }

    const lista = getStoredActivos();
    const idx = lista.findIndex((a) => a.id_activo.toUpperCase() === id.toUpperCase());
    if (idx === -1) {
      const err = new Error(`Activo ${id} no encontrado.`);
      err.status = 404;
      throw err;
    }

    const anterior = lista[idx];
    const actualizado = {
      ...anterior,
      ...payload,
      id_activo: anterior.id_activo, // Clave primaria inmutable
      costo_inicial: payload.costo_inicial !== undefined ? Number(payload.costo_inicial) : anterior.costo_inicial,
      costo_anual: payload.costo_anual !== undefined ? Number(payload.costo_anual) : anterior.costo_anual,
      fecha_revision: new Date().toISOString().split('T')[0],
      responsable_revision: currentUser.nombre
    };

    lista[idx] = actualizado;
    saveStoredActivos(lista);

    // Registro de edición en historial
    const historial = getStoredHistorial();
    historial.push({
      id: Date.now(),
      id_activo: anterior.id_activo,
      fecha: new Date().toISOString(),
      tipo_evento: 'EDICION',
      usuario: currentUser.nombre,
      unidad_origen: anterior.unidad,
      unidad_destino: actualizado.unidad,
      custodio_anterior: anterior.custodio,
      custodio_nuevo: actualizado.custodio,
      motivo: 'Actualización de especificaciones técnicas o asignación',
      detalles: `Modificación por ${currentUser.nombre}`
    });
    saveStoredHistorial(historial);

    return {
      success: true,
      message: 'Activo actualizado exitosamente.',
      data: { id_activo: anterior.id_activo }
    };
  },

  // 9. POST /api/activos/:id/traslado
  async trasladarActivo(id, { nueva_unidad, nueva_ubicacion, nuevo_custodio, motivo, detalles = '' }) {
    await delay();
    const currentUser = getSessionUser();
    if (currentUser.rol !== 'admin_ti') {
      const err = new Error('Solo admin_ti puede registrar traslados de equipamiento.');
      err.status = 403;
      throw err;
    }

    if (!nueva_unidad || !nueva_ubicacion || !nuevo_custodio || !motivo || !motivo.trim()) {
      const err = new Error('Los campos nueva_unidad, nueva_ubicacion, nuevo_custodio y motivo son obligatorios.');
      err.status = 400;
      throw err;
    }

    const lista = getStoredActivos();
    const idx = lista.findIndex((a) => a.id_activo.toUpperCase() === id.toUpperCase());
    if (idx === -1) {
      const err = new Error(`Activo ${id} no encontrado.`);
      err.status = 404;
      throw err;
    }

    const activo = lista[idx];
    const prevUnidad = activo.unidad;
    const prevUbi = activo.ubicacion;
    const prevCustodio = activo.custodio;

    activo.unidad = nueva_unidad;
    activo.ubicacion = nueva_ubicacion;
    activo.custodio = nuevo_custodio;
    activo.fecha_revision = new Date().toISOString().split('T')[0];
    activo.responsable_revision = currentUser.nombre;

    lista[idx] = activo;
    saveStoredActivos(lista);

    // Bitácora de traslado
    const historial = getStoredHistorial();
    historial.push({
      id: Date.now(),
      id_activo: activo.id_activo,
      fecha: new Date().toISOString(),
      tipo_evento: 'TRASLADO',
      usuario: currentUser.nombre,
      unidad_origen: prevUnidad,
      unidad_destino: nueva_unidad,
      custodio_anterior: prevCustodio,
      custodio_nuevo: nuevo_custodio,
      motivo: motivo.trim(),
      detalles: detalles || `De: ${prevUbi} -> A: ${nueva_ubicacion}`
    });
    saveStoredHistorial(historial);

    return {
      success: true,
      message: 'Traslado registrado exitosamente en bitácora.',
      data: {
        id_activo: activo.id_activo,
        unidad: nueva_unidad,
        ubicacion: nueva_ubicacion,
        custodio: nuevo_custodio
      }
    };
  },

  // 10. POST /api/activos/:id/baja (Motivo OBLIGATORIO)
  async bajaActivo(id, { motivo, detalles = '' }) {
    await delay();
    const currentUser = getSessionUser();
    if (currentUser.rol !== 'admin_ti') {
      const err = new Error('Solo el rol admin_ti puede decretar bajas de inventario.');
      err.status = 403;
      throw err;
    }

    if (!motivo || !motivo.trim()) {
      const err = new Error('El motivo de la baja es estrictamente obligatorio según Ley N.º 18.695.');
      err.status = 400;
      throw err;
    }

    const lista = getStoredActivos();
    const idx = lista.findIndex((a) => a.id_activo.toUpperCase() === id.toUpperCase());
    if (idx === -1) {
      const err = new Error(`Activo ${id} no encontrado.`);
      err.status = 404;
      throw err;
    }

    const activo = lista[idx];
    activo.estado_operativo = 'De baja';
    activo.motivo_baja = motivo.trim();
    activo.fecha_revision = new Date().toISOString().split('T')[0];
    activo.responsable_revision = currentUser.nombre;

    lista[idx] = activo;
    saveStoredActivos(lista);

    // Bitácora de baja
    const historial = getStoredHistorial();
    historial.push({
      id: Date.now(),
      id_activo: activo.id_activo,
      fecha: new Date().toISOString(),
      tipo_evento: 'BAJA',
      usuario: currentUser.nombre,
      unidad_origen: activo.unidad,
      unidad_destino: activo.unidad,
      custodio_anterior: activo.custodio,
      custodio_nuevo: null,
      motivo: motivo.trim(),
      detalles: detalles || 'Decreto de baja por obsolescencia o pérdida.'
    });
    saveStoredHistorial(historial);

    return {
      success: true,
      message: 'Baja del activo ejecutada con justificación registrada.',
      data: {
        id_activo: activo.id_activo,
        estado_operativo: 'De baja'
      }
    };
  },

  // 11. GET /api/reportes/resumen
  async getReporteResumen() {
    await delay();
    let lista = getStoredActivos();
    const currentUser = getSessionUser();

    if (currentUser.rol === 'jefatura') {
      lista = lista.filter((a) => a.unidad.toLowerCase() === currentUser.unidad.toLowerCase());
    }

    const totales = {
      total_activos: lista.length,
      operativos: lista.filter((a) => a.estado_operativo === 'Bueno' || a.estado_operativo === 'Regular').length,
      en_reparacion: lista.filter((a) => a.estado_operativo === 'En reparación').length,
      de_baja: lista.filter((a) => a.estado_operativo === 'De baja').length,
      alertas_garantia: 0,
      activos_validados: lista.filter((a) =>
        Boolean(a.custodio?.trim() && a.estado_operativo?.trim() && a.fecha_revision?.trim() && a.responsable_revision?.trim())
      ).length
    };
    totales.porcentaje_activos_validados = totales.total_activos
      ? Math.round((totales.activos_validados / totales.total_activos) * 100)
      : 0;

    const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' });
    const hoyMs = Date.parse(`${hoy}T00:00:00Z`);
    totales.alertas_garantia = lista.filter((a) => {
      if (a.estado_operativo === 'De baja' || a.categoria === 'Software' || !a.fecha_garantia) return false;
      const diff = Math.round((Date.parse(`${a.fecha_garantia}T00:00:00Z`) - hoyMs) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 60;
    }).length;

    // Conteo por categoría
    const catMap = {};
    CATALOGOS.categorias.forEach((c) => (catMap[c] = 0));
    lista.forEach((a) => {
      catMap[a.categoria] = (catMap[a.categoria] || 0) + 1;
    });
    const por_categoria = Object.keys(catMap)
      .map((k) => ({ categoria: k, cantidad: catMap[k] }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // Conteo por estado
    const estMap = {};
    CATALOGOS.estados_operativos.forEach((e) => (estMap[e] = 0));
    lista.forEach((a) => {
      estMap[a.estado_operativo] = (estMap[a.estado_operativo] || 0) + 1;
    });
    const por_estado = Object.keys(estMap).map((k) => ({ estado: k, cantidad: estMap[k] }));

    // Conteo por unidad
    const unMap = {};
    lista.forEach((a) => {
      unMap[a.unidad] = (unMap[a.unidad] || 0) + 1;
    });
    const por_unidad = Object.keys(unMap)
      .map((k) => ({ unidad: k, cantidad: unMap[k] }))
      .sort((a, b) => b.cantidad - a.cantidad);

    return {
      success: true,
      data: {
        totales,
        por_categoria,
        por_estado,
        por_unidad
      }
    };
  },

  // 12. GET /api/reportes/costos
  async getReporteCostos() {
    await delay();
    let lista = getStoredActivos();
    const currentUser = getSessionUser();

    if (currentUser.rol === 'jefatura') {
      lista = lista.filter((a) => a.unidad.toLowerCase() === currentUser.unidad.toLowerCase());
    }

    let inversion_total_inicial = 0;
    let costo_anual_recurrente_total = 0;
    const catCostos = {};
    const unidadCostos = {};

    CATALOGOS.categorias.forEach((c) => {
      catCostos[c] = { categoria: c, inversion_inicial: 0, costo_anual: 0, cantidad: 0 };
    });

    lista.forEach((a) => {
      const ini = Number(a.costo_inicial) || 0;
      const rec = Number(a.costo_anual) || 0;
      inversion_total_inicial += ini;
      costo_anual_recurrente_total += rec;

      if (!catCostos[a.categoria]) {
        catCostos[a.categoria] = { categoria: a.categoria, inversion_inicial: 0, costo_anual: 0, cantidad: 0 };
      }
      catCostos[a.categoria].inversion_inicial += ini;
      catCostos[a.categoria].costo_anual += rec;
      catCostos[a.categoria].cantidad += 1;

      if (!unidadCostos[a.unidad]) {
        unidadCostos[a.unidad] = { unidad: a.unidad, inversion_inicial: 0, costo_anual: 0, cantidad: 0 };
      }
      unidadCostos[a.unidad].inversion_inicial += ini;
      unidadCostos[a.unidad].costo_anual += rec;
      unidadCostos[a.unidad].cantidad += 1;
    });

    const tco_estimado_5_anos = inversion_total_inicial + costo_anual_recurrente_total * 5;

    return {
      success: true,
      data: {
        inversion_total_inicial,
        costo_anual_recurrente_total,
        tco_estimado_5_anos,
        desglose_por_categoria: Object.values(catCostos).sort((a, b) => b.inversion_inicial - a.inversion_inicial),
        desglose_por_unidad: Object.values(unidadCostos).sort((a, b) => b.inversion_inicial - a.inversion_inicial)
      }
    };
  },

  // GET /api/reportes/garantias?dias=90
  async getReporteGarantias(dias = 90) {
    return await this.getAlertas(dias);
  },

  async getConciliaciones() {
    await delay();
    const user = getSessionUser();
    if (!['admin_ti', 'lectura'].includes(user.rol)) {
      const err = new Error('La conciliación física está disponible para Admin TI y Auditoría.');
      err.status = 403;
      throw err;
    }
    return {
      success: true,
      data: getStoredConciliaciones().map(({ activos, ...sesion }) => sesion)
    };
  },

  async getConciliacion(id) {
    await delay();
    const user = getSessionUser();
    if (!['admin_ti', 'lectura'].includes(user.rol)) {
      const err = new Error('La conciliación física está disponible para Admin TI y Auditoría.');
      err.status = 403;
      throw err;
    }
    const sesion = getStoredConciliaciones().find((item) => String(item.id) === String(id));
    if (!sesion) {
      const err = new Error('No se encontró la conciliación solicitada.');
      err.status = 404;
      throw err;
    }
    return { success: true, data: sesion };
  },

  async crearConciliacion() {
    await delay();
    const user = getSessionUser();
    if (user.rol !== 'admin_ti') {
      const err = new Error('Solo Admin TI puede iniciar una conciliación física.');
      err.status = 403;
      throw err;
    }

    const activosVigentes = getStoredActivos().filter((activo) => activo.estado_operativo !== 'De baja');
    if (activosVigentes.length === 0) {
      const err = new Error('No hay activos vigentes para iniciar una conciliación física.');
      err.status = 400;
      throw err;
    }
    for (let i = activosVigentes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [activosVigentes[i], activosVigentes[j]] = [activosVigentes[j], activosVigentes[i]];
    }
    const tamanoMuestra = Math.max(1, Math.ceil(activosVigentes.length * 0.1));
    const sesion = {
      id: Date.now(),
      fecha_inicio: new Date().toISOString(),
      fecha_cierre: null,
      usuario: user.nombre,
      total_activos: activosVigentes.length,
      tamano_muestra: tamanoMuestra,
      inspeccionados: 0,
      discrepancias: 0,
      porcentaje_discrepancias: 0,
      resultado: 'En curso',
      activos: activosVigentes.slice(0, tamanoMuestra).map((activo) => ({
        id_activo: activo.id_activo,
        datos_registrados: {
          id_activo: activo.id_activo,
          ubicacion: activo.ubicacion,
          unidad: activo.unidad,
          custodio: activo.custodio,
          estado_operativo: activo.estado_operativo
        },
        datos_observados: null,
        encontrado: null,
        resultado: 'Pendiente',
        detalle: null,
        fecha_verificacion: null,
        usuario_verificacion: null
      }))
    };
    const sesiones = getStoredConciliaciones();
    sesiones.unshift(sesion);
    saveStoredConciliaciones(sesiones);
    return { success: true, data: sesion };
  },

  async registrarInspeccion(conciliacionId, idActivo, datos) {
    await delay();
    const user = getSessionUser();
    if (user.rol !== 'admin_ti') {
      const err = new Error('Solo Admin TI puede registrar inspecciones físicas.');
      err.status = 403;
      throw err;
    }

    const sesiones = getStoredConciliaciones();
    const sesion = sesiones.find((item) => String(item.id) === String(conciliacionId));
    if (!sesion) {
      const err = new Error('No se encontró la conciliación solicitada.');
      err.status = 404;
      throw err;
    }
    if (sesion.resultado !== 'En curso') {
      const err = new Error('La conciliación ya está cerrada y no admite nuevas inspecciones.');
      err.status = 409;
      throw err;
    }
    const activo = sesion.activos.find((item) => item.id_activo === idActivo);
    if (!activo) {
      const err = new Error('El activo no pertenece a la muestra de esta conciliación.');
      err.status = 404;
      throw err;
    }
    if (activo.resultado !== 'Pendiente') {
      const err = new Error('La inspección de este activo ya fue registrada.');
      err.status = 409;
      throw err;
    }
    if (typeof datos?.encontrado !== 'boolean') {
      const err = new Error('Indique si el activo fue encontrado físicamente.');
      err.status = 400;
      throw err;
    }

    const campos = ['id_activo', 'ubicacion', 'unidad', 'custodio', 'estado_operativo'];
    const observados = {};
    if (datos.encontrado) {
      for (const campo of campos) {
        const valor = datos[`${campo}_observado`];
        if (typeof valor !== 'string' || !valor.trim()) {
          const err = new Error(`El campo ${campo}_observado es obligatorio para un activo encontrado.`);
          err.status = 400;
          throw err;
        }
        observados[campo] = valor.trim();
      }
      if (!CATALOGOS.estados_operativos.includes(observados.estado_operativo)) {
        const err = new Error('El estado operativo observado no es válido.');
        err.status = 400;
        throw err;
      }
    }

    const normalizar = (valor) => String(valor ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-CL');
    const discrepancia = !datos.encontrado || campos.some((campo) =>
      normalizar(activo.datos_registrados[campo]) !== normalizar(observados[campo])
    );
    const detalle = String(datos.detalle || '').trim();
    if (discrepancia && !detalle) {
      const err = new Error('Describa la discrepancia observada antes de guardar.');
      err.status = 400;
      throw err;
    }

    activo.encontrado = datos.encontrado;
    activo.datos_observados = datos.encontrado ? observados : null;
    activo.resultado = discrepancia ? 'Discrepancia' : 'Coincide';
    activo.detalle = detalle || null;
    activo.fecha_verificacion = new Date().toISOString();
    activo.usuario_verificacion = user.nombre;
    sesion.inspeccionados = sesion.activos.filter((item) => item.resultado !== 'Pendiente').length;
    sesion.discrepancias = sesion.activos.filter((item) => item.resultado === 'Discrepancia').length;
    sesion.porcentaje_discrepancias = Math.round((sesion.discrepancias / sesion.inspeccionados) * 10000) / 100;
    if (sesion.inspeccionados === sesion.tamano_muestra) {
      sesion.fecha_cierre = activo.fecha_verificacion;
      sesion.resultado = sesion.porcentaje_discrepancias <= 5 ? 'Cumple' : 'No cumple';
    }
    saveStoredConciliaciones(sesiones);
    return { success: true, data: sesion };
  },

  // 13. POST /api/importar (CSV)
  async importarCSV(filasValidadas, recepcionVerificada = false) {
    await delay(350);
    const currentUser = getSessionUser();
    if (currentUser.rol !== 'admin_ti') {
      const err = new Error('Solo admin_ti tiene privilegios para importar activos masivamente.');
      err.status = 403;
      throw err;
    }

    if (recepcionVerificada !== true) {
      const err = new Error('Confirme la verificación física y documental del lote antes de registrar su recepción.');
      err.status = 400;
      throw err;
    }

    const lista = getStoredActivos();
    const historial = getStoredHistorial();
    const idsExistentes = new Set(lista.map((a) => a.id_activo.toUpperCase()));

    let insertados = 0;
    const conError = [];

    filasValidadas.forEach((fila, index) => {
      const numFila = index + 1;
      const idActivo = (fila.id_activo || '').trim().toUpperCase();

      if (!idActivo) {
        conError.push({ fila: numFila, id_activo: 'N/A', error: 'Falta campo obligatorio id_activo.' });
        return;
      }

      if (idsExistentes.has(idActivo)) {
        conError.push({ fila: numFila, id_activo: idActivo, error: `ID ${idActivo} ya existe en el inventario.` });
        return;
      }

      if (!CATALOGOS.categorias.includes(fila.categoria)) {
        conError.push({
          fila: numFila,
          id_activo: idActivo,
          error: `Categoría '${fila.categoria}' inválida. Debe ser una de: ${CATALOGOS.categorias.join(', ')}`
        });
        return;
      }

      if (!String(fila.contrato_oc || '').trim()) {
        conError.push({ fila: numFila, id_activo: idActivo, error: 'Falta el campo obligatorio contrato_oc para documentar la recepción.' });
        return;
      }

      const nuevoActivo = {
        id_activo: idActivo,
        categoria: fila.categoria,
        marca_modelo: fila.marca_modelo || 'Sin especificar',
        descripcion: fila.descripcion || '',
        ubicacion: fila.ubicacion || 'Edificio Consistorial San Pablo',
        unidad: fila.unidad || 'Informática',
        custodio: fila.custodio || 'Por Asignar',
        estado_operativo: fila.estado_operativo || 'Bueno',
        ultimo_mantenimiento: fila.ultimo_mantenimiento || null,
        tipo_mantenimiento: fila.tipo_mantenimiento || 'Preventiva',
        criticidad: fila.criticidad || 'Media',
        proceso_asociado: fila.proceso_asociado || 'Operación General',
        fecha_adquisicion: fila.fecha_adquisicion || new Date().toISOString().split('T')[0],
        fecha_garantia: fila.fecha_garantia || '2028-12-31',
        licencias_asociadas: fila.licencias_asociadas || '',
        proveedor: fila.proveedor || 'Proveedor Mercado Público',
        contrato_oc: fila.contrato_oc || 'Carga Masiva CSV',
        costo_inicial: Number(fila.costo_inicial) || 0,
        costo_anual: Number(fila.costo_anual) || 0,
        configuracion_red: fila.configuracion_red || null,
        fecha_revision: new Date().toISOString().split('T')[0],
        responsable_revision: currentUser.nombre,
        motivo_baja: null
      };

      lista.push(nuevoActivo);
      idsExistentes.add(idActivo);
      insertados++;

      // Historial
      historial.push({
        id: Date.now() + index,
        id_activo: idActivo,
        fecha: new Date().toISOString(),
        tipo_evento: 'ALTA',
        usuario: currentUser.nombre,
        unidad_origen: null,
        unidad_destino: nuevoActivo.unidad,
        custodio_anterior: null,
        custodio_nuevo: nuevoActivo.custodio,
        motivo: 'Importación masiva vía archivo CSV',
        detalles: `Fila ${numFila}: control de recepción física y documental confirmado; documento: ${nuevoActivo.contrato_oc}.`
      });
    });

    saveStoredActivos(lista);
    saveStoredHistorial(historial);

    return {
      success: true,
      data: {
        resumen: {
          total_procesadas: filasValidadas.length,
          validas: insertados,
          con_error: conError.length
        },
        filas_invalidas: conError
      }
    };
  },

  // Exportar inventario a CSV o JSON
  async exportarActivos(formato = 'csv') {
    await delay(100);
    const currentUser = getSessionUser();
    let lista = getStoredActivos();

    if (currentUser.rol === 'jefatura') {
      lista = lista.filter((a) => a.unidad.toLowerCase() === currentUser.unidad.toLowerCase());
    }

    const filtrados = lista.map((a) => aplicarFiltroRol(a, currentUser));

    if (formato === 'json') {
      return filtrados;
    }

    // CSV format
    const columnas = [
      'id_activo',
      'categoria',
      'marca_modelo',
      'descripcion',
      'ubicacion',
      'unidad',
      'custodio',
      'estado_operativo',
      'ultimo_mantenimiento',
      'criticidad',
      'fecha_adquisicion',
      'fecha_garantia',
      'proveedor',
      'contrato_oc',
      'costo_inicial',
      'costo_anual'
    ];

    const filasCSV = [
      columnas.join(';'),
      ...filtrados.map((a) =>
        columnas
          .map((col) => {
            const val = a[col] === null || a[col] === undefined ? '' : String(a[col]).replace(/;/g, ',');
            return `"${val}"`;
          })
          .join(';')
      )
    ];

    return filasCSV.join('\n');
  },

  // Reset a datos de fábrica (útil para pruebas de demostración)
  async resetDatos() {
    localStorage.removeItem(STORAGE_KEY_ACTIVOS);
    localStorage.removeItem(STORAGE_KEY_HISTORIAL);
    initStorage();
    return true;
  }
};
