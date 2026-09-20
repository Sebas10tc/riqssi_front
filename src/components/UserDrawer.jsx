import { motion } from 'motion/react';
import { X, User, LayoutGrid, Clock, Award, LogOut } from 'lucide-react';
import { View } from '../types';

export default function UserDrawer({ isOpen, onClose, currentView, setView, onLogout, user }) {
  if (!isOpen) return null;
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';

  const avatarText = (user?.username || user?.name || user?.email || 'RI')
    .trim()
    .slice(0, 2)
    .toUpperCase();

  const menuItems = [
    { id: View.PROFILE, label: 'Cuenta', icon: <User className="w-5 h-5" /> },
    ...(isAdmin ? [{ id: View.USER_MANAGEMENT, label: 'Panel', icon: <LayoutGrid className="w-5 h-5" /> }] : []),
    { id: View.HISTORY, label: 'Historial', icon: <Clock className="w-5 h-5" /> },
    { id: View.PRICE, label: 'Membresías', icon: <Award className="w-5 h-5" /> },
  ];

  return (
    <div className="fixed inset-0 z-100 flex justify-end">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-sm h-full bg-white shadow-2xl flex flex-col z-110"
      >
        {/* Header Close Button */}
        <div className="p-6 flex justify-end">
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors outline-none"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Profile Card Info */}
        <div className="px-8 pb-8 pt-2 flex flex-col items-center sm:items-start">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center text-xl font-bold text-white shadow-sm border border-blue-700/10">
              {user?.initials || avatarText}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">{user?.name || 'Cuenta'}</h2>
          <p className="text-sm text-slate-500 mt-1">{user?.email || 'Usuario autenticado'}</p>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* Menu Items */}
        <div className="p-6 grow">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-4 px-3">
            Gestión
          </p>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setView(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 relative ${
                    isActive
                      ? 'text-blue-600 bg-blue-50/70 border-r-4 border-blue-600'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600'}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="border-t border-slate-100 my-6" />

          {/* Logout Button */}
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50/50 transition-all duration-150"
          >
            <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-500" />
            Cerrar sesión
          </button>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold tracking-widest uppercase font-mono">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            Sistema Operativo
          </div>
        </div>
      </motion.div>
    </div>
  );
}
