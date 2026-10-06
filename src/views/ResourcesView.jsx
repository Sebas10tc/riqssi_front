import { BarChart3, Building2, Globe, Scale, ExternalLink, AlertTriangle } from 'lucide-react';

export default function ResourcesView() {
  return (
    <div className="container mx-auto px-12 py-10">
      <section className="mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center relative overflow-hidden h-112.5 shadow-sm">
            <div className="text-center z-10">
              <p className="text-[10px] tracking-[0.2em] text-red-600 uppercase font-bold mb-4" style={{ color: '#2563eb' }}>Veredicto del Sistema</p>
              <h1 className="text-8xl font-black text-red-600 mb-2">92%</h1>
              <p className="text-xl font-medium text-slate-800 mb-8">Probabilidad de IA</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 border border-red-600/20 bg-red-50 rounded text-[10px] uppercase font-bold tracking-wider text-red-700">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Contenido Manipulado
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 text-slate-800">
                <BarChart3 className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-bold uppercase tracking-wide">Desglose de IA</h3>
              </div>
              <div className="space-y-6">
                <ProgressBar label="IA en Video" value={95} />
                <ProgressBar label="IA en Audio" value={88} />
              </div>
            </div>
            
            <div className="bg-white border-l-4 border-red-500 rounded-xl p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-4">Resumen Ejecutivo</h3>
              <p className="text-sm leading-relaxed text-slate-700">
                Resultado Absoluto: <span className="text-red-600 font-bold">Alta Probabilidad de IA</span>. 
                Se detectaron artefactos de generación sintética en la coherencia de texturas cutáneas.
              </p>
            </div>
            
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm shadow-lg shadow-blue-600/20">
              Ver Reporte Detallado
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-3 text-blue-600 leading-tight">Recursos y Denuncia de Deepfakes</h2>
        <p className="text-slate-600 text-lg mb-10">Utilice estas herramientas oficiales para tomar medidas contra el contenido manipulado y proteger la integridad de la información.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ResourceCard 
            icon={<Building2 className="h-8 w-8 text-blue-600" />}
            title="Denuncia Electoral"
            description="Reporte desinformación y contenido sintético que afecte procesos democráticos ante el Jurado Nacional de Elecciones."
            linkText="Denunciar"
          />
          <ResourceCard 
            icon={<Globe className="h-8 w-8 text-blue-600" />}
            title="Redes Sociales"
            description="Canales directos para reportar deepfakes en Meta (Facebook/IG), X (Twitter) y TikTok por violación de políticas."
            linkText="Visitar Sitio"
          />
          <ResourceCard 
            icon={<Scale className="h-8 w-8 text-blue-600" />}
            title="Asistencia Legal"
            description="Acceso a consultoría especializada en delitos informáticos y suplantación de identidad mediante IA."
            linkText="Consultar"
          />
        </div>
      </section>
    </div>
  );
}

function ProgressBar({ label, value }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-2 uppercase font-bold">
        <span className="text-slate-500">{label}</span>
        <span className="text-red-600">{value}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${value}%` }}></div>
      </div>
    </div>
  );
}

function ResourceCard({ icon, title, description, linkText }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-6">{icon}</div>
      <h3 className="text-2xl font-bold mb-4 text-blue-600">{title}</h3>
      <p className="text-slate-600 text-sm mb-8 grow leading-relaxed">
        {description}
      </p>
      <a className="w-full py-3 px-4 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-center text-sm font-medium flex items-center justify-center gap-2 transition-all" href="#">
        {linkText}
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

function ChevronRightIcon(props) {
  return <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>;
}