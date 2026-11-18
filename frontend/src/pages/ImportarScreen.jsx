import React, { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext';
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
  HelpCircle
} from 'lucide-react';
import { CATALOGOS } from '../api.mock.js';

export function ImportarScreen({ onActivosImportados }) {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin_ti';

  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [filasAnalizadas, setFilasAnalizadas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultadoFinal, setResultadoFinal] = useState(null);
  const [errorGlobal, setErrorGlobal] = useState(null);

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

  // Cargar datos de prueba directamente
  const handleLoadSampleData = () => {
    const dataEjemplo = `id_activo;categoria;marca_modelo;descripcion;ubicacion;unidad;custodio;estado_operativo;costo_inicial;costo_anual;criticidad
SP-HW-1001;Portátil;Dell Latitude 3420;Intel i5 11va Gen 16GB RAM;DIDECO - San Pablo Central;DIDECO;Marcela Huenchumán;Bueno;690000;0;Alta
SP-HW-1002;PC;HP ProDesk 400 G7;Desktop SFF i5 16GB;DAF - Tesorería;DAF;Patricia Navarro;Bueno;610000;0;Media
SP-PRN-1003;Impresora;HP LaserJet Pro 4003dn;Impresora láser monocromática;DOM - Obras;DOM;Rodrigo Alarcón;Bueno;280000;30000;Media
SP-NET-1004;Red;Switch TP-Link 24P;Switch no administrable de soporte;Salud - Consultorio;Salud;Mónica Cárdenas;Bueno;140000;10000;Baja
SP-HW-0001;PC;Equipo Duplicado Test;Debe dar error por ID existente;Secretaría Municipal;Secretaría Municipal;Carolina Muñoz;Bueno;500000;0;Baja
SP-HW-1005;InvalidaCat;Equipo con Categoría Inválida;Debe dar error de validación;Informática;Informática;Felipe Oyarzún;Bueno;400000;0;Media`;

    setFileName('ejemplo_prueba_rapida.csv');
    setCsvContent(dataEjemplo);
    analizarCSV(dataEjemplo);
  };

  // Analizar y validar el CSV línea por línea
  const analizarCSV = (texto) => {
    setErrorGlobal(null);
    setResultadoFinal(null);

    const lineas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lineas.length <= 1) {
      setErrorGlobal('El archivo CSV está vacío o solo contiene la cabecera.');
      setFilasAnalizadas([]);
      setResumen(null);
      return;
    }

    const separador = lineas[0].includes(';') ? ';' : ',';
    const headers = lineas[0].split(separador).map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

    const filas = [];
    let validas = 0;
    let conError = 0;

    for (let i = 1; i < lineas.length; i++) {
      const lineaTexto = lineas[i];
      const valores = lineaTexto.split(separador).map((v) => v.trim().replace(/^["']|["']$/g, ''));
      
      const filaObj = {};
      headers.forEach((h, idx) => {
        filaObj[h] = valores[idx] || '';
      });

      // Validaciones
      const errores = [];
      const idActivo = (filaObj.id_activo || '').trim().toUpperCase();

      if (!idActivo) {
        errores.push('Falta el ID del activo (id_activo).');
      } else if (idActivo === 'SP-HW-0001' || idActivo === 'SP-HW-0042') {
        errores.push(`ID '${idActivo}' ya existe en el inventario actual.`);
      }

      if (!filaObj.categoria) {
        errores.push('Falta la categoría.');
      } else if (!CATALOGOS.categorias.includes(filaObj.categoria)) {
        errores.push(`Categoría '${filaObj.categoria}' no permitida en lista cerrada.`);
      }

      if (!filaObj.marca_modelo) {
        errores.push('Falta la marca y modelo.');
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
      const contenido = event.target.result;
      setCsvContent(contenido);
      analizarCSV(contenido);
    };
    reader.readAsText(file);
  };

  const handleProcesarImportacion = async () => {
    if (!resumen || resumen.validas === 0) return;

    setLoading(true);
    setErrorGlobal(null);
    try {
      const filasAEnviar = filasAnalizadas
        .filter((f) => f.esValida)
        .map((f) => f.datos);

      const res = await api.importarCSV(filasAEnviar);
      setResultadoFinal(res.data);
      if (onActivosImportados) {
        onActivosImportados();
      }
    } catch (err) {
      setErrorGlobal(err.message || 'Error durante el procesamiento masivo.');
    } finally {
      setLoading(false);
    }
  };

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

      {/* Zona de Subida y Configuración */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <FileSpreadsheet size={18} />
            <span>Seleccionar o Arrastrar Archivo CSV</span>
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
          <FileUp size={42} style={{ color: 'var(--primary)', marginBottom: 12 }} />
          <h4 style={{ fontSize: '1.05rem', color: '#1e293b', fontWeight: 600 }}>
            {fileName ? `Archivo: ${fileName}` : 'Haz clic o arrastra aquí tu archivo CSV'}
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Formato delimitado por punto y coma (;) o comas (,). Codificación UTF-8.
          </p>
        </div>

        {errorGlobal && (
          <div className="alert alert-danger" style={{ marginTop: 16 }}>
            <AlertCircle size={18} />
            <span>{errorGlobal}</span>
          </div>
        )}
      </div>

      {/* Resumen de Validación Previa */}
      {resumen && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span>Resultados del Análisis de Validación Previa</span>
            </div>
            {isAdmin && resumen.validas > 0 && !resultadoFinal && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleProcesarImportacion}
                disabled={loading}
              >
                <ArrowRight size={16} />
                {loading ? 'Procesando inserción...' : `Importar ${resumen.validas} Activos Válidos`}
              </button>
            )}
          </div>

          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div>
                <div className="stat-number">{resumen.total}</div>
                <div className="stat-label">Filas Procesadas</div>
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

          {/* Resultado final de importación exitosa */}
          {resultadoFinal && (
            <div className="alert alert-success" style={{ marginBottom: 20 }}>
              <CheckCircle2 size={24} style={{ flexShrink: 0 }} />
              <div>
                <strong>¡Importación Concluida con Éxito!</strong>
                <p style={{ marginTop: 4 }}>
                  Se han insertado <strong>{resultadoFinal.resumen.validas} activos</strong> nuevos en la base de datos municipal y se crearon sus respectivas entradas inmutables en la bitácora de auditoría.
                </p>
              </div>
            </div>
          )}

          {/* Tabla de Previsualización */}
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Fila</th>
                  <th>ID Activo</th>
                  <th>Categoría</th>
                  <th>Marca / Modelo</th>
                  <th>Unidad</th>
                  <th>Estado Validación</th>
                  <th>Detalle / Error</th>
                </tr>
              </thead>
              <tbody>
                {filasAnalizadas.map((f) => (
                  <tr 
                    key={f.numFila}
                    style={{ backgroundColor: f.esValida ? 'transparent' : '#fff1f2' }}
                  >
                    <td style={{ fontWeight: 600 }}>#{f.numFila}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{f.datos.id_activo || '—'}</td>
                    <td>{f.datos.categoria || '—'}</td>
                    <td>{f.datos.marca_modelo || '—'}</td>
                    <td>{f.datos.unidad || '—'}</td>
                    <td>
                      {f.esValida ? (
                        <span className="badge badge-success">
                          <CheckCircle2 size={12} /> Válida
                        </span>
                      ) : (
                        <span className="badge badge-danger">
                          <AlertTriangle size={12} /> Con Error
                        </span>
                      )}
                    </td>
                    <td>
                      {f.esValida ? (
                        <span style={{ fontSize: '0.78rem', color: '#059669' }}>Lista para inserción</span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#b91c1c', fontWeight: 600 }}>
                          {f.errores.join(' | ')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
