import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Play,
  Lock,
  CheckCircle,
  Clock,
  BookOpen,
  Award,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

export default function CourseDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id');

  const [expandedModules, setExpandedModules] = useState({});

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const courses = await base44.entities.Course.filter({ id: courseId });
      return courses[0];
    },
    enabled: !!courseId,
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules', courseId],
    queryFn: () => base44.entities.Module.filter({ course_id: courseId }, 'order'),
    enabled: !!courseId,
  });

  const isAdmin = user?.role === 'admin' || user?.custom_role === 'admin' || user?.custom_role === 'gestor';

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', courseId, isAdmin],
    queryFn: async () => {
      const all = await base44.entities.Lesson.filter({ course_id: courseId }, 'order');
      return isAdmin ? all : all.filter(l => l.status !== 'draft');
    },
    enabled: !!courseId && user !== undefined,
  });

  const { data: enrollment } = useQuery({
    queryKey: ['enrollment', user?.id, courseId],
    queryFn: async () => {
      const enrollments = await base44.entities.Enrollment.filter({
        user_id: user?.id,
        course_id: courseId,
      });
      return enrollments[0];
    },
    enabled: !!user?.id && !!courseId,
  });

  const { data: progressData = [] } = useQuery({
    queryKey: ['progress', user?.id, courseId],
    queryFn: () => base44.entities.Progress.filter({
      user_id: user?.id,
      course_id: courseId,
    }),
    enabled: !!user?.id && !!courseId,
  });

  useEffect(() => {
    if (modules.length > 0) {
      const expanded = {};
      modules.forEach(m => expanded[m.id] = true);
      setExpandedModules(expanded);
    }
  }, [modules]);

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const getLessonsForModule = (moduleId) => {
    return lessons.filter(l => l.module_id === moduleId).sort((a, b) => a.order - b.order);
  };

  const getLessonProgress = (lessonId) => {
    return progressData.find(p => p.lesson_id === lessonId);
  };

  const getModuleProgress = (moduleId) => {
    const moduleLessons = getLessonsForModule(moduleId);
    if (moduleLessons.length === 0) return 0;
    
    const completedCount = moduleLessons.filter(lesson => {
      const progress = getLessonProgress(lesson.id);
      return progress?.completed;
    }).length;
    
    return (completedCount / moduleLessons.length) * 100;
  };

  const isLessonUnlocked = (lesson, moduleId) => {
    const moduleLessons = getLessonsForModule(moduleId);
    const lessonIndex = moduleLessons.findIndex(l => l.id === lesson.id);
    
    if (lessonIndex === 0) return true;
    if (!lesson.requires_previous) return true;
    
    const previousLesson = moduleLessons[lessonIndex - 1];
    const previousProgress = getLessonProgress(previousLesson.id);
    return previousProgress?.completed || false;
  };

  const getNextUncompletedLesson = () => {
    for (const module of modules) {
      const moduleLessons = getLessonsForModule(module.id);
      for (const lesson of moduleLessons) {
        const progress = getLessonProgress(lesson.id);
        if (!progress?.completed && isLessonUnlocked(lesson, module.id)) {
          return lesson;
        }
      }
    }
    return null;
  };

  const handleStartLesson = (lesson) => {
    navigate(createPageUrl('Player') + `?lesson=${lesson.id}&course=${courseId}`);
  };

  const handleContinue = () => {
    const lastWatchedLessonId = enrollment?.last_watched_lesson_id;
    if (lastWatchedLessonId) {
      const lastLesson = lessons.find(l => l.id === lastWatchedLessonId);
      if (lastLesson) {
        handleStartLesson(lastLesson);
        return;
      }
    }
    
    const nextLesson = getNextUncompletedLesson();
    if (nextLesson) {
      handleStartLesson(nextLesson);
    }
  };

  if (courseLoading || !course) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  const totalLessons = lessons.length;
  const completedLessons = progressData.filter(p => p.completed).length;
  const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('MyCourses'))}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">{course.title}</h1>
          <p className="text-slate-400">{course.instructor_name}</p>
        </div>
      </div>

      {/* Course Hero */}
      <Card className="bg-slate-900/50 border-slate-800/50 overflow-hidden">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="aspect-video bg-gradient-to-br from-violet-600 to-purple-600 relative">
            {course.cover_url ? (
              <img
                src={course.cover_url}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-24 h-24 text-white opacity-30" />
              </div>
            )}
          </div>
          <CardContent className="p-6 flex flex-col justify-between">
            <div>
              <p className="text-slate-300 mb-4">{course.description}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20">
                  {course.level === 'beginner' ? 'Iniciante' : course.level === 'intermediate' ? 'Intermediário' : 'Avançado'}
                </Badge>
                {course.category && (
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                    {course.category}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-6 text-sm text-slate-400 mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>{totalLessons} aulas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{course.total_duration_minutes || 0} min</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Seu Progresso</span>
                  <span className="text-white font-semibold">{Math.round(overallProgress)}%</span>
                </div>
                <Progress value={overallProgress} className="h-3" />
                <p className="text-xs text-slate-400">
                  {completedLessons} de {totalLessons} aulas concluídas
                </p>
              </div>
              <Button
                onClick={handleContinue}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-lg py-6"
                disabled={totalLessons === 0}
              >
                <Play className="w-5 h-5 mr-2" />
                {enrollment?.last_watched_lesson_id ? 'Continuar de onde parei' : 'Começar Curso'}
              </Button>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Modules & Lessons */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Conteúdo do Curso</h2>
        {modules.map((module, moduleIndex) => {
          const moduleLessons = getLessonsForModule(module.id);
          const moduleProgress = getModuleProgress(module.id);
          const isExpanded = expandedModules[module.id];

          return (
            <Card key={module.id} className="bg-slate-900/50 border-slate-800/50 overflow-hidden">
              <button
                onClick={() => toggleModule(module.id)}
                className="w-full p-6 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 text-left">
                  <div className="w-12 h-12 rounded-lg bg-violet-600/20 flex items-center justify-center">
                    <span className="text-violet-400 font-bold">{moduleIndex + 1}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{module.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span>{moduleLessons.length} aulas</span>
                      <span>•</span>
                      <span>{Math.round(moduleProgress)}% concluído</span>
                    </div>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-slate-800/50 p-4 space-y-2">
                      {moduleLessons.map((lesson, lessonIndex) => {
                        const progress = getLessonProgress(lesson.id);
                        const isUnlocked = isLessonUnlocked(lesson, module.id);
                        const isCompleted = progress?.completed;

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => isUnlocked && handleStartLesson(lesson)}
                            disabled={!isUnlocked}
                            className={`w-full p-4 rounded-lg flex items-center justify-between transition-all ${
                              isUnlocked
                                ? 'hover:bg-slate-800/50 cursor-pointer'
                                : 'opacity-50 cursor-not-allowed'
                            } ${isCompleted ? 'bg-green-500/5' : 'bg-slate-800/30'}`}
                          >
                            <div className="flex items-center gap-3 flex-1 text-left">
                              {isCompleted ? (
                                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                              ) : isUnlocked ? (
                                <Play className="w-5 h-5 text-violet-400 flex-shrink-0" />
                              ) : (
                                <Lock className="w-5 h-5 text-slate-500 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium ${isCompleted ? 'text-green-400' : 'text-white'}`}>
                                  Aula {lessonIndex + 1}: {lesson.title}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {Math.floor(lesson.duration_seconds / 60)} minutos
                                </p>
                              </div>
                            </div>
                            {progress && !isCompleted && progress.percentage > 0 && (
                              <Badge variant="secondary" className="bg-violet-500/10 text-violet-400 border-violet-500/20">
                                {Math.round(progress.percentage)}%
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>
    </div>
  );
}