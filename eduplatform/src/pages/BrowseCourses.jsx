import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Search, Clock, BarChart3, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BrowseCourses() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.filter({ status: 'published' }),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments', user?.id],
    queryFn: () => base44.entities.Enrollment.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const enrollMutation = useMutation({
    mutationFn: (courseId) => {
      const course = courses.find(c => c.id === courseId);
      return base44.entities.Enrollment.create({
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name || user.email,
        course_id: courseId,
        course_title: course.title,
        status: 'active',
        total_lessons: course.total_lessons || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
  });

  const isEnrolled = (courseId) => {
    return enrollments.some(e => e.course_id === courseId);
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLevelLabel = (level) => {
    const labels = {
      beginner: 'Iniciante',
      intermediate: 'Intermediário',
      advanced: 'Avançado'
    };
    return labels[level] || level;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Catálogo de Cursos
        </h1>
        <p className="text-slate-400">Explore e matricule-se nos cursos disponíveis</p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
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
            <p className="text-slate-400">Nenhum curso encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const enrolled = isEnrolled(course.id);
            return (
              <Card
                key={course.id}
                className="bg-slate-900/50 border-slate-800/50 hover:bg-slate-900/70 transition-all duration-300 overflow-hidden group cursor-pointer"
                onClick={() => navigate(createPageUrl('CourseDetail') + '?id=' + course.id)}
              >
                {course.cover_url ? (
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={course.cover_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-white opacity-50" />
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="secondary" className="bg-violet-500/10 text-violet-400 border-violet-500/20">
                      {getLevelLabel(course.level)}
                    </Badge>
                    {enrolled && (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                        Matriculado
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-white text-lg line-clamp-2">
                    {course.title}
                  </CardTitle>
                  <p className="text-sm text-slate-400 line-clamp-2 mt-2">
                    {course.description}
                  </p>
                </CardHeader>

                <CardContent>
                  <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                    <div className="flex items-center gap-1">
                      <PlayCircle className="w-4 h-4" />
                      <span>{course.total_lessons || 0} aulas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{course.total_duration_minutes || 0} min</span>
                    </div>
                  </div>

                  {enrolled ? (
                    <Button
                      className="w-full bg-violet-600 hover:bg-violet-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(createPageUrl('CourseDetail') + '?id=' + course.id);
                      }}
                    >
                      Continuar Estudando
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        enrollMutation.mutate(course.id);
                      }}
                      disabled={enrollMutation.isPending}
                    >
                      {enrollMutation.isPending ? 'Matriculando...' : 'Matricular-se'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}