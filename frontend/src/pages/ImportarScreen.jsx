import React, { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext';
import { CategoryBadge, getCategoryIcon } from '../components/Badge';
import { 
  FileUp, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Lock, 
  FileSpreadsheet, 
  ArrowRight,
  RefreshCw,
  HelpCircle,
  FileCheck2,
  Layers,
  XCircle
} from 'lucide-react';
import { CATALOGOS } from '../api.mock.js';

function detectarSeparador(texto) {
  let enComillas = false;
  let comas = 0;
  let puntosYComa = 0;

  for (let i = 0; i < texto.length; i++) {
    const caracter = texto[i];
    if (caracter === '"') {
      if (enComillas && texto[i + 1] === '"') i++;
      else enComillas = !enComillas;
    } else if (!enComillas && (caracter === '\n' || caracter === '\r')) {
      break;
    } else if (!enComillas && caracter === ',') {
      comas++;
    } else if (!enComillas && caracter === ';') {
      puntosYComa++;
    }
  }

  return puntosYComa > comas ? ';' : ',';
}

function parsearCSV(texto) {
  const separador = detectarSeparador(texto);
  const registros = [];
  let registro = [];
  let campo = '';
  let enComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const caracter = texto[i];
    if (enComillas) {
      if (caracter === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (caracter === '"') {
        enComillas = false;
      } else {
        campo += caracter;
      }
    } else if (caracter === '"' && !campo.trim()) {
      enComillas = true;
    } else if (caracter === separador) {
      registro.push(campo.trim());
      campo = '';
    } else if (caracter === '\n' || caracter === '\r') {
      if (caracter === '\r' && texto[i + 1] === '\n') i++;
      registro.push(campo.trim());
      if (registro.some((valor) => valor !== '')) registros.push(registro);
      registro = [];
      campo = '';
    } else {
      campo += caracter;
    }
  }

  if (enComillas) throw new Error('El CSV contiene un campo entre comillas sin cerrar.');
  registro.push(campo.trim());
  if (registro.some((valor) => valor !== '')) registros.push(registro);
  return registros;
}

export function ImportarScreen({ onActivosImportados }) {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin_ti';

  const [fileName, setFileName] = useState('');
  const [filasAnalizadas, setFilasAnalizadas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultadoFinal, setResultadoFinal] = useState(null);
  const [errorGlobal, setErrorGlobal] = useState(null);
  const [tabFiltro, setTabFiltro] = useState('todas'); // 'todas' | 'validas' | 'errores'
  const [recepcionVerificada, setRecepcionVerificada] = useState(false);

  // Descargar plantilla CSV de ejemplo
  const handleDownloadPlantilla = () => {
    const encabezados = [
      'id_activo',
      'categoria',
      'marca_modelo',
      'descripcion',
      'ubicacion',
      'unidad',
      'custodio',
      'estado_operativo',
      'ultimo_mantenimiento',
      'tipo_mantenimiento',
      'criticidad',
      'proceso_asociado',
      'fecha_adquisicion',
      'fecha_garantia',
      'licencias_asociadas',
      'proveedor',
      'contrato_oc',
      'costo_inicial',
      'costo_anual',
      'configuracion_red'
    ];

    const ejemplo1 = [
      'SP-HW-9001',
      'Portátil',
      'Lenovo ThinkPad L14 Gen 3',
      'Notebook 14 pulgadas i5 16GB',
      'SECPLAN - Oficina Proyectos',
      'SECPLAN',
      'Claudio Arriagada Solís',
      'Bueno',
      '2026-10-15',
      'Preventiva',
      'Alta',
      'Proceso E',
      '2026-11-01',
      '2028-11-01',
      'Windows 11 Pro OEM',
      'Austral Tech Ltda',
      'OC 4521-99-SE26',
      '750000',
      '0',
      '192.168.10.88 / VLAN 10'
    ];

    const ejemplo2 = [
      'SP-PRN-9002',
      'Impresora',
      'Epson EcoTank L5590',
      'Multifunción tinta continua',
      'DIDECO - Fomento Productivo',
      'DIDECO',
      'Marcela Huenchumán',
      'Bueno',
      '2026-10-20',
      'Preventiva',
      'Media',
      'Proceso A',
      '2026-11-01',
      '2027-11-01',
      'Driver ESC/P-R',
      'Ofimática Sur',
      'OC 4521-99-SE26',
      '320000',
      '25000',
      '192.168.20.77 / RAW 9100'
    ];

    const csvStr = [encabezados.join(';'), ejemplo1.join(';'), ejemplo2.join(';')].join('\n');
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_importacion_activos_san_pablo.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cargar datos de prueba
  const handleLoadSampleData = () => {
    const dataEjemplo = `id_activo;categoria;marca_modelo;descripcion;ubicacion;unidad;custodio;estado_operativo;costo_inicial;costo_anual;criticidad;contrato_oc
SP-HW-1001;Portátil;Dell Latitude 3420;Intel i5 11va Gen 16GB RAM;DIDECO - San Pablo Central;DIDECO;Marcela Huenchumán;Bueno;690000;0;Alta;OC 4521-99-SE26
SP-HW-1002;PC;HP ProDesk 400 G7;Desktop SFF i5 16GB;DAF - Tesorería;DAF;Patricia Navarro;Bueno;610000;0;Media;OC 4521-99-SE26
SP-PRN-1003;Impresora;HP LaserJet Pro 4003dn;Impresora láser monocromática;DOM - Obras;DOM;Rodrigo Alarcón;Bueno;280000;30000;Media;OC 4521-99-SE26
SP-NET-1004;Red;Switch TP-Link 24P;Switch no administrable de soporte;Salud - Consultorio;Salud;Mónica Cárdenas;Bueno;140000;10000;Baja;OC 4521-99-SE26
SP-HW-0001;PC;Equipo Duplicado Test;Debe dar error por ID existente;Secretaría Municipal;Secretaría Municipal;Carolina Muñoz;Bueno;500000;0;Baja;OC 4521-99-SE26
SP-HW-1005;InvalidaCat;Equipo con Categoría Inválida;Debe dar error de validación;Informática;Informática;Felipe Oyarzún;Bueno;400000;0;Media;OC 4521-99-SE26`;

    setFileName('ejemplo_prueba_rapida.csv');
    analizarCSV(dataEjemplo);
  };

  // Analizar y validar el CSV línea por línea
  const analizarCSV = (texto) => {
    setErrorGlobal(null);
    setResultadoFinal(null);
    setRecepcionVerificada(false);

    let registros;
    try {
      registros = parsearCSV(texto);
    } catch (err) {
      setErrorGlobal(err.message);
      setFilasAnalizadas([]);
      setResumen(null);
      return;
    }

    if (registros.length <= 1) {
      setErrorGlobal('El archivo CSV está vacío o solo contiene la cabecera.');
      setFilasAnalizadas([]);
      setResumen(null);
      return;
    }

    const headers = registros[0].map((h, index) =>
      (index === 0 ? h.replace(/^\uFEFF/, '') : h).trim().toLowerCase()
    );

    const filas = [];
    const idsVistos = new Set();
    let validas = 0;
    let conError = 0;

    for (let i = 1; i < registros.length; i++) {
      const valores = registros[i];
      const filaObj = {};
      headers.forEach((h, idx) => {
        filaObj[h] = valores[idx] || '';
      });

      const errores = [];
      const idActivo = (filaObj.id_activo || '').trim().toUpperCase();
      if (valores.length > headers.length) {
        errores.push('La fila contiene más valores que columnas en la cabecera.');
      }

      if (!idActivo) {
        errores.push('Falta el ID del activo (id_activo).');
      } else if (idsVistos.has(idActivo)) {
        errores.push(`ID '${idActivo}' está duplicado en el archivo.`);
      } else {
        idsVistos.add(idActivo);
      }

      if (!filaObj.categoria) {
        errores.push('Falta la categoría.');
      } else if (!CATALOGOS.categorias.includes(filaObj.categoria)) {
        errores.push(`Categoría '${filaObj.categoria}' no permitida en lista cerrada.`);
      }

      if (!filaObj.marca_modelo) {
        errores.push('Falta la marca y modelo.');
      }
      for (const campo of ['ubicacion', 'unidad', 'custodio', 'contrato_oc']) {
        if (!filaObj[campo]?.trim()) errores.push(`Falta el campo obligatorio ${campo}.`);
      }
      if (filaObj.estado_operativo && !CATALOGOS.estados_operativos.includes(filaObj.estado_operativo)) {
        errores.push(`Estado '${filaObj.estado_operativo}' no permitido.`);
      }
      if (filaObj.criticidad && !CATALOGOS.criticidades.includes(filaObj.criticidad)) {
        errores.push(`Criticidad '${filaObj.criticidad}' no permitida.`);
      }
      if (filaObj.tipo_mantenimiento && !CATALOGOS.tipos_mantenimiento.includes(filaObj.tipo_mantenimiento)) {
        errores.push(`Tipo de mantenimiento '${filaObj.tipo_mantenimiento}' no permitido.`);
      }

      const esValida = errores.length === 0;
      if (esValida) validas++; else conError++;

      filas.push({
        numFila: i,
        datos: filaObj,
        esValida,
        errores
      });
    }

    setFilasAnalizadas(filas);
    setResumen({
      total: filas.length,
      validas,
      conError
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const contenido = String(event.target.result || '');
      analizarCSV(contenido);
    };
    reader.readAsText(file);
  };

  const handleProcesarImportacion = async () => {
    if (!resumen || resumen.validas === 0) return;
    if (!recepcionVerificada) {
      setErrorGlobal('Confirma que verificaste físicamente los bienes y sus documentos antes de registrar la recepción.');
      return;
    }

    setLoading(true);
    setErrorGlobal(null);
    try {
      const filasAEnviar = filasAnalizadas
        .map((f) => f.datos);

      const res = await api.importarCSV(filasAEnviar, true);
      setResultadoFinal(res.data);
      const erroresServidor = new Map(
        (res.data.filas_invalidas || []).map((fila) => [fila.fila, fila.error])
      );
      setFilasAnalizadas((actuales) => actuales.map((fila) => {
        const errorServidor = erroresServidor.get(fila.numFila);
        if (!errorServidor || fila.errores.includes(errorServidor)) return fila;
        return { ...fila, esValida: false, errores: [...fila.errores, errorServidor] };
      }));
      setResumen({
        total: res.data.resumen.total_procesadas,
        validas: res.data.resumen.validas,
        conError: res.data.resumen.con_error
      });
      setTabFiltro(res.data.resumen.con_error > 0 ? 'errores' : 'todas');
      if (res.data.resumen.validas > 0 && onActivosImportados) {
        onActivosImportados();
      }
    } catch (err) {
      setErrorGlobal(err.message || 'Error durante el procesamiento masivo.');
    } finally {
      setLoading(false);
    }
  };

  const filasVisibles = filasAnalizadas.filter((f) => {
    if (tabFiltro === 'validas') return f.esValida;
    if (tabFiltro === 'errores') return !f.esValida;
    return true;
  });

  return (
    <div className="page-wrapper" style={{ maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)' }}>
            Importación y Carga Masiva de Activos
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Herramienta para carga de planillas de verificación física y contratos (Paso 1 y 3)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={handleDownloadPlantilla}>
            <Download size={15} />
            Descargar Plantilla CSV
          </button>
        </div>
      </div>

      {!isAdmin && (
        <div className="alert alert-danger" style={{ marginBottom: 20 }}>
          <Lock size={18} />
          <div>
            <strong>Acceso Restringido:</strong> Solo los usuarios con el rol <strong>admin_ti</strong> cuentan con atribuciones para ejecutar cargas masivas o importar archivos de inventario.
          </div>
        </div>
      )}

      {/* ZONA DE SUBIDA VISUAL */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <FileSpreadsheet size={18} />
            <span>Paso 1: Seleccionar o Arrastrar Archivo CSV</span>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={handleLoadSampleData}
            disabled={!isAdmin}
          >
            Cargar Lote de Prueba Rápido
          </button>
        </div>

        <div style={{
          border: '2px dashed var(--border-strong)',
          borderRadius: '12px',
          padding: '36px 20px',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          cursor: isAdmin ? 'pointer' : 'not-allowed',
          position: 'relative'
        }}>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            disabled={!isAdmin}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              cursor: isAdmin ? 'pointer' : 'not-allowed',
              width: '100%',
              height: '100%'
            }}
          />
          <FileUp size={42} style={{ color: 'var(--primary)', margin: '0 auto 12px' }} />
          <h4 style={{ fontSize: '1.05rem', color: '#1e293b', fontWeight: 700 }}>
            {fileName ? `Archivo cargado: ${fileName}` : 'Haz clic o arrastra aquí tu archivo CSV'}
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Delimitado por punto y coma (;) o comas (,). Codificación UTF-8 estándar.
          </p>
        </div>

        {errorGlobal && (
          <div className="alert alert-danger" style={{ marginTop: 16 }}>
            <AlertCircle size={18} />
            <span>{errorGlobal}</span>
          </div>
        )}
      </div>

      {/* PASO 2: RESULTADOS DE VALIDACIÓN EN TARJETAS */}
      {resumen && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <FileCheck2 size={18} />
              <span>Paso 2: Validación Previa e Integridad de Filas</span>
            </div>
            {isAdmin && resumen.validas > 0 && !resultadoFinal && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleProcesarImportacion}
                disabled={loading || !recepcionVerificada}
              >
                <ArrowRight size={16} />
                {loading ? 'Procesando inserción...' : `Confirmar e Importar ${resumen.validas} Activos`}
              </button>
            )}
          </div>

          <div className="alert alert-info" style={{ marginBottom: 18 }}>
            <input
              type="checkbox"
              checked={recepcionVerificada}
              onChange={(event) => setRecepcionVerificada(event.target.checked)}
              disabled={!isAdmin || loading || Boolean(resultadoFinal)}
              style={{ marginRight: 8 }}
            />
            <label style={{ cursor: isAdmin ? 'pointer' : 'default' }}>
              Confirmo que cotejé físicamente los bienes, sus identificadores, cantidades, estado y OC/contrato antes de registrar la recepción del lote.
            </label>
          </div>

          <div className="stats-grid" style={{ marginBottom: 18 }}>
            <div className="stat-card">
              <div>
                <div className="stat-number">{resumen.total}</div>
                <div className="stat-label">Filas Analizadas</div>
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
              <div>
                <div className="stat-number" style={{ color: '#059669' }}>{resumen.validas}</div>
                <div className="stat-label">Filas Válidas para Inserción</div>
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
              <div>
                <div className="stat-number" style={{ color: '#dc2626' }}>{resumen.conError}</div>
                <div className="stat-label">Filas con Errores Detectados</div>
              </div>
            </div>
          </div>

          {/* Confirmación Exitosa */}
          {resultadoFinal && (
            <div className="alert alert-success" style={{ marginBottom: 18 }}>
              <CheckCircle2 size={24} style={{ flexShrink: 0 }} />
              <div>
                <strong>Importación procesada</strong>
                <p style={{ marginTop: 4 }}>
                  Se insertaron <strong>{resultadoFinal.resumen.validas} activos</strong> y {resultadoFinal.resumen.con_error} filas tuvieron errores. Las filas aceptadas quedaron registradas en la bitácora.
                </p>
              </div>
            </div>
          )}

          {/* Filtros de la previsualización */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              type="button"
              className={`btn btn-sm ${tabFiltro === 'todas' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTabFiltro('todas')}
            >
              Todas ({resumen.total})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${tabFiltro === 'validas' ? 'btn-secondary' : 'btn-outline'}`}
              onClick={() => setTabFiltro('validas')}
            >
              Solo Válidas ({resumen.validas})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${tabFiltro === 'errores' ? 'btn-danger' : 'btn-outline'}`}
              onClick={() => setTabFiltro('errores')}
            >
              Con Error ({resumen.conError})
            </button>
          </div>

          {/* Tarjetas Visuales de Previsualización (En lugar de tabla gigante) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filasVisibles.map((f) => (
              <div 
                key={f.numFila}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${f.esValida ? '#e2e8f0' : '#fecaca'}`,
                  background: f.esValida ? '#ffffff' : '#fef2f2'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
                    #{f.numFila}
                  </span>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#1e40af' }}>
                        {f.datos.id_activo || 'SIN ID'}
                      </span>
                      {f.datos.categoria && <CategoryBadge categoria={f.datos.categoria} />}
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {f.datos.unidad}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                      {f.datos.marca_modelo || 'Sin descripción'}
                    </div>
                  </div>
                </div>

                <div>
                  {f.esValida ? (
                    <span className="badge badge-success">
                      <CheckCircle2 size={12} /> Fila Válida
                    </span>
                  ) : (
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-danger">
                        <AlertTriangle size={12} /> Error de Validación
                      </span>
                      <div style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 600, marginTop: 4 }}>
                        {f.errores.join(' • ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
