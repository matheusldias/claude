import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Store, BarChart3, TrendingUp, Award, Clock, ChevronDown, ChevronUp, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export default function StoreProgress() {
  const navigate = useNavigate();
  const [expandedStore, setExpandedStore] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin' || user?.custom_role === 'admin';
  const isGestor = user?.custom_role === 'gestor';

  React.useEffect(() => {
    if (user && !isAdmin && !isGestor) {
      navigate(createPageUrl('MyCourses'));
    }
  }, [user, isAdmin, isGestor, navigate]);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.role === 'user');
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => base44.entities.Enrollment.list(),
  });

  const storeStats = stores.map(store => {
    const storeStudents = students.filter(s => s.store_id === store.id);
    const storeEnrollments = enrollments.filter(e => 
      storeStudents.some(s => s.id === e.user_id)
    );
    const completedEnrollments = storeEnrollments.filter(e => e.status === 'completed');
    const avgProgress = storeEnrollments.length > 0
      ? Math.min(100, Math.round(storeEnrollments.reduce((sum, e) => sum + Math.min(100, e.progress_percentage || 0), 0) / storeEnrollments.length))
      : 0;

    // Ranking de alunos por conclusões
    const studentRankings = storeStudents.map(student => {
      const studentEnrollments = enrollments.filter(e => e.user_id === student.id);
      const completed = studentEnrollments.filter(e => e.status === 'completed').length;
      const avgStudentProgress = studentEnrollments.length > 0
        ? Math.min(100, Math.round(studentEnrollments.reduce((sum, e) => sum + Math.min(100, e.progress_percentage || 0), 0) / studentEnrollments.length))
        : 0;
      
      return {
        student,
        completed,
        totalEnrolled: studentEnrollments.length,
        avgProgress: avgStudentProgress,
        remaining: studentEnrollments.length - completed,
      };
    }).sort((a, b) => b.completed - a.completed || b.avgProgress - a.avgProgress);

    return {
      store,
      studentCount: storeStudents.length,
      enrollmentCount: storeEnrollments.length,
      completedCount: completedEnrollments.length,
      avgProgress,
      completionRate: storeEnrollments.length > 0 
        ? Math.round((completedEnrollments.length / storeEnrollments.length) * 100)
        : 0,
      studentRankings,
    };
  });

  if (!user || (!isAdmin && !isGestor)) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Progresso por Loja
        </h1>
        <p className="text-slate-400">Acompanhe o desempenho de cada loja</p>
      </div>

      <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-sm">
        <CardContent className="p-6">
          {stores.length === 0 ? (
            <div className="text-center py-12">
              <Store className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhuma loja cadastrada</p>
            </div>
          ) : (
            <div className="space-y-6">
              {storeStats.map(({ store, studentCount, enrollmentCount, completedCount, avgProgress, completionRate, studentRankings }) => (
                <div
                  key={store.id}
                  className="p-6 rounded-lg bg-slate-800/30 border border-slate-800/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                        <Store className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-lg">{store.name}</h3>
                        <p className="text-sm text-slate-400">Código: {store.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          store.status === 'active'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }
                      >
                        {store.status === 'active' ? 'Ativa' : 'Inativa'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedStore(expandedStore === store.id ? null : store.id)}
                        className="text-slate-400 hover:text-white"
                      >
                        {expandedStore === store.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-slate-900/50">
                      <p className="text-xs text-slate-400 mb-1">Alunos</p>
                      <p className="text-2xl font-bold text-white">{studentCount}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/50">
                      <p className="text-xs text-slate-400 mb-1">Matrículas</p>
                      <p className="text-2xl font-bold text-white">{enrollmentCount}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/50">
                      <p className="text-xs text-slate-400 mb-1">Concluídos</p>
                      <p className="text-2xl font-bold text-green-400">{completedCount}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/50">
                      <p className="text-xs text-slate-400 mb-1">Taxa Conclusão</p>
                      <p className="text-2xl font-bold text-violet-400">{completionRate}%</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Progresso Médio</span>
                      <span className="text-white font-semibold">{avgProgress}%</span>
                    </div>
                    <Progress value={avgProgress} className="h-2" />
                  </div>

                  {/* Dashboard de Alunos */}
                  {expandedStore === store.id && (
                    <div className="mt-6 pt-6 border-t border-slate-700/50 space-y-4">
                      <h4 className="text-white font-semibold flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Ranking de Alunos
                      </h4>
                      
                      {studentRankings.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">Nenhum aluno vinculado a esta loja</p>
                      ) : (
                        <div className="space-y-3">
                          {studentRankings.map((ranking, index) => (
                            <div
                              key={ranking.student.id}
                              className="flex items-center gap-4 p-4 rounded-lg bg-slate-900/50 hover:bg-slate-900/70 transition-all"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                  index === 0 ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white' :
                                  index === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500 text-white' :
                                  index === 2 ? 'bg-gradient-to-br from-amber-700 to-amber-800 text-white' :
                                  'bg-slate-800 text-slate-400'
                                }`}>
                                  {index + 1}
                                </div>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white font-semibold">
                                  {ranking.student.full_name?.[0]?.toUpperCase() || 'A'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-white font-medium">
                                    {ranking.student.full_name || ranking.student.email}
                                  </h5>
                                  <p className="text-xs text-slate-400">{ranking.student.email}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-4 gap-4 text-center">
                                <div>
                                  <div className="flex items-center justify-center gap-1 mb-1">
                                    <Award className="w-3 h-3 text-green-400" />
                                    <p className="text-xs text-slate-400">Concluídos</p>
                                  </div>
                                  <p className="text-lg font-bold text-green-400">{ranking.completed}</p>
                                </div>
                                <div>
                                  <div className="flex items-center justify-center gap-1 mb-1">
                                    <TrendingUp className="w-3 h-3 text-violet-400" />
                                    <p className="text-xs text-slate-400">Progresso</p>
                                  </div>
                                  <p className="text-lg font-bold text-violet-400">{ranking.avgProgress}%</p>
                                </div>
                                <div>
                                  <div className="flex items-center justify-center gap-1 mb-1">
                                    <Clock className="w-3 h-3 text-orange-400" />
                                    <p className="text-xs text-slate-400">Restantes</p>
                                  </div>
                                  <p className="text-lg font-bold text-orange-400">{ranking.remaining}</p>
                                </div>
                                <div>
                                  <div className="flex items-center justify-center gap-1 mb-1">
                                    <User className="w-3 h-3 text-blue-400" />
                                    <p className="text-xs text-slate-400">Total</p>
                                  </div>
                                  <p className="text-lg font-bold text-blue-400">{ranking.totalEnrolled}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div className="p-6 rounded-lg bg-gradient-to-br from-violet-600/20 to-purple-600/20 border border-violet-500/30">
                <h3 className="text-white font-semibold mb-4">Resumo Geral</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-300 mb-1">Total Lojas</p>
                    <p className="text-2xl font-bold text-white">{stores.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-300 mb-1">Total Alunos</p>
                    <p className="text-2xl font-bold text-white">
                      {storeStats.reduce((sum, s) => sum + s.studentCount, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-300 mb-1">Total Matrículas</p>
                    <p className="text-2xl font-bold text-white">
                      {storeStats.reduce((sum, s) => sum + s.enrollmentCount, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-300 mb-1">Taxa Média</p>
                    <p className="text-2xl font-bold text-white">
                      {storeStats.length > 0
                        ? Math.round(storeStats.reduce((sum, s) => sum + s.completionRate, 0) / storeStats.length)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}