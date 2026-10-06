export default function Footer() {
  return (
    <footer className="w-full px-8 py-8 border-t border-slate-200 bg-white mt-auto">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-widest text-blue-600">RIQSSI</span>
          <span className="text-xs text-slate-400 font-medium">© 2026</span>
        </div>
        <div className="flex gap-8 text-sm font-bold tracking-widest text-slate-500 uppercase">
          <a className="hover:text-blue-600 transition-colors" href="#">Términos</a>
          <a className="hover:text-blue-600 transition-colors" href="#">Contacto</a>
        </div>
      </div>
    </footer>
  );
}