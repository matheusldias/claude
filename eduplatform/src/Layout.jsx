import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { 
  GraduationCap, 
  LayoutDashboard, 
  BookOpen, 
  Users,
  Award,
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const isAdmin = user?.role === 'admin' || user?.custom_role === 'admin';
  const isGestor = user?.custom_role === 'gestor';
  const isAluno = user?.role === 'user' && (!user?.custom_role || user?.custom_role === 'aluno');
  const isPlayerPage = currentPageName === 'Player';

  // Se for página do player, não mostrar layout
  if (isPlayerPage) {
    return <div className="min-h-screen bg-gray-950">{children}</div>;
  }

  // Bloquear alunos sem loja vinculada
  if (user && isAluno && !user.store_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Acesso Restrito</h2>
          <p className="text-slate-400 mb-6">
            Sua conta ainda não está vinculada a uma loja. Entre em contato com o administrador para liberar seu acesso.
          </p>
          <Button onClick={handleLogout} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    );
  }

  const adminNav = [
    { name: 'Gerenciar Cursos', icon: LayoutDashboard, url: createPageUrl('AdminDashboard') },
    { name: 'Alunos', icon: Users, url: createPageUrl('AdminStudents') },
    { name: 'Progresso', icon: LayoutDashboard, url: createPageUrl('StoreProgress') },
    { name: 'Configurações', icon: Settings, url: createPageUrl('Settings') },
  ];

  const gestorNav = [
    { name: 'Dashboard', icon: LayoutDashboard, url: createPageUrl('AdminDashboard') },
    { name: 'Alunos', icon: Users, url: createPageUrl('AdminStudents') },
    { name: 'Progresso', icon: LayoutDashboard, url: createPageUrl('StoreProgress') },
  ];

  const studentNav = [
    { name: 'Catálogo', icon: BookOpen, url: createPageUrl('BrowseCourses') },
    { name: 'Meus Cursos', icon: LayoutDashboard, url: createPageUrl('MyCourses') },
    { name: 'Certificados', icon: Award, url: createPageUrl('Certificates') },
  ];

  const navigation = isAdmin ? adminNav : isGestor ? gestorNav : studentNav;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl(isAdmin ? 'AdminDashboard' : 'MyCourses')} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-all duration-300">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white hidden sm:block">EduPlatform</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.name}
                    to={item.url}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-3 hover:bg-slate-800/50">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                        {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                      </div>
                      <div className="hidden sm:block text-left">
                        <p className="text-sm font-medium text-white">{user.full_name || 'Usuário'}</p>
                        <p className="text-xs text-slate-400">{isAdmin ? 'Admin' : 'Aluno'}</p>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800">
                    <DropdownMenuLabel className="text-slate-300">
                      <div className="flex flex-col">
                        <span className="text-white">{user.full_name}</span>
                        <span className="text-xs text-slate-400 font-normal">
                          {isAdmin ? 'Admin' : isGestor ? 'Gestor' : 'Aluno'}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-800" />
                    <DropdownMenuItem onClick={handleLogout} className="text-slate-300 focus:bg-slate-800 focus:text-white cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-slate-300 hover:text-white hover:bg-slate-800/50"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800/50 bg-slate-900/95 backdrop-blur-xl">
            <nav className="px-4 py-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.name}
                    to={item.url}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 bg-slate-900/50 backdrop-blur-xl mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400">
              © 2025 EduPlatform. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">
                Suporte
              </a>
              <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">
                Termos de Uso
              </a>
              <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">
                Privacidade
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}