import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Play, Award, Clock, CheckCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function MyCourses() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['myEnrollments', user?.id],
    queryFn: () => base44.entities.Enrollment.filter({ user_id: user?.id }, '-updated_date'),
    enabled: !!user?.id,
  });

  const { data: allCourses = [] } = useQuery({
    queryKey: ['allCourses'],
    queryFn: () => base44.entities.Course.list(),
  });

  const enrolledCourseIds = enrollments.map(e => e.course_id);
  const myCourses = allCourses.filter(c => enrolledCourseIds.includes(c.id));

  const filteredCourses = myCourses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getEnrollmentForCourse = (courseId) => {
    return enrollments.find(e => e.course_id === courseId);
  };

  const stats = {
    enrolled: myCourses.length,
    completed: enrollments.filter(e => e.status === 'completed').length,
    inProgress: enrollments.filter(e => e.status === 'active' && e.progress_percentage > 0).length,
    certificates: enrollments.filter(e => e.status === 'completed').length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Meus Cursos
        </h1>
        <p className="text-slate-400">Continue sua jornada de aprendizado</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-violet-600/20 to-purple-600/20 border-violet-500/30 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-600/30 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-violet-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.enrolled}</p>
                <p className="text-sm text-slate-300">Matriculado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-green-500/30 backdrop-blur-sm">
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

        <Card className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500/30 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/30 flex items-center justify-center">
                <Play className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.inProgress}</p>
                <p className="text-sm text-slate-300">Em Progresso</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-600/20 to-amber-600/20 border-orange-500/30 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-600/30 flex items-center justify-center">
                <Award className="w-5 h-5 text-orange-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.certificates}</p>
                <p className="text-sm text-slate-300">Certificados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar cursos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-400"
        />
      </div>

      {/* Courses Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-slate-900/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-800/50">
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchQuery ? 'Nenhum curso encontrado' : 'Nenhum curso matriculado'}
            </h3>
            <p className="text-slate-400 mb-6">
              {searchQuery ? 'Tente buscar com outros termos' : 'Entre em contato com o administrador para se matricular em cursos'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const enrollment = getEnrollmentForCourse(course.id);
            const progress = enrollment?.progress_percentage || 0;
            const isCompleted = enrollment?.status === 'completed';

            return (
              <Card
                key={course.id}
                className="bg-slate-900/50 border-slate-800/50 backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-300 overflow-hidden group cursor-pointer"
                onClick={() => navigate(createPageUrl('CourseDetail') + '?id=' + course.id)}
              >
                <div className="relative aspect-video overflow-hidden">
                  {course.cover_url ? (
                    <img
                      src={course.cover_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-white opacity-50" />
                    </div>
                  )}
                  {isCompleted && (
                    <div className="absolute top-3 right-3 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                      <CheckCircle className="w-3 h-3" />
                      Concluído
                    </div>
                  )}
                </div>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-violet-400 transition-colors">
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-slate-400 mb-4">
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{course.total_lessons || 0} aulas</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{course.total_duration_minutes || 0} min</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Progresso</span>
                      <span className="text-white font-semibold">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <Button
                    className="w-full mt-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(createPageUrl('CourseDetail') + '?id=' + course.id);
                    }}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {progress > 0 ? 'Continuar' : 'Começar'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}