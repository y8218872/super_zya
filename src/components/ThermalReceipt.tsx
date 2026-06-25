import { useState } from 'react';
import { SaleInvoice, StoreSettings } from '../types';
import { formatCurrency, formatDate, getZatcaQrCodeUrl } from '../initialData';
import { Printer, X, Check, Download, RefreshCw, MessageSquare, Send, FileCode, ExternalLink } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface ThermalReceiptProps {
  isEn: boolean;
  invoice: SaleInvoice;
  settings: StoreSettings;
  onClose: () => void;
}

export default function ThermalReceipt({ isEn, invoice, settings, onClose }: ThermalReceiptProps) {
  const [copied, setCopied] = useState(false);

  const invoiceFontSize = settings.invoiceFontSize || 'base';
  const invoiceWidth = settings.invoiceWidth || 290;
  const invoicePadding = settings.invoicePadding || 'normal';

  const fontSizes = {
    sm: { root: '13px', title: '15px', sub: '12px', badge: '11px' },
    base: { root: '15px', title: '17px', sub: '14px', badge: '13px' },
    lg: { root: '18px', title: '20px', sub: '16.5px', badge: '15px' }
  }[invoiceFontSize];

  const paddings = {
    compact: 'p-3 space-y-1.5',
    normal: 'p-5 space-y-2.5',
    relaxed: 'p-7 space-y-3.5'
  }[invoicePadding];
  
  // Load customer phone if available
  let initialPhone = '';
  if (invoice.customerId && invoice.customerId !== 'cust-cash') {
    try {
      const stored = localStorage.getItem('erp_customers');
      if (stored) {
        const list = JSON.parse(stored);
        const found = list.find((c: any) => c.id === invoice.customerId);
        if (found && found.phone) {
          initialPhone = found.phone;
        }
      }
    } catch (e) {
      console.error("Error loading customer phone: ", e);
    }
  }

  const [whatsappPhone, setWhatsappPhone] = useState(initialPhone);
  const [showWhatsappPanel, setShowWhatsappPanel] = useState(false);
  const [whatsappCopied, setWhatsappCopied] = useState(false);

  let isInIframe = false;
  try {
    isInIframe = window.self !== window.parent;
  } catch (e) {
    isInIframe = true;
  }

  // Calculate total items count
  const itemsCount = invoice.items.reduce((sum, item) => sum + item.quantity, 0);

  const handlePrint = () => {
    try {
      const printableArea = document.getElementById('printable-receipt-area');
      if (!printableArea) {
        window.print();
        return;
      }

      // Create a print container directly under body
      const printMount = document.createElement('div');
      printMount.id = 'print-mount-point';
      printMount.dir = !isEn ? 'rtl' : 'ltr';
      
      // Clone the printable area
      const clone = printableArea.cloneNode(true) as HTMLElement;
      
      printMount.appendChild(clone);
      document.body.appendChild(printMount);
      
      // Add class to body to hide everything else
      document.body.classList.add('printing-receipt');

      // Trigger print
      window.print();

      // Clean up
      setTimeout(() => {
        document.body.classList.remove('printing-receipt');
        if (document.body.contains(printMount)) {
          document.body.removeChild(printMount);
        }
      }, 800);
    } catch (err) {
      console.warn("Printing failed:", err);
      window.print();
    }
  };

  const [isExporting, setIsExporting] = useState(false);
  const [isOpeningTab, setIsOpeningTab] = useState(false);

  // Helper to fetch external image as base64 data url to prevent canvas tainting
  const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error("Failed to fetch image as base64:", err);
      return null;
    }
  };

  const exportInvoiceToPdf = async () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not create canvas context");

      const isRtl = !isEn;
      const width = 450;
      
      // Calculate dynamic height
      // Header padding + metadata + items + totals + qr code + footer
      const headerHeight = 220;
      const itemHeight = 40;
      const itemsCount = invoice.items.length;
      const summaryHeight = 150;
      const qrHeight = 180;
      const footerHeight = 80;
      
      const height = headerHeight + (itemsCount * itemHeight) + summaryHeight + qrHeight + footerHeight;
      
      // Retina scale for crisp print PDF
      const scale = 2; 
      canvas.width = width * scale;
      canvas.height = height * scale;
      
      ctx.scale(scale, scale);
      
      // Set direction for Arabic text support
      ctx.direction = isRtl ? 'rtl' : 'ltr';
      
      // Fill background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      
      // Border
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, width - 20, height - 20);
      
      // Top accent bar
      ctx.fillStyle = settings.accentColor || '#eab308';
      ctx.fillRect(10, 10, width - 20, 8);
      
      let y = 40;
      
      // Helper: Centered text
      const drawCenteredText = (text: string, fontSize: number, isBold: boolean, currentY: number) => {
        ctx.font = `${isBold ? 'bold' : 'normal'} ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText(text, width / 2, currentY);
      };

      // Helper: Left and Right aligned text
      const drawRow = (label: string, value: string, currentY: number, fontSize = 11, isBold = false) => {
        ctx.font = `${isBold ? 'bold' : 'normal'} ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = isBold ? '#0f172a' : '#334155';
        
        if (isRtl) {
          ctx.textAlign = 'right';
          ctx.fillText(label, width - 30, currentY);
          ctx.textAlign = 'left';
          ctx.fillText(value, 30, currentY);
        } else {
          ctx.textAlign = 'left';
          ctx.fillText(label, 30, currentY);
          ctx.textAlign = 'right';
          ctx.fillText(value, width - 30, currentY);
        }
      };

      // Helper: Dashed line divider
      const drawDashedLine = (currentY: number) => {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(30, currentY);
        ctx.lineTo(width - 30, currentY);
        ctx.stroke();
        ctx.setLineDash([]); // reset
      };

      // 1. Header Information
      const storeName = isEn ? settings.storeNameEn : settings.storeNameAr;
      drawCenteredText(storeName, 16, true, y);
      y += 22;
      
      const address = isEn ? settings.addressEn : settings.addressAr;
      drawCenteredText(address, 10, false, y);
      y += 16;
      
      drawCenteredText(`${isEn ? 'Phone:' : 'الهاتف:'} ${settings.phone}`, 10, false, y);
      y += 16;
      
      drawCenteredText(`${isEn ? 'VAT Registration:' : 'الرقم الضريبي:'} ${settings.vatNumber}`, 10, true, y);
      y += 20;
      
      drawDashedLine(y);
      y += 15;
      
      // 2. Invoice Meta
      drawRow(isEn ? 'Invoice No:' : 'رقم الفاتورة:', invoice.invoiceNumber, y, 11, true);
      y += 16;
      drawRow(isEn ? 'Date:' : 'التاريخ:', formatDate(invoice.timestamp, isEn), y, 10);
      y += 16;
      
      if (settings.showCashierName !== false) {
        drawRow(isEn ? 'Cashier:' : 'الكاشير:', invoice.cashierName, y, 10);
        y += 16;
      }
      
      if (invoice.customerName && invoice.customerId !== 'cust-cash') {
        drawRow(isEn ? 'Customer:' : 'العميل:', invoice.customerName, y, 10, true);
        y += 16;
      }
      
      y += 2;
      // Simplified Tax Invoice tag
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(30, y, width - 60, 20);
      ctx.fillStyle = '#0f172a';
      const invTitle = isEn 
        ? (settings.invoiceTitleEn || 'SIMPLIFIED TAX INVOICE') 
        : (settings.invoiceTitleAr || 'فاتورة ضريبية مبسطة');
      drawCenteredText(invTitle, 10, true, y + 14);
      y += 30;
      
      drawDashedLine(y);
      y += 15;
      
      // 3. Items Table Header
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.fillStyle = '#0f172a';
      if (isRtl) {
        ctx.textAlign = 'right';
        ctx.fillText('الصنف', width - 30, y);
        ctx.textAlign = 'center';
        ctx.fillText('الكمية', 140, y);
        ctx.textAlign = 'left';
        ctx.fillText('المجموع', 30, y);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText('Item Name', 30, y);
        ctx.textAlign = 'center';
        ctx.fillText('Qty', width - 140, y);
        ctx.textAlign = 'right';
        ctx.fillText('Total', width - 30, y);
      }
      y += 10;
      
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(width - 30, y);
      ctx.stroke();
      y += 15;
      
      // 4. Draw Items
      invoice.items.forEach((item) => {
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px Arial, sans-serif';
        
        const name = isEn ? item.nameEn : item.nameAr;
        const subtitle = `${item.barcodeUsed} @ ${item.unitPrice.toFixed(2)}`;
        
        if (isRtl) {
          ctx.textAlign = 'right';
          ctx.fillText(name, width - 30, y);
          
          ctx.font = 'normal 9px Arial, sans-serif';
          ctx.fillStyle = '#64748b';
          ctx.fillText(subtitle, width - 30, y + 12);
          
          ctx.font = 'bold 11px Arial, sans-serif';
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.fillText(String(item.quantity), 140, y + 6);
          
          ctx.textAlign = 'left';
          ctx.fillText(formatCurrency(item.total, isEn, settings), 30, y + 6);
        } else {
          ctx.textAlign = 'left';
          ctx.fillText(name, 30, y);
          
          ctx.font = 'normal 9px Arial, sans-serif';
          ctx.fillStyle = '#64748b';
          ctx.fillText(subtitle, 30, y + 12);
          
          ctx.font = 'bold 11px Arial, sans-serif';
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.fillText(String(item.quantity), width - 140, y + 6);
          
          ctx.textAlign = 'right';
          ctx.fillText(formatCurrency(item.total, isEn, settings), width - 30, y + 6);
        }
        y += itemHeight;
      });
      
      y -= 10;
      drawDashedLine(y);
      y += 15;
      
      // 5. Financial Summary
      drawRow(isEn ? 'Subtotal (Excl. Tax):' : 'المجموع (غير شامل الضريبة):', formatCurrency(invoice.subtotal, isEn, settings), y, 10);
      y += 16;
      
      if (invoice.discountTotal > 0) {
        drawRow(isEn ? 'Total Discount:' : 'إجمالي الخصم:', `-${formatCurrency(invoice.discountTotal, isEn, settings)}`, y, 10, true);
        y += 16;
      }
      
      drawRow(isEn ? 'VAT Amount (15%):' : 'ضريبة القيمة المضافة (15%):', formatCurrency(invoice.taxTotal, isEn, settings), y, 10);
      y += 20;
      
      // Grand Total Box
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(30, y - 12, width - 60, 22);
      drawRow(isEn ? 'NET TOTAL:' : 'صافي المبلغ المستحق:', formatCurrency(invoice.grandTotal, isEn, settings), y + 2, 12, true);
      y += 22;
      
      drawDashedLine(y);
      y += 15;
      
      // 6. Payment Details
      const pm = invoice.paymentMethod === 'cash' ? (isEn ? 'Cash' : 'نقداً') : invoice.paymentMethod === 'card' ? (isEn ? 'Card' : 'مدى/بطاقة') : (isEn ? 'Bank' : 'تحويل بنكي');
      drawRow(isEn ? 'Payment Method:' : 'طريقة الدفع:', pm, y, 10, true);
      y += 16;
      drawRow(isEn ? 'Paid Amount:' : 'المستلم:', formatCurrency(invoice.paidAmount, isEn, settings), y, 10);
      y += 16;
      drawRow(isEn ? 'Change:' : 'المتبقي:', formatCurrency(invoice.changeAmount, isEn, settings), y, 10, true);
      y += 20;
      
      // 7. QR Code Image Draw with robust CORS/Tainted canvas prevention
      if (settings.showQrCode !== false) {
        const base64Qr = await fetchImageAsBase64(qrCodeUrl);
        if (base64Qr) {
          const qrImage = new Image();
          await new Promise<void>((resolve) => {
            qrImage.onload = () => {
              try {
                // Centered QR Code
                ctx.drawImage(qrImage, (width - 100) / 2, y, 100, 100);
                y += 110;
              } catch (e) {
                console.error("CORS block even with base64 conversion:", e);
              }
              resolve();
            };
            qrImage.onerror = () => resolve();
            qrImage.src = base64Qr;
          });
        } else {
          // Safe fallback - draw a beautiful dashed placeholder so the canvas is NEVER tainted and export never crashes!
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect((width - 100) / 2, y, 100, 100);
          ctx.setLineDash([]);
          
          ctx.font = 'normal 10px Arial, sans-serif';
          ctx.fillStyle = '#64748b';
          ctx.textAlign = 'center';
          ctx.fillText(isEn ? '[ QR Code ]' : '[ رمز الاستجابة السريعة ]', width / 2, y + 54);
          y += 110;
        }
        
        drawCenteredText(isEn ? 'Scan to verify tax invoice' : 'امسح للتحقق من الفاتورة الضريبية', 8, false, y);
        y += 20;
      }
      
      // 8. Footer
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(width - 50, y);
      ctx.stroke();
      y += 16;
      
      const invFooter = isEn 
        ? (settings.invoiceFooterEn || 'Thank you for your visit!') 
        : (settings.invoiceFooterAr || 'شكراً لزيارتكم ونتطلع لخدمتكم!');
      drawCenteredText(invFooter, 10, true, y);
      y += 14;
      drawCenteredText(isEn ? 'CRM Powered by AI Studio Workspaces' : 'برنامج مبيعات ذكي مدعوم سحابياً', 8, false, y);
      
      // 9. Generate PDF via jsPDF with try-catch safety on canvas data URL
      let imgData = '';
      try {
        imgData = canvas.toDataURL('image/jpeg', 0.95);
      } catch (toDataUrlError) {
        console.warn("toDataURL with jpeg failed, trying png format fallback:", toDataUrlError);
        try {
          imgData = canvas.toDataURL('image/png');
        } catch (pngError) {
          console.error("PNG fallback also failed due to tainted canvas:", pngError);
        }
      }
      
      if (imgData) {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [80, (height * 80) / width]
        });
        
        pdf.addImage(imgData, 'JPEG', 0, 0, 80, (height * 80) / width);
        pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
      } else {
        alert(isEn 
          ? "Failed to generate PDF due to browser security restrictions. Please use another browser or open in a new tab." 
          : "فشل تصدير الفاتورة كـ PDF بسبب قيود الأمان في المتصفح. يرجى محاولة فتح التطبيق في نافذة مستقلة أولاً.");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const openInvoiceInNewTab = async () => {
    setIsOpeningTab(true);
    // Open a blank tab immediately to avoid browser popup block rules
    const newTab = window.open('', '_blank');
    if (!newTab) {
      alert(isEn 
        ? "Failed to open new tab. Please check your browser's pop-up blocker."
        : "فشل فتح تبويب جديد. يرجى التحقق من مانع النوافذ المنبثقة في متصفحك.");
      setIsOpeningTab(false);
      return;
    }

    // Write a loading placeholder
    newTab.document.write(`
      <html>
        <head>
          <title>${isEn ? 'Loading...' : 'جاري التحميل...'}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background-color: #f8fafc;
              color: #64748b;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div>${isEn ? 'Preparing receipt view...' : 'جاري تحضير معاينة الفاتورة...'}</div>
        </body>
      </html>
    `);

    try {
      const printableArea = document.getElementById('printable-receipt-area');
      if (!printableArea) {
        newTab.close();
        return;
      }

      // Capture all stylesheets to keep styling perfectly consistent
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      const isRtl = !isEn;
      
      // Create a clone of the printable element to manipulate QR Code source safely
      const clone = printableArea.cloneNode(true) as HTMLElement;
      
      // Find the image element for QR and replace it with base64 if present for offline support
      if (settings.showQrCode !== false) {
        const qrImage = clone.querySelector('img');
        if (qrImage) {
          const base64Qr = await fetchImageAsBase64(qrCodeUrl);
          if (base64Qr) {
            qrImage.src = base64Qr;
          }
        }
      }

      const printButtonText = isEn ? 'Print Invoice' : 'طباعة الفاتورة';
      const titleText = isEn ? `Receipt #${invoice.invoiceNumber}` : `معاينة فاتورة رقم ${invoice.invoiceNumber}`;

      const htmlContent = `<!DOCTYPE html>
<html dir="${isRtl ? 'rtl' : 'ltr'}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titleText}</title>
    ${styles}
    <style>
      body {
        background-color: #f1f5f9 !important;
        color: #1c1917 !important;
        margin: 0 !important;
        padding: 88px 12px 24px 12px !important;
        font-family: monospace;
        display: flex !important;
        justify-content: center !important;
        align-items: flex-start !important;
        min-height: 100vh !important;
      }
      
      /* Print control top bar */
      .top-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 64px;
        background-color: #0f172a;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 24px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        z-index: 9999;
        font-family: system-ui, -apple-system, sans-serif;
      }
      
      .top-bar-title {
        font-weight: bold;
        font-size: 15px;
      }
      
      .print-btn {
        background-color: ${settings.accentColor || '#eab308'};
        color: #0f172a;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 800;
        font-size: 13px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.15s ease-in-out;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
      }
      
      .print-btn:hover {
        opacity: 0.95;
        transform: translateY(-1px);
      }
      
      .print-btn:active {
        transform: translateY(0);
      }
      
      #printed-receipt-container {
        background: white !important;
        width: 100% !important;
        max-width: ${invoiceWidth}px !important;
        margin: 0 auto !important;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
        border-radius: 12px !important;
        border-top: 8px solid ${settings.accentColor || '#eab308'} !important;
        overflow: hidden;
      }
      
      @media print {
        body {
          background: white !important;
          padding: 0 !important;
        }
        .top-bar {
          display: none !important;
        }
        #printed-receipt-container {
          box-shadow: none !important;
          border-radius: 0 !important;
          border-top: none !important;
          max-width: 100% !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="top-bar">
      <div class="top-bar-title">${titleText}</div>
      <button class="print-btn" onclick="window.print()">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        <span>${printButtonText}</span>
      </button>
    </div>
    <div id="printed-receipt-container">
      <div class="${paddings}">
        ${clone.innerHTML}
      </div>
    </div>
  </body>
</html>`;

      newTab.document.open();
      newTab.document.write(htmlContent);
      newTab.document.close();
    } catch (err) {
      console.error("Failed to populate new tab:", err);
      newTab.close();
    } finally {
      setIsOpeningTab(false);
    }
  };

  const handleCopyReceipt = () => {
    const separator = "================================";
    const storeName = isEn ? settings.storeNameEn : settings.storeNameAr;
    const invoiceNum = `${isEn ? 'Invoice No:' : 'رقم الفاتورة:'} ${invoice.invoiceNumber}`;
    const invoiceDate = `${isEn ? 'Date:' : 'التاريخ:'} ${formatDate(invoice.timestamp, isEn)}`;
    const cashier = `${isEn ? 'Cashier:' : 'الكاشير:'} ${invoice.cashierName}`;
    
    const itemsHeader = `--------------------------------\n${isEn ? 'Item Name' : 'الصنف'} | ${isEn ? 'Qty' : 'الكمية'} | ${isEn ? 'Total' : 'المجموع'}\n--------------------------------`;
    const itemsBody = invoice.items.map(item => {
      const name = isEn ? item.nameEn : item.nameAr;
      return `${name} | ${item.quantity} | ${formatCurrency(item.total, isEn, settings)}`;
    }).join('\n');
    
    const summary = `--------------------------------\n` +
      `${isEn ? 'Subtotal (Excl. Tax):' : 'المجموع الضريبي:'} ${formatCurrency(invoice.subtotal, isEn, settings)}\n` +
      `${isEn ? 'VAT Amount (15%):' : 'ضريبة القيمة المضافة:'} ${formatCurrency(invoice.taxTotal, isEn, settings)}\n` +
      `${isEn ? 'GRAND NET TOTAL:' : 'الصافي النهائي للطلب:'} ${formatCurrency(invoice.grandTotal, isEn, settings)}`;
      
    const fullText = `${separator}\n${storeName}\n${separator}\n${invoiceNum}\n${invoiceDate}\n${cashier}\n${separator}\n${itemsHeader}\n${itemsBody}\n${summary}\n${separator}`;
    
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateWhatsappMessage = (): string => {
    const storeName = isEn ? settings.storeNameEn : settings.storeNameAr;
    const separator = "--------------------------------";
    
    // Header
    let msg = `*🧾 ${isEn ? (settings.invoiceTitleEn || 'SIMPLIFIED TAX INVOICE') : (settings.invoiceTitleAr || 'فاتورة ضريبية مبسطة')}*\n`;
    msg += `*${isEn ? 'From:' : 'من:'} ${storeName}*\n\n`;
    
    if (settings.vatNumber) {
      msg += `*${isEn ? 'VAT No:' : 'الرقم الضريبي للمنشأة:'}* \`${settings.vatNumber}\`\n`;
    }
    msg += `${separator}\n`;
    
    // Details
    msg += `• *${isEn ? 'Invoice No:' : 'رقم الفاتورة:'}* ${invoice.invoiceNumber}\n`;
    msg += `• *${isEn ? 'Date:' : 'التاريخ والوقت:'}* ${formatDate(invoice.timestamp, isEn)}\n`;
    
    if (settings.showCashierName !== false) {
      msg += `• *${isEn ? 'Cashier:' : 'الكاشير:'}* ${invoice.cashierName}\n`;
    }
    
    if (invoice.customerName && invoice.customerId !== 'cust-cash') {
      msg += `• *${isEn ? 'Customer:' : 'العميل:'}* ${invoice.customerName}\n`;
    }
    msg += `${separator}\n`;
    
    // Items
    msg += `*${isEn ? 'Items Purchased:' : 'الأصناف المشتراة:'}*\n`;
    invoice.items.forEach((item, idx) => {
      const name = isEn ? item.nameEn : item.nameAr;
      msg += `${idx + 1}. ${name} [${item.quantity} x ${formatCurrency(item.unitPrice, isEn, settings)}] = *${formatCurrency(item.total, isEn, settings)}*\n`;
    });
    msg += `${separator}\n`;
    
    // Totals
    msg += `• *${isEn ? 'Subtotal (Excl. VAT):' : 'المجموع الفرعي:'}* ${formatCurrency(invoice.subtotal, isEn, settings)}\n`;
    if (invoice.discountTotal > 0) {
      msg += `• *${isEn ? 'Total Discount:' : 'إجمالي الخصم:'}* -${formatCurrency(invoice.discountTotal, isEn, settings)}\n`;
    }
    msg += `• *${isEn ? 'VAT Amount (15%):' : 'ضريبة القيمة المضافة:'}* ${formatCurrency(invoice.taxTotal, isEn, settings)}\n`;
    msg += `• *${isEn ? 'NET TOTAL:' : 'صافي المبلغ المستحق:'}* *${formatCurrency(invoice.grandTotal, isEn, settings)}*\n`;
    msg += `${separator}\n`;
    
    // Payment
    const pm = invoice.paymentMethod === 'cash' ? (isEn ? 'Cash' : 'نقداً') : invoice.paymentMethod === 'card' ? (isEn ? 'Card' : 'مدى/بطاقة') : (isEn ? 'Bank' : 'تحويل بنكي');
    msg += `• *${isEn ? 'Payment Method:' : 'طريقة الدفع:'}* ${pm}\n`;
    msg += `• *${isEn ? 'Paid Amount:' : 'المبلغ المستلم:'}* ${formatCurrency(invoice.paidAmount, isEn, settings)}\n`;
    msg += `• *${isEn ? 'Change:' : 'المتبقي:'}* ${formatCurrency(invoice.changeAmount, isEn, settings)}\n`;
    if (invoice.notes) {
      msg += `• *${isEn ? 'Invoice Notes:' : 'ملاحظات الفاتورة:'}* ${invoice.notes}\n`;
    }
    msg += `\n`;
    
    // Footer message
    const footerMsg = isEn 
      ? (settings.invoiceFooterEn || 'Thank you for your visit!') 
      : (settings.invoiceFooterAr || 'شكراً لزيارتكم ونتطلع لخدمتكم!');
    msg += `*${footerMsg}*\n`;
    msg += `_${isEn ? 'CRM Powered by AI Studio Workspaces' : 'برنامج مبيعات ذكي مدعوم سحابياً'}_`;
    
    return msg;
  };

  // Clean WhatsApp Phone Formulation
  let cleanPhone = whatsappPhone.replace(/[^\d+]/g, '');
  if (cleanPhone.startsWith('05') && cleanPhone.length === 10) {
    cleanPhone = '966' + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('5') && cleanPhone.length === 9) {
    cleanPhone = '966' + cleanPhone;
  } else if (cleanPhone.startsWith('+')) {
    cleanPhone = cleanPhone.substring(1);
  }

  const whatsappMessageText = generateWhatsappMessage();
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessageText)}`;

  // QR Code URL based on ZATCA standard (TLVs)
  const qrCodeUrl = getZatcaQrCodeUrl(
    isEn ? settings.storeNameEn : settings.storeNameAr,
    settings.vatNumber,
    invoice.timestamp,
    invoice.grandTotal,
    invoice.taxTotal
  );

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Controls */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-1.5 text-emerald-600">
            <Check className="w-5 h-5 bg-emerald-100 rounded-full p-0.5" />
            <span className="text-sm font-bold text-slate-900">
              {isEn ? 'Sale Completed' : 'تم بيع الفاتورة بنجاح'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Container Scroller */}
        <div className="p-4 items-center flex flex-col overflow-y-auto bg-slate-100 grow">
          
          {/* Sandbox Iframe Print Warning Notice */}
          {isInIframe && (
            <div className="w-full bg-amber-50 border border-amber-205 text-amber-900 rounded-xl p-3 mb-4 text-xxs font-sans print:hidden text-start">
              <div className="flex gap-2 items-start">
                <span className="text-sm shrink-0">⚠️</span>
                <div className="space-y-1">
                  <p className="font-extrabold leading-tight">
                    {isEn ? 'AI Studio Sandbox Preview Notice' : 'تنبيه نافذة معينة AI Studio'}
                  </p>
                  <p className="text-[10px] text-amber-800 leading-normal">
                    {isEn 
                      ? 'The sandbox browser frames block custom window.print() triggers from within this nested preview iframe. To use standard web printing, please open the application in a new complete independent tab using the button in the very top-right of your screen, then print, or you can copy the full receipt text below.'
                      : 'تحظر متصفحات الويب تشغيل نوافذ الطباعة التلقائية من داخل النوافذ البرمجية المضمنة (Iframe). لتتمكن من استخدام الطباعة المباشرة، يرجى فتح التطبيق كـصفحة مستقلة ومباشرة عبر زر فتح التطبيق في المتصفح بأعلى اليمين، أو يمكنك نسخ تفاصيل الفاتورة كـنص بالزر أدناه.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col gap-2 w-full mb-4 print:hidden shrink-0">
            <button
              onClick={handlePrint}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] text-xs cursor-pointer select-none"
            >
              <Printer className="w-4 h-4" />
              {isEn ? 'Print Thermal (80mm)' : 'طباعة الفاتورة الحرارية'}
            </button>

            <button
              onClick={exportInvoiceToPdf}
              disabled={isExporting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] text-xs cursor-pointer select-none"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isEn ? 'Generating PDF...' : 'جاري تصدير PDF...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{isEn ? 'Export as PDF' : 'تصدير الفاتورة كـ PDF'}</span>
                </>
              )}
            </button>

            <button
              onClick={openInvoiceInNewTab}
              disabled={isOpeningTab}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] text-xs cursor-pointer select-none"
            >
              {isOpeningTab ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isEn ? 'Opening Tab...' : 'جاري فتح تبويب جديد...'}</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  <span>{isEn ? 'Open in New Tab (Print)' : 'فتح في تبويب جديد (طباعة)'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyReceipt}
              className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-extrabold py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all text-[11px] cursor-pointer select-none"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">{isEn ? 'Copied Successfully!' : 'تم نسخ الفاتورة كـنص!'}</span>
                </>
              ) : (
                <>
                  <span>📋 {isEn ? 'Copy Full Receipt Text' : 'نسخ تفاصيل الفاتورة كـنص'}</span>
                </>
              )}
            </button>

            {/* WhatsApp Control Button */}
            <button
              onClick={() => setShowWhatsappPanel(!showWhatsappPanel)}
              className="w-full bg-[#25d366] hover:bg-[#20ba5a] text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] text-xs cursor-pointer select-none"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{isEn ? 'Share on WhatsApp' : 'إرسال الفاتورة عبر واتساب'}</span>
            </button>

            {/* WhatsApp Interactive Panel */}
            {showWhatsappPanel && (
              <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-3 animate-fadeIn text-start text-xs text-slate-800">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                  <span className="text-lg">💬</span>
                  <span>{isEn ? 'WhatsApp Sharing Center' : 'مركز مشاركة واتساب'}</span>
                </div>
                
                <p className="text-[10px] text-emerald-700 leading-normal">
                  {isEn 
                    ? 'This will trigger the automatic download of the PDF invoice, then open WhatsApp Web/App with pre-filled message text to easily attach the PDF and send.' 
                    : 'سيقوم هذا الإجراء بتحميل الفاتورة بصيغة PDF تلقائياً، ثم فتح تطبيق واتساب وإدراج تفاصيل الفاتورة كـ نص لتسهيل إرسالها وإرفاق ملف الـ PDF للعميل.'}
                </p>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-700">
                    {isEn ? 'Customer WhatsApp Number' : 'رقم واتساب العميل (مع رمز الدولة بدون +)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 966501234567"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    className="w-full bg-white border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5 pt-1">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      exportInvoiceToPdf();
                    }}
                    className="w-full bg-[#128c7e] hover:bg-[#075e54] text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all text-[11px] text-center"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Download PDF & Open WhatsApp' : 'تحميل الـ PDF وفتح محادثة واتساب'}</span>
                  </a>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(whatsappMessageText);
                      setWhatsappCopied(true);
                      setTimeout(() => setWhatsappCopied(false), 2000);
                    }}
                    className="w-full bg-white hover:bg-slate-50 border border-emerald-200 text-emerald-800 font-extrabold py-1.5 px-3 rounded-lg text-[10px] transition-all cursor-pointer"
                  >
                    {whatsappCopied ? (isEn ? 'Copied to Clipboard!' : 'تم نسخ نص الرسالة!') : (isEn ? 'Copy Custom Text Message' : 'نسخ نص الرسالة فقط')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* REAL THERMAL PAPER LAYOUT (Rendered in high-contrast styling) */}
          <div 
            id="printable-receipt-area"
            dir={isEn ? 'ltr' : 'rtl'}
            className={`w-full bg-white text-stone-900 shadow-md border-t-8 rounded-xs select-all mx-auto leading-relaxed print:p-0 print:shadow-none print:max-w-full ${paddings}`}
            style={{ 
              fontFamily: 'monospace', 
              borderTopColor: settings.accentColor || '#eab308',
              maxWidth: `${invoiceWidth}px`,
              fontSize: fontSizes.root,
              fontWeight: 'bold'
            }}
          >
            {/* Header */}
            <div className="text-center space-y-1 mb-3">
              <h2 className="font-black uppercase text-center border-b border-dashed border-stone-400 pb-1" style={{ fontSize: fontSizes.title }}>
                {isEn ? settings.storeNameEn : settings.storeNameAr}
              </h2>
              <p className="text-stone-700" style={{ fontSize: fontSizes.sub }}>
                {isEn ? settings.addressEn : settings.addressAr}
              </p>
              <p className="text-stone-700" style={{ fontSize: fontSizes.sub }}>
                {isEn ? 'Phone:' : 'الهاتف:'} {settings.phone}
              </p>
              <p className="font-bold text-stone-900" style={{ fontSize: fontSizes.sub }}>
                {isEn ? 'VAT Registration:' : 'الرقم الضريبي:'} {settings.vatNumber}
              </p>
            </div>

            {/* Invoice Meta */}
            <div className="border-t border-dashed border-stone-400 pt-2 pb-2 space-y-0.5 text-stone-800" style={{ fontSize: fontSizes.sub }}>
              <div className="flex justify-between">
                <span>{isEn ? 'Invoice No:' : 'رقم الفاتورة:'}</span>
                <span className="font-bold">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>{isEn ? 'Date:' : 'التاريخ:'}</span>
                <span>{formatDate(invoice.timestamp, isEn)}</span>
              </div>
              {settings.showCashierName !== false && (
                <div className="flex justify-between">
                  <span>{isEn ? 'Cashier:' : 'الكاشير:'}</span>
                  <span>{isEn ? invoice.cashierName.split(' ')[0] : invoice.cashierName}</span>
                </div>
              )}
              {invoice.customerName && invoice.customerId !== 'cust-cash' && (
                <div className="flex justify-between border-t border-dotted border-stone-300 pt-1 mt-1 font-bold">
                  <span>{isEn ? 'Customer:' : 'العميل:'}</span>
                  <span>{invoice.customerName}</span>
                </div>
              )}
            </div>

            {/* Simplified Tax Invoice Tag */}
            <div className="text-center bg-stone-200 py-1 font-bold tracking-tight rounded-sm my-2" style={{ fontSize: fontSizes.badge }}>
              {isEn ? (settings.invoiceTitleEn || 'SIMPLIFIED TAX INVOICE') : (settings.invoiceTitleAr || 'فاتورة ضريبية مبسطة')}
            </div>

            {/* Items table */}
            <div className="border-t border-b border-dashed border-stone-400 py-2 my-2">
              <div className="grid grid-cols-12 gap-1 font-bold text-stone-900 mb-1" style={{ fontSize: fontSizes.sub }}>
                <span className="col-span-6 text-start">{isEn ? 'Item Name' : 'الصنف'}</span>
                <span className="col-span-2 text-center">{isEn ? 'Qty' : 'الكمية'}</span>
                <span className="col-span-4 text-end">{isEn ? 'Total' : 'المجموع'}</span>
              </div>
              
              <div className="space-y-1.5 divide-y divide-dotted divide-stone-200">
                {invoice.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-1 pt-1.5" style={{ fontSize: fontSizes.sub }}>
                    <div className="col-span-6 flex flex-col text-start">
                      <span className="font-bold text-stone-900 leading-tight">
                        {isEn ? item.nameEn : item.nameAr}
                      </span>
                      <span className="text-stone-500 font-mono" style={{ fontSize: fontSizes.badge }}>
                        {item.barcodeUsed} @ {item.unitPrice.toFixed(2)}
                      </span>
                    </div>
                    <span className="col-span-2 text-center self-center">{item.quantity}</span>
                    <span className="col-span-4 text-end self-center font-bold">
                      {formatCurrency(item.total, isEn, settings)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-1 text-stone-900 pb-2 border-b border-dashed border-stone-400" style={{ fontSize: fontSizes.sub }}>
              <div className="flex justify-between">
                <span>{isEn ? 'Subtotal (Excl. Tax):' : 'المجموع (غير شامل الضريبة):'}</span>
                <span>{formatCurrency(invoice.subtotal, isEn, settings)}</span>
              </div>
              
              {invoice.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>{isEn ? 'Total Discount:' : 'إجمالي الخصم:'}</span>
                  <span>-{formatCurrency(invoice.discountTotal, isEn, settings)}</span>
                </div>
              )}

              <div className="flex justify-between font-medium">
                <span>{isEn ? 'VAT Amount (15%):' : 'ضريبة القيمة المضافة (15%):'}</span>
                <span>{formatCurrency(invoice.taxTotal, isEn, settings)}</span>
              </div>

              <div className="flex justify-between font-black border-t border-dotted border-stone-300 pt-1 mt-1" style={{ fontSize: fontSizes.root }}>
                <span>{isEn ? 'NET TOTAL:' : 'صافي المبلغ المستحق:'}</span>
                <span>{formatCurrency(invoice.grandTotal, isEn, settings)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="text-stone-700 space-y-0.5 py-1.5 border-b border-dashed border-stone-400 mb-2" style={{ fontSize: fontSizes.badge }}>
              <div className="flex justify-between">
                <span>{isEn ? 'Payment Method:' : 'طريقة الدفع:'}</span>
                <span className="font-bold uppercase">
                  {invoice.paymentMethod === 'cash' ? (isEn ? 'Cash' : 'نقداً') : invoice.paymentMethod === 'card' ? (isEn ? 'Card' : 'مدى/بطاقة') : (isEn ? 'Bank' : 'تحويل بنكي')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{isEn ? 'Paid Amount:' : 'المستلم:'}</span>
                <span>{formatCurrency(invoice.paidAmount, isEn, settings)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>{isEn ? 'Change:' : 'المتبقي:'}</span>
                <span>{formatCurrency(invoice.changeAmount, isEn, settings)}</span>
              </div>
            </div>

            {/* Invoice Notes */}
            {invoice.notes && (
              <div className="border-b border-dashed border-stone-400 pb-1.5 mb-2 text-stone-850 text-start" style={{ fontSize: fontSizes.badge }}>
                <span className="font-bold block border-b border-dotted border-stone-300 pb-0.5 mb-1">{isEn ? 'Notes:' : 'ملاحظات:'}</span>
                <p className="whitespace-pre-wrap leading-tight font-medium text-stone-700">{invoice.notes}</p>
              </div>
            )}

            {/* ZATCA COMPLIANT QR CODE */}
            {settings.showQrCode !== false && (
              <div className="flex flex-col items-center justify-center space-y-1 my-3 bg-stone-50 p-2 rounded border border-stone-200">
                <img 
                  src={qrCodeUrl} 
                  alt="Zatca QR Code" 
                  className="w-32 h-32 select-none"
                  referrerPolicy="no-referrer"
                />
                <span className="text-stone-500 font-mono scale-90" style={{ fontSize: fontSizes.badge }}>
                  {isEn ? 'Scan to verify tax invoice' : 'امسح للتحقق من الفاتورة الضريبية'}
                </span>
              </div>
            )}

            {/* Footer */}
            <div className="text-center font-bold text-stone-600 border-t border-dotted border-stone-350 pt-2" style={{ fontSize: fontSizes.badge }}>
              <p>{isEn ? (settings.invoiceFooterEn || 'Thank you for your visit!') : (settings.invoiceFooterAr || 'شكراً لزيارتكم ونتطلع لخدمتكم!')}</p>
              <p className="font-normal mt-0.5 text-stone-500" style={{ fontSize: '7px' }}>
                {isEn ? 'CRM Powered by AI Studio Workspaces' : 'برنامج مبيعات ذكي مدعوم سحابياً'}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Global CSS injected specifically to isolate print results */}
      <style>{`
        @page {
          size: 80mm auto;
          margin: 0mm !important;
        }
        @media print {
          /* Reset and format body for high-contrast B&W printout */
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Reset full-screen fixed components layouts so they don't break the printing context flow */
          #root, #root > *, .fixed, .absolute {
            position: static !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            background: none !important;
          }
          /* Hide all surrounding interface, scroll containers, headers and widgets */
          body * {
            visibility: hidden !important;
          }
          #printable-receipt-area, #printable-receipt-area * {
            visibility: visible !important;
          }
          #printable-receipt-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${(invoiceWidth * 0.264583).toFixed(1)}mm !important; /* Perfect printable field margin fit for standard thermal rollers */
            max-width: ${(invoiceWidth * 0.264583).toFixed(1)}mm !important;
            margin: 0 !important;
            padding: 3mm !important;
            border: none !important;
            box-shadow: none !important;
            background-color: #ffffff !important;
          }
          .print-hidden, .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}
