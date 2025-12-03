import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DatosEstudiante {
    nombres: string;
    apellidos: string;
    dni?: string;
}

interface DatosCuota {
    numero_cuota: number;
    concepto: string;
    monto: number;
    fecha_vencimiento: string;
}

interface DatosVoucher {
    numeroVoucher: string;
    estudiante: DatosEstudiante;
    ciclo: string;
    planPago: string;
    cuota: DatosCuota;
    metodoPago: string;
    montoPagado: number;
    fechaPago: string;
}


export const generarVoucherPago = (datos: DatosVoucher) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Institución Educativa "Reyna de la Paz"', pageWidth / 2, y, { align: 'center' });

    y += 8;
    doc.setFontSize(14);
    doc.text('COMPROBANTE DE PAGO', pageWidth / 2, y, { align: 'center' });

    
    y += 12;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Voucher N°: ${datos.numeroVoucher}`, pageWidth / 2, y, { align: 'center' });

    y += 5;
    const fechaEmision = new Date(datos.fechaPago).toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    doc.text(`Fecha: ${fechaEmision}`, pageWidth / 2, y, { align: 'center' });

    
    y += 8;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);

    
    y += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL ESTUDIANTE', 20, y);

    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Apellidos y Nombres: ${datos.estudiante.apellidos}, ${datos.estudiante.nombres}`, 20, y);

    y += 6;
    doc.text(`DNI: ${datos.estudiante.dni || 'N/A'}`, 20, y);

    
    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DETALLE DEL PAGO', 20, y);

    y += 7;
    autoTable(doc, {
        startY: y,
        head: [['Concepto', 'Detalle']],
        body: [
            ['Ciclo', datos.ciclo],
            ['Plan de Pago', datos.planPago],
            ['Cuota', `#${datos.cuota.numero_cuota} - ${datos.cuota.concepto}`],
            ['Vencimiento', new Date(datos.cuota.fecha_vencimiento).toLocaleDateString('es-PE')],
            ['Método de Pago', datos.metodoPago],
        ],
        theme: 'plain',
        styles: {
            fontSize: 9,
            cellPadding: 3,
        },
        headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { cellWidth: 120 }
        },
        margin: { left: 20, right: 20 },
    });

    
    const tableEnd = (doc as any).lastAutoTable.finalY + 12;

    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(20, tableEnd, pageWidth - 40, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('MONTO PAGADO:', 25, tableEnd + 8);

    doc.setFontSize(16);
    doc.text(`S/ ${datos.montoPagado.toFixed(2)}`, pageWidth - 25, tableEnd + 8, { align: 'right' });

    
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Este documento es un comprobante de pago válido.', pageWidth / 2, pageHeight - 20, { align: 'center' });
    doc.text('Conserve este voucher para futuras consultas.', pageWidth / 2, pageHeight - 15, { align: 'center' });

    
    const nombreArchivo = `Voucher_${datos.numeroVoucher}.pdf`;
    doc.save(nombreArchivo);
};