import { showToast } from './utils.js';

export async function saveImage(nodeId){
  if (typeof html2canvas === 'undefined') {
    showToast('Image library not loaded. Please refresh the page.');
    return;
  }
  
  const node = document.getElementById(nodeId);
  const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const link = document.createElement('a');
  const date = (document.getElementById('plannerDate')?.value) || 'today';
  link.download = `cherry-planner-${date}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('Image saved!');
}

export async function savePDF(nodeId){
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    showToast('PDF library not loaded. Please refresh the page.');
    return;
  }
  
  const node = document.getElementById(nodeId);
  const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 40;
  const imgHeight = canvas.height * (imgWidth / canvas.width);
  if(imgHeight <= pageHeight - 40){
    pdf.addImage(imgData, 'JPEG', 20, 20, imgWidth, imgHeight, undefined, 'FAST');
  } else {
    let remaining = imgHeight; const ratio = imgWidth / canvas.width; const sliceHeightPt = pageHeight - 40; const sliceHeightPx = sliceHeightPt / ratio; const pageCanvas = document.createElement('canvas'); const ctx = pageCanvas.getContext('2d'); pageCanvas.width = canvas.width; pageCanvas.height = sliceHeightPx; let sY = 0;
    while(remaining > 0){
      ctx.clearRect(0,0,pageCanvas.width,pageCanvas.height);
      ctx.drawImage(canvas, 0, sY, canvas.width, sliceHeightPx, 0, 0, pageCanvas.width, pageCanvas.height);
      const sliceData = pageCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(sliceData, 'JPEG', 20, 20, imgWidth, sliceHeightPt, undefined, 'FAST');
      remaining -= sliceHeightPt; sY += sliceHeightPx; if(remaining > 0) pdf.addPage();
    }
  }
  const date = (document.getElementById('plannerDate')?.value) || 'today';
  pdf.save(`cherry-planner-${date}.pdf`);
  showToast('PDF saved!');
}


