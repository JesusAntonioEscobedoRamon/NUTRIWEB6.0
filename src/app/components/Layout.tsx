import { ReactNode, useState } from 'react';
import { useAuth } from '@/app/context/useAuth';
import { Button } from '@/app/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/app/components/ui/alert-dialog';
import { 
  Home,
  Users, 
  Calendar, 
  FileText, 
  DollarSign, 
  Award,
  LogOut,
  User as UserIcon,
  Leaf,
  Menu,
  X,
  AlertTriangle
} from 'lucide-react';
import {ImageWithFallback} from '@/app/components/figma/ImageWithFallback';

declare global {
  interface Window {
    __hasPendingChanges?: boolean;
  }
}

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | (() => void | Promise<void>)>(null);

  const runOrAskPendingChanges = (action: () => void | Promise<void>) => {
    if (!window.__hasPendingChanges) {
      void action();
      return;
    }

    setPendingAction(() => action);
    setPendingDialogOpen(true);
  };

  const handleConfirmPendingChanges = async () => {
    const action = pendingAction;
    setPendingDialogOpen(false);
    setPendingAction(null);

    if (action) {
      await action();
    }
  };

  const handleCancelPendingChanges = () => {
    setPendingDialogOpen(false);
    setPendingAction(null);
  };

  // Depuración
  console.log('Layout - User completo:', user);
  console.log('Layout - fotoPerfil del nutriólogo:', user?.fotoPerfil);

  const adminMenuItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'nutriologos', label: 'Nutriólogos', icon: Users },
    { id: 'estadisticas', label: 'Estadísticas', icon: FileText }
  ];

  const nutriologoMenuItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'pacientes', label: 'Pacientes', icon: Users },
    { id: 'citas', label: 'Citas', icon: Calendar },
    { id: 'dietas', label: 'Dietas', icon: FileText },
    { id: 'pagos', label: 'Pagos', icon: DollarSign },
    { id: 'gamificacion', label: 'Gamificación', icon: Award },
    { id: 'perfil', label: 'Mi Perfil', icon: UserIcon }
  ];

  const menuItems = user?.rol === 'admin' ? adminMenuItems : nutriologoMenuItems;

  const handleTabClick = (id: string) => {
    if (id === activeTab) {
      return;
    }

    runOrAskPendingChanges(() => {
      onTabChange(id);
      setIsMobileMenuOpen(false);
    });
  };

  const handleLogout = async () => {
    runOrAskPendingChanges(async () => {
      await logout();
    });
  };

  // Usar fotoPerfil (camelCase) que ya viene completa desde el contexto
  const isNutriologo = user?.rol === 'nutriologo';
  const profileImage = isNutriologo && user?.fotoPerfil 
    ? user.fotoPerfil 
    : null;

  console.log('Layout - URL final para foto de perfil:', profileImage);

  return (
    <div className="flex h-screen bg-[#F8FFF9] font-sans p-0 md:p-6 gap-6 relative overflow-hidden">
      
      {/* OVERLAY PARA MÓVIL */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden transition-all"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-2 border-[#D1E8D5] flex flex-col rounded-none md:rounded-[2.5rem] shadow-xl lg:shadow-sm 
        transition-transform duration-500 ease-in-out lg:relative lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Logo Section */}
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-[#2E8B57] rounded-2xl flex items-center justify-center shadow-lg shadow-green-100">
              <Leaf className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-[900] text-[#1A3026] text-2xl uppercase tracking-[-1px] leading-none">
                NUTRI <span className="text-[#3CB371]">U</span>
              </h2>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[3px] mt-1">{user?.rol}</p>
            </div>
          </div>
          <button className="lg:hidden p-2 text-gray-400" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-[9px] font-black text-gray-400 uppercase tracking-[2px] mb-4">Menú Principal</p>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
                  isActive
                    ? 'bg-[#2E8B57] text-white shadow-md shadow-green-100'
                    : 'text-gray-500 hover:bg-[#F0FFF4] hover:text-[#2E8B57]'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'group-hover:scale-110 transition-transform'}`} />
                <span className="text-[11px] font-[900] uppercase tracking-wider">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Perfil & Logout - con foto de perfil para nutriólogo */}
        <div className="p-6 mt-auto">
          <div className="bg-[#F8FFF9] border-2 border-[#F0FFF4] rounded-[2rem] p-5 space-y-4">
            <div className="flex items-center gap-3">
              {profileImage ? (
                <div className="h-10 w-10 rounded-xl overflow-hidden border-2 border-[#D1E8D5] flex-shrink-0">
                  <ImageWithFallback
                    src={profileImage}
                    alt={`${user?.nombre} ${user?.apellido}`}
                    className="w-full h-full object-cover"
                    fallbackSrc="usu.webp"
                  />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-xl bg-white border border-[#D1E8D5] flex items-center justify-center font-black text-[#2E8B57] text-xs">
                  {user?.nombre?.[0]}{user?.apellido?.[0] || '?'}
                </div>
              )}
              <div className="overflow-hidden">
                <p className="font-black text-[#1A3026] text-[11px] uppercase truncate">
                  {user?.nombre} {user?.apellido}
                </p>
                <p className="text-[9px] font-bold text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" className="w-full bg-white border-2 border-red-50 text-red-400 hover:bg-red-50 hover:text-red-600 font-black text-[10px] uppercase h-12 rounded-xl">
              <LogOut className="h-4 w-4 mr-2" /> Cerrar Sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 bg-white border-none md:border-2 border-[#D1E8D5] rounded-none md:rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col relative">
        
        {/* HEADER MÓVIL */}
        <div className="lg:hidden p-6 border-b border-[#F0FFF4] flex items-center justify-between bg-white sticky top-0 z-30">
           <button 
             onClick={() => setIsMobileMenuOpen(true)}
             className="h-12 w-12 bg-[#F8FFF9] border-2 border-[#D1E8D5] rounded-2xl flex items-center justify-center text-[#2E8B57] active:scale-95 transition-all"
           >
              <Menu size={24} />
           </button>
           
           <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <Leaf className="text-[#2E8B57]" size={16} />
                <span className="font-[900] text-lg uppercase tracking-tight">NUTRI U</span>
              </div>
              <div className="w-8 h-1 bg-[#3CB371] rounded-full" />
           </div>

           <div className="w-12" />
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          <div className="absolute top-0 right-0 p-20 opacity-[0.03] pointer-events-none select-none">
             <Leaf size={400} className="text-[#2E8B57] rotate-12" />
          </div>
          
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </main>

      <AlertDialog open={pendingDialogOpen} onOpenChange={setPendingDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-2 border-[#D1E8D5]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#FDF4E8] text-[#D97706] flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <AlertDialogTitle className="text-[#1A3026] uppercase text-sm font-black tracking-wider">
                Cambios sin guardar
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-[#4B5563] text-sm pt-2">
              Tienes información pendiente. Si sales ahora, perderás los cambios no guardados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelPendingChanges}
              className="rounded-xl border-2 border-[#D1E8D5] text-[#1A3026] font-black text-[11px] uppercase"
            >
              Quedarme aquí
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPendingChanges}
              className="rounded-xl bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black text-[11px] uppercase"
            >
              Salir sin guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #D1E8D5; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3CB371; }
      `}</style>
    </div>
  );
}