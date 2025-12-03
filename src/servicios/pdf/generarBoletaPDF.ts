import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


export const convertirNotaACualitativo = (nota: number): string => {
    if (nota >= 18) return 'AD';
    if (nota >= 15) return 'A';
    if (nota >= 11) return 'B';
    return 'C';
};


const obtenerColorCalificacion = (calificacion: string): [number, number, number] => {
    switch (calificacion) {
        case 'AD': return [34, 197, 94];  
        case 'A': return [59, 130, 246];   
        case 'B': return [251, 146, 60];   
        case 'C': return [239, 68, 68];    
        default: return [100, 116, 139];   
    }
};

interface DatosEstudiante {
    nombres: string;
    apellidos: string;
    dni?: string;
    codigo?: string;
}

interface DatosSalon {
    nombre: string;
    nivel?: string;
    grado?: string;
    seccion?: string;
    profesor?: {
        nombres: string;
        apellidos: string;
    };
    ciclo?: {
        nombre: string;
        fecha_inicio: string;
        fecha_fin: string;
    };
}

interface Evaluacion {
    tipo_evaluacion: string;
    nota: number;
    peso: number;
    fecha_evaluacion?: string;
}

interface Competencia {
    nombre: string;
    descripcion?: string;
    porcentaje: number;
}

interface Curso {
    nombre: string;
    codigo: string;
    promedio: number;
    competencias: Competencia[];
    evaluacionesAgrupadas: {
        nombre: string;
        promedio: number;
        evaluaciones: Evaluacion[];
    }[];
}

interface DatosBoleta {
    estudiante: DatosEstudiante;
    salon: DatosSalon;
    cursos: Curso[];
    promedioGeneral: number;
}


export const generarBoletaNotas = (datos: DatosBoleta) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    doc.setFillColor(79, 70, 229); 
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('INSTITUCIÓN EDUCATIVA', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('"Reyna de la Paz"', pageWidth / 2, 22, { align: 'center' });

    doc.setFontSize(10);
    doc.text('BOLETA DE INFORMACIÓN - REGISTRO DE EVALUACIÓN', pageWidth / 2, 29, { align: 'center' });

    
    yPosition = 45;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL ESTUDIANTE', 14, yPosition);

    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const infoEstudiante = [
        [`Apellidos y Nombres:`, `${datos.estudiante.apellidos}, ${datos.estudiante.nombres}`],
        [`DNI:`, datos.estudiante.dni || 'N/A'],
        [`Código:`, datos.estudiante.codigo || 'N/A'],
    ];

    infoEstudiante.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 14, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 50, yPosition);
        yPosition += 6;
    });

    
    yPosition += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DATOS ACADÉMICOS', 14, yPosition);

    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const salonNombre = datos.salon.nombre || `${datos.salon.nivel} - ${datos.salon.grado} "${datos.salon.seccion}"`;
    const profesorNombre = datos.salon.profesor
        ? `${datos.salon.profesor.nombres} ${datos.salon.profesor.apellidos}`
        : 'No asignado';

    const infoAcademica = [
        [`Salón:`, salonNombre],
        [`Profesor(a):`, profesorNombre],
        [`Ciclo Académico:`, datos.salon.ciclo?.nombre || 'N/A'],
    ];

    infoAcademica.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 14, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 50, yPosition);
        yPosition += 6;
    });

    
    yPosition += 6;

    
    const filasTabla: any[] = [];

    datos.cursos.forEach((curso, index) => {
        
        const promedioCalif = convertirNotaACualitativo(curso.promedio);

        filasTabla.push([
            { content: `${index + 1}. ${curso.nombre.toUpperCase()}`, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: promedioCalif, styles: { fontStyle: 'bold', halign: 'center', fillColor: obtenerColorCalificacion(promedioCalif), textColor: [255, 255, 255] } }
        ]);

        
        if (curso.competencias && curso.competencias.length > 0) {
            curso.competencias.forEach((comp) => {
                filasTabla.push([
                    '',
                    { content: comp.nombre, colSpan: 2, styles: { fontSize: 9 } },
                    { content: `${comp.porcentaje}%`, styles: { fontSize: 9, halign: 'center' } }
                ]);
            });
        }

        
        if (curso.evaluacionesAgrupadas && curso.evaluacionesAgrupadas.length > 0) {
            curso.evaluacionesAgrupadas.forEach((evalGrupo) => {
                const evalCalif = convertirNotaACualitativo(evalGrupo.promedio);
                filasTabla.push([
                    '',
                    '',
                    { content: evalGrupo.nombre, styles: { fontSize: 9 } },
                    { content: evalCalif, styles: { fontSize: 9, halign: 'center', fillColor: obtenerColorCalificacion(evalCalif), textColor: [255, 255, 255] } }
                ]);
            });
        }

        
        if (index < datos.cursos.length - 1) {
            filasTabla.push([{ content: '', colSpan: 4, styles: { minCellHeight: 2, fillColor: [226, 232, 240] } }]);
        }
    });

    autoTable(doc, {
        startY: yPosition,
        head: [['N°', 'ÁREA/COMPETENCIA', 'EVALUACIÓN', 'CALIF.']],
        body: filasTabla,
        theme: 'grid',
        headStyles: {
            fillColor: [79, 70, 229], 
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 10
        },
        bodyStyles: {
            fontSize: 9,
            textColor: [0, 0, 0]
        },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 70 },
            2: { cellWidth: 70 },
            3: { cellWidth: 25, halign: 'center' }
        },
        margin: { left: 14, right: 14 },
    });

    
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ESCALA DE CALIFICACIÓN:', 14, finalY);

    const leyenda = [
        { calif: 'AD', descripcion: 'Logro Destacado (18-20)' },
        { calif: 'A', descripcion: 'Logro Esperado (15-17)' },
        { calif: 'B', descripcion: 'En Proceso (11-14)' },
        { calif: 'C', descripcion: 'En Inicio (0-10)' }
    ];

    let xLeyenda = 14;
    let yLeyenda = finalY + 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    leyenda.forEach((item) => {
        const color = obtenerColorCalificacion(item.calif);
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(xLeyenda, yLeyenda - 3, 8, 5, 1, 1, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(item.calif, xLeyenda + 4, yLeyenda, { align: 'center' });

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(item.descripcion, xLeyenda + 11, yLeyenda);

        yLeyenda += 7;
    });

    
    const promedioGeneralCalif = convertirNotaACualitativo(datos.promedioGeneral);
    const colorPromedio = obtenerColorCalificacion(promedioGeneralCalif);

    yLeyenda += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('PROMEDIO GENERAL DEL CICLO:', 14, yLeyenda);

    doc.setFillColor(colorPromedio[0], colorPromedio[1], colorPromedio[2]);
    doc.roundedRect(85, yLeyenda - 5, 20, 8, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text(promedioGeneralCalif, 95, yLeyenda, { align: 'center' });

    
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setTextColor(100, 116, 139); 
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    const fechaEmision = new Date().toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    doc.text(`Documento generado el ${fechaEmision}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    
    const nombreArchivo = `Boleta_${datos.estudiante.apellidos.replace(/\s+/g, '_')}_${datos.salon.ciclo?.nombre.replace(/\s+/g, '_') || 'Ciclo'}.pdf`;
    doc.save(nombreArchivo);
};
