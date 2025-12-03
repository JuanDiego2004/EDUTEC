import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DatosEstudiante {
    nombres: string;
    apellidos: string;
    dni?: string;
    codigo?: string;
}

interface DatosCiclo {
    nombre: string;
    fecha_inicio?: string;
    fecha_fin?: string;
}

interface DatosCuota {
    numero_cuota: number;
    concepto: string;
    monto: number;
    fecha_vencimiento: string;
}

interface DatosPlanPago {
    nombre: string;
    total: number;
    pagado: number;
    restante: number;
}

interface DatosVoucher {
    numeroVoucher: string;
    estudiante: DatosEstudiante;
    ciclo: DatosCiclo;
    planPago: DatosPlanPago;
    cuota: DatosCuota;
    metodoPago: string;
    montoPagado: number;
    fechaPago: string;
}

/**
 * Genera un voucher/comprobante de pago en PDF
 */
export const generarVoucherPago = (datos: DatosVoucher) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // ========== ENCABEZADO ==========
    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROBANTE DE PAGO', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Institución Educativa "Reyna de la Paz"', pageWidth / 2, 23, { align: 'center' });

    doc.setFontSize(9);
    doc.text('Voucher de Pago - Documento Oficial', pageWidth / 2, 30, { align: 'center' });

    // ========== NÚMERO DE VOUCHER ==========
    yPosition = 50;
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.roundedRect(14, yPosition - 5, pageWidth - 28, 15, 3, 3, 'F');

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('N° VOUCHER:', 20, yPosition + 3);

    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text(datos.numeroVoucher, pageWidth - 20, yPosition + 3, { align: 'right' });

    // ========== FECHA DE EMISIÓN ==========
    yPosition += 15;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.setFont('helvetica', 'normal');
    const fechaEmision = new Date(datos.fechaPago).toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    doc.text(`Fecha de emisión: ${fechaEmision}`, pageWidth / 2, yPosition, { align: 'center' });

    // ========== INFORMACIÓN DEL ESTUDIANTE ==========
    yPosition += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('DATOS DEL ESTUDIANTE', 14, yPosition);

    // Línea decorativa
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.5);
    doc.line(14, yPosition + 2, pageWidth - 14, yPosition + 2);

    yPosition += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const infoEstudiante = [
        ['Apellidos y Nombres:', `${datos.estudiante.apellidos}, ${datos.estudiante.nombres}`],
        ['DNI:', datos.estudiante.dni || 'N/A'],
    ];

    infoEstudiante.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105); // Slate-600
        doc.text(label, 20, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(value, 70, yPosition);
        yPosition += 6;
    });

    // ========== DETALLES DEL PAGO ==========
    yPosition += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('DETALLES DEL PAGO', 14, yPosition);

    // Línea decorativa
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.5);
    doc.line(14, yPosition + 2, pageWidth - 14, yPosition + 2);

    yPosition += 10;

    // Tabla de detalles
    autoTable(doc, {
        startY: yPosition,
        head: [['Concepto', 'Detalle']],
        body: [
            ['Ciclo Académico', datos.ciclo.nombre],
            ['Plan de Pago', datos.planPago.nombre],
            ['Cuota', `#${datos.cuota.numero_cuota} - ${datos.cuota.concepto}`],
            ['Fecha de Vencimiento', new Date(datos.cuota.fecha_vencimiento).toLocaleDateString('es-PE')],
            ['Método de Pago', datos.metodoPago.toUpperCase()],
        ],
        theme: 'striped',
        headStyles: {
            fillColor: [79, 70, 229], // Indigo-600
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10
        },
        bodyStyles: {
            fontSize: 9,
            textColor: [0, 0, 0]
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 60, textColor: [71, 85, 105] },
            1: { cellWidth: 110 }
        },
        margin: { left: 14, right: 14 },
    });

    // ========== RESUMEN FINANCIERO ==========
    const tableEndY = (doc as any).lastAutoTable.finalY + 10;

    // Caja de monto con diseño destacado
    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.roundedRect(14, tableEndY, pageWidth - 28, 45, 4, 4, 'F');

    // Monto pagado
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('MONTO PAGADO', pageWidth / 2, tableEndY + 10, { align: 'center' });

    doc.setFontSize(28);
    doc.text(`S/ ${datos.montoPagado.toFixed(2)}`, pageWidth / 2, tableEndY + 25, { align: 'center' });

    // Estado del plan
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Plan: S/ ${datos.planPago.pagado.toFixed(2)} pagado de S/ ${datos.planPago.total.toFixed(2)}`, pageWidth / 2, tableEndY + 35, { align: 'center' });
    doc.text(`Saldo pendiente: S/ ${datos.planPago.restante.toFixed(2)}`, pageWidth / 2, tableEndY + 41, { align: 'center' });

    // ========== OBSERVACIONES ==========
    yPosition = tableEndY + 55;
    doc.setFillColor(254, 243, 199); // Amber-100
    doc.roundedRect(14, yPosition, pageWidth - 28, 20, 3, 3, 'F');

    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 25, pageWidth - 14, pageHeight - 25);


    const nombreArchivo = `Voucher_${datos.numeroVoucher}_${datos.estudiante.apellidos.replace(/\s+/g, '_')}.pdf`;
    doc.save(nombreArchivo);
};
