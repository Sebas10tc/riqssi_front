import { View } from '../types';

export default function Navbar({ currentView, setView, user, onProfileClick }) {
  const isGuestMode = !user || [View.LOGIN, View.REGISTER, View.RECOVER_PASSWORD, View.INSTRUCTIONS_SENT].includes(currentView);
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';
  const avatarText = (user?.initials || user?.username || user?.name || user?.email || 'RI')
    .trim()
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="w-full px-8 py-4 flex justify-between items-center border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50 animate-fade-in">
      <div className="flex items-center gap-12">
        <div 
          className="text-2xl font-black tracking-wider text-blue-600 cursor-pointer" 
          onClick={() => setView(user ? View.DASHBOARD : View.LOGIN)}
        >
          RIQSSI
        </div>
        <nav className="hidden md:flex gap-6 text-sm text-gray-500">
          <button 
            className={`hover:text-blue-600 transition-colors cursor-pointer font-medium ${currentView === View.PRICE ? 'text-blue-600 font-bold' : ''}`}
            onClick={() => setView(View.PRICE)}
          >
            Precios
          </button>
          <button 
            className={`hover:text-blue-600 transition-colors cursor-pointer font-medium ${currentView === View.FAQ ? 'text-blue-600 font-bold' : ''}`}
            onClick={() => setView(View.FAQ)}
          >
            FAQ
          </button>
          {!isGuestMode && (
            <>
              {isAdmin ? (
                <button 
                  className={`hover:text-blue-600 transition-colors cursor-pointer font-medium ${currentView === View.USER_MANAGEMENT ? 'text-blue-600 font-bold' : ''}`}
                  onClick={() => setView(View.USER_MANAGEMENT)}
                >
                  Panel
                </button>
              ) : null}
              <button 
                className={`hover:text-blue-600 transition-colors cursor-pointer font-medium ${currentView === View.HISTORY ? 'text-blue-600 font-bold' : ''}`}
                onClick={() => setView(View.HISTORY)}
              >
                Historial
              </button>
            </>
          )}
        </nav>
      </div>

      {isGuestMode ? (
        <button
          onClick={() => setView(View.LOGIN)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2 rounded-lg transition-all active:scale-95 shadow-md shadow-blue-600/10 cursor-pointer"
        >
          Login
        </button>
      ) : (
        <div 
          onClick={onProfileClick}
          className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 px-3 py-1.5 rounded-full cursor-pointer transition-all active:scale-95 group"
        >
          <span className="text-xs text-slate-700 font-bold group-hover:text-blue-600 transition-colors select-none">{user?.name || 'SEBA'}</span>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[11px] font-bold text-white shadow-sm">
            {avatarText}
          </div>
        </div>
      )}
    </header>
  );
}
