import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Award, Download, Calendar, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function Certificates() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ['myCertificates', user?.id],
    queryFn: () => base44.entities.Certificate.filter({ user_id: user?.id }, '-issued_at'),
    enabled: !!user?.id,
  });

  const [downloadingId, setDownloadingId] = useState(null);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const generateCertificateHtml = (certificate) => {
    const formattedDate = formatDate(certificate.issued_at);
    return `
      <div id="cert-render" style="width:1000px;height:700px;background:white;border:15px solid #0b2a4a;padding:40px;box-sizing:border-box;position:relative;overflow:hidden;font-family:Georgia,serif;">
        <div style="position:absolute;width:150px;height:150px;background:linear-gradient(135deg,#d4af37,#f5e6a6);border-radius:0 0 100% 0;top:0;right:0;"></div>
        <div style="position:absolute;width:150px;height:150px;background:linear-gradient(135deg,#d4af37,#f5e6a6);border-radius:0 0 100% 0;bottom:0;left:0;transform:rotate(180deg);"></div>
        <div style="text-align:center;font-size:48px;color:#0b2a4a;margin-top:40px;margin-bottom:20px;font-weight:bold;">Certificado</div>
        <div style="text-align:center;font-size:18px;color:#333;margin-bottom:20px;">Este certificado atesta que</div>
        <div style="text-align:center;">
          <span style="font-size:42px;color:#c49b3d;font-style:italic;border-bottom:2px solid #0b2a4a;display:inline-block;padding:10px 30px;">${certificate.user_name || ''}</span>
        </div>
        <div style="text-align:center;font-size:18px;color:#333;margin-top:20px;">concluiu com sucesso o curso:</div>
        <div style="text-align:center;font-size:26px;font-weight:bold;color:#0b2a4a;margin-top:6px;">${certificate.course_title || ''}</div>
        <div style="text-align:center;font-size:18px;color:#333;margin-top:16px;">concluído em:</div>
        <div style="text-align:center;font-size:26px;font-weight:bold;color:#0b2a4a;margin-top:4px;">${formattedDate}</div>
        <div style="position:absolute;bottom:80px;left:50%;transform:translateX(-50%);text-align:center;">
          <div style="width:300px;border-top:2px solid #0b2a4a;margin-bottom:10px;"></div>
          <div style="font-size:18px;color:#333;">Responsável</div>
        </div>
      </div>
    `;
  };

  const handleDownload = async (certificate) => {
    setDownloadingId(certificate.id);
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.innerHTML = generateCertificateHtml(certificate);
    document.body.appendChild(container);

    const el = container.querySelector('#cert-render');
    const canvas = await html2canvas(el, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1030, 730] });
    pdf.addImage(imgData, 'PNG', 0, 0, 1030, 730);
    pdf.save(`certificado-${certificate.code}.pdf`);

    document.body.removeChild(container);
    setDownloadingId(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Meus Certificados
        </h1>
        <p className="text-slate-400">Certificados dos cursos que você concluiu</p>
      </div>

      {/* Certificates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 bg-slate-900/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-800/50">
          <CardContent className="p-12 text-center">
            <Award className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Nenhum certificado ainda
            </h3>
            <p className="text-slate-400">
              Complete seus cursos para receber certificados
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((certificate) => (
            <Card
              key={certificate.id}
              className="bg-slate-900/50 border-slate-800/50 backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-300 overflow-hidden group"
            >
              <div className="bg-gradient-to-br from-violet-600 to-purple-600 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                <div className="relative">
                  <Award className="w-12 h-12 text-white mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">
                    Certificado de Conclusão
                  </h3>
                  <Badge className="bg-white/20 text-white border-white/30">
                    {certificate.code}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">
                    {certificate.course_title}
                  </h4>
                  <p className="text-sm text-slate-400">
                    Instrutor: {certificate.instructor_name}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(certificate.issued_at)}</span>
                  </div>
                  {certificate.total_hours && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{certificate.total_hours}h</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <Button
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                    onClick={() => handleDownload(certificate)}
                    disabled={downloadingId === certificate.id}
                  >
                    {downloadingId === certificate.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    {downloadingId === certificate.id ? 'Gerando PDF...' : 'Baixar PDF'}
                  </Button>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <p className="text-xs text-slate-500 text-center">
                    Código de verificação: {certificate.code}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}