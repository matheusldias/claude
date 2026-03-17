import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Clock,
  Play,
  Award,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function StudentProgress() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const studentId = urlParams.get('id');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Redirecionar não-admins
  React.useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate(createPageUrl('MyCourses'));
    }
  }, [currentUser, navigate]);

  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: studentId });
      return users[0];
    },
    enabled: !!studentId,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['studentEnrollments', studentId],
    queryFn: () => base44.entities.Enrollment.filter({ user_id: studentId }),
    enabled: !!studentId,
  });

  const { data: allProgress = [] } = useQuery({
    queryKey: ['studentAllProgress', studentId],
    queryFn: () => base44.entities.Progress.filter({ user_id: studentId }),
    enabled: !!studentId,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['allCourses'],
    queryFn: () => base44.entities.Course.list(),
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['allLessons'],
    queryFn: () => base44.entities.Lesson.list(),
  });

  const getCourseById = (courseId) => {
    return courses.find(c => c.id === courseId);
  };

  const getCourseLessons = (courseId) => {
    return lessons.filter(l => l.course_id === courseId);
  };

  const getCourseProgress = (courseId) => {
    return allProgress.filter(p => p.course_id === courseId);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTotalWatchTime = () => {
    return Math.round(
      allProgress.reduce((sum, p) => sum + (p.seconds_watched || 0), 0) / 60
    );
  };

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  const stats = {
    enrolled: enrollments.length,
    completed: enrollments.filter(e => e.status === 'completed').length,
    inProgress: enrollments.filter(e => e.status === 'active' && e.progress_percentage > 0).length,
    totalMinutes: getTotalWatchTime(),
    completedLessons: allProgress.filter(p => p.completed).length,
    totalLessons: enrollments.reduce((sum, e) => sum + (e.total_lessons || 0), 0),
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('AdminStudents'))}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
            {student.full_name?.[0]?.toUpperCase() || student.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{student.full_name}</h1>
            <p className="text-slate-400">{student.email}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/30 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.enrolled}</p>
                <p className="text-sm text-slate-300">Cursos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-600/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.completed}</p>
                <p className="text-sm text-slate-300">Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-600/20 to-amber-600/20 border-orange-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-600/30 flex items-center justify-center">
                <Play className="w-5 h-5 text-orange-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.inProgress}</p>
                <p className="text-sm text-slate-300">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-600/20 to-purple-600/20 border-violet-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-600/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-violet-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalMinutes}</p>
                <p className="text-sm text-slate-300">Minutos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card className="bg-slate-900/50 border-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Progresso Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Aulas Concluídas</span>
              <span className="text-white font-semibold">
                {stats.completedLessons} / {stats.totalLessons}
              </span>
            </div>
            <Progress
              value={stats.totalLessons > 0 ? (stats.completedLessons / stats.totalLessons) * 100 : 0}
              className="h-3"
            />
          </div>
        </CardContent>
      </Card>

      {/* Courses Progress */}
      <Card className="bg-slate-900/50 border-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Progresso por Curso</CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Aluno não está matriculado em nenhum curso</p>
            </div>
          ) : (
            <div className="space-y-4">
              {enrollments.map((enrollment) => {
                const course = getCourseById(enrollment.course_id);
                const courseLessons = getCourseLessons(enrollment.course_id);
                const courseProgress = getCourseProgress(enrollment.course_id);
                const completedLessons = courseProgress.filter(p => p.completed).length;

                return (
                  <div
                    key={enrollment.id}
                    className="p-4 rounded-lg bg-slate-800/30 border border-slate-800/50"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold mb-1">
                          {course?.title || 'Curso Desconhecido'}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                          <span>{courseLessons.length} aulas</span>
                          <span>•</span>
                          <span>
                            Iniciado em {formatDate(enrollment.created_date)}
                          </span>
                        </div>
                      </div>
                      <Badge
                        className={
                          enrollment.status === 'completed'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : enrollment.progress_percentage > 0
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }
                      >
                        {enrollment.status === 'completed'
                          ? 'Concluído'
                          : enrollment.progress_percentage > 0
                          ? 'Em Progresso'
                          : 'Não Iniciado'}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">
                          {completedLessons} de {courseLessons.length} aulas concluídas
                        </span>
                        <span className="text-white font-semibold">
                          {Math.round(enrollment.progress_percentage || 0)}%
                        </span>
                      </div>
                      <Progress value={enrollment.progress_percentage || 0} className="h-2" />
                    </div>

                    {/* Recent Activity */}
                    {courseProgress.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-800">
                        <h4 className="text-sm font-medium text-slate-400 mb-2">
                          Atividade Recente
                        </h4>
                        <div className="space-y-2">
                          {courseProgress
                            .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
                            .slice(0, 3)
                            .map((progress) => {
                              const lesson = lessons.find(l => l.id === progress.lesson_id);
                              return (
                                <div
                                  key={progress.id}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  {progress.completed ? (
                                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                                  ) : (
                                    <Play className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                  )}
                                  <span className="text-slate-300 flex-1 truncate">
                                    {lesson?.title || 'Aula'}
                                  </span>
                                  <span className="text-slate-500 text-xs">
                                    {Math.round(progress.percentage || 0)}%
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}