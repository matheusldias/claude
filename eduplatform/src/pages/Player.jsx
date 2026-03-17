import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipForward,
  SkipBack,
  CheckCircle,
  X,
  Settings,
  ChevronLeft,
  ChevronRight,
  Lock,
  FileText,
  Image as ImageIcon,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";

export default function Player() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  const iframeRef = useRef(null);
  const progressUpdateTimerRef = useRef(null);

  const urlParams = new URLSearchParams(window.location.search);
  const lessonId = urlParams.get('lesson');
  const courseId = urlParams.get('course');

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showCompletePrompt, setShowCompletePrompt] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [canComplete, setCanComplete] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: lesson } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      const lessons = await base44.entities.Lesson.filter({ id: lessonId });
      return lessons[0];
    },
    enabled: !!lessonId,
    staleTime: 5 * 60 * 1000,
  });

  const isAdmin = user?.role === 'admin' || user?.custom_role === 'admin' || user?.custom_role === 'gestor';

  const { data: lessons = [] } = useQuery({
    queryKey: ['courseLessons', courseId, isAdmin],
    queryFn: async () => {
      const [all, moduleList] = await Promise.all([
        base44.entities.Lesson.filter({ course_id: courseId }, 'order'),
        base44.entities.Module.filter({ course_id: courseId }, 'order'),
      ]);
      // Ordenar por módulo primeiro, depois por order dentro do módulo
      const sorted = [...all].sort((a, b) => {
        const moduleAIdx = moduleList.findIndex(m => m.id === a.module_id);
        const moduleBIdx = moduleList.findIndex(m => m.id === b.module_id);
        if (moduleAIdx !== moduleBIdx) return moduleAIdx - moduleBIdx;
        return (a.order || 0) - (b.order || 0);
      });
      return isAdmin ? sorted : sorted.filter(l => l.status !== 'draft');
    },
    enabled: !!courseId && user !== undefined,
    staleTime: 5 * 60 * 1000,
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['courseModules', courseId],
    queryFn: () => base44.entities.Module.filter({ course_id: courseId }, 'order'),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: progressData = [] } = useQuery({
    queryKey: ['userProgress', user?.id, courseId],
    queryFn: () => base44.entities.Progress.filter({ user_id: user?.id, course_id: courseId }),
    enabled: !!user?.id && !!courseId,
    staleTime: 30 * 1000,
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
    staleTime: 30 * 1000,
  });

  // Detectar tipo de conteúdo
  const contentType = lesson?.content_type || 'video';
  const contentUrl = lesson?.content_url || lesson?.video_url;
  
  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const youtubeId = getYouTubeId(contentUrl);
  const isYouTube = !!youtubeId && contentType === 'video';

  const getGoogleDriveId = (url) => {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const driveId = getGoogleDriveId(contentUrl);
  const isGoogleDrive = !!driveId && contentType === 'video' && !isYouTube;

  const updateProgressMutation = useMutation({
    mutationFn: async (data) => {
      const existingProgress = progressData.find(p => p.lesson_id === lessonId);
      if (existingProgress) {
        return base44.entities.Progress.update(existingProgress.id, data);
      } else {
        return base44.entities.Progress.create({
          user_id: user?.id,
          lesson_id: lessonId,
          course_id: courseId,
          module_id: lesson?.module_id,
          ...data,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProgress'] });
    },
  });

  const updateEnrollmentMutation = useMutation({
    mutationFn: (data) => base44.entities.Enrollment.update(enrollment.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment'] });
    },
  });

  const markAsCompleteMutation = useMutation({
    mutationFn: async ({ lessonIdToComplete, snapshotProgressData, snapshotDuration, snapshotLesson }) => {
      const existingProgress = snapshotProgressData.find(p => p.lesson_id === lessonIdToComplete);
      const updateData = {
        completed: true,
        completed_at: new Date().toISOString(),
        percentage: 100,
        last_position: snapshotDuration,
        seconds_watched: snapshotDuration,
      };

      if (existingProgress) {
        await base44.entities.Progress.update(existingProgress.id, updateData);
      } else {
        await base44.entities.Progress.create({
          user_id: user?.id,
          lesson_id: lessonIdToComplete,
          course_id: courseId,
          module_id: snapshotLesson?.module_id,
          ...updateData,
        });
      }

      // Atualizar progresso no enrollment
      const allLessons = await base44.entities.Lesson.filter({ course_id: courseId });
      const allProgress = await base44.entities.Progress.filter({
        user_id: user?.id,
        course_id: courseId,
      });
      const completedCount = allProgress.filter(p => p.completed).length;
      const progressPercentage = (completedCount / allLessons.length) * 100;

      const courseCompleted = completedCount >= allLessons.length;

      if (enrollment) {
        await base44.entities.Enrollment.update(enrollment.id, {
          last_watched_lesson_id: lessonIdToComplete,
          progress_percentage: progressPercentage,
          completed_lessons: completedCount,
          total_lessons: allLessons.length,
          status: courseCompleted ? 'completed' : 'active',
          completed_at: courseCompleted ? new Date().toISOString() : null,
        });
      }

      // Emitir certificado se o curso foi concluído
      if (courseCompleted) {
        base44.functions.invoke('issueCertificate', { course_id: courseId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProgress'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment'] });
    },
  });

  useEffect(() => {
    if (enrollment && lessonId) {
      updateEnrollmentMutation.mutate({ last_watched_lesson_id: lessonId });
    }
  }, [lessonId, enrollment?.id]);

  // Resetar canComplete e isCompleting imediatamente ao trocar de aula
  useEffect(() => {
    setCanComplete(false);
    setIsCompleting(false);
    setCurrentTime(0);
    setDuration(0);
    ytCurrentTimeRef.current = 0;
    ytDurationRef.current = 0;
  }, [lessonId]);

  useEffect(() => {
    const existingProgress = progressData.find(p => p.lesson_id === lessonId);
    if (existingProgress && videoRef.current && existingProgress.last_position && !isYouTube) {
      videoRef.current.currentTime = existingProgress.last_position;
    }
    // Inicializar ponto máximo assistido para controle anti-skip do YouTube
    if (isYouTube) {
      maxWatchedTimeRef.current = existingProgress?.last_position || 0;
    }
    // Se a aula já foi completada, liberar botão
    if (existingProgress?.completed) {
      setCanComplete(true);
    } else {
      setCanComplete(false);
    }
  }, [lessonId, progressData, isYouTube]);

  // Rastrear tempo no YouTube via YouTube IFrame API
  const ytCurrentTimeRef = useRef(0);
  const ytDurationRef = useRef(0);
  const maxWatchedTimeRef = useRef(0);

  useEffect(() => {
    if (!isYouTube) return;

    const handleMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        // Receber dados de estado do player
        if (data?.event === 'infoDelivery' && data?.info) {
          const ct = data.info.currentTime;
          const dur = data.info.duration;
          if (dur && dur > 0) {
            ytDurationRef.current = dur;
            setDuration(dur);
          }
          if (ct !== undefined) {
            ytCurrentTimeRef.current = ct;
            setCurrentTime(ct);
          }
        }
        // Quando o player carrega, subscrever a atualizações
        if (data?.event === 'onReady') {
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: 'listening' }), '*'
          );
        }
        // Quando o vídeo termina (state 0 = ended), liberar conclusão
        if (data?.event === 'onStateChange' && data?.info === 0) {
          setCanComplete(true);
          const existingProgress = progressData.find(p => p.lesson_id === lessonId);
          if (!existingProgress?.completed) {
            setShowCompletePrompt(true);
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);

    // Polling a cada 500ms para verificar progresso e controlar seek
    const interval = setInterval(() => {
      const ct = ytCurrentTimeRef.current;
      const dur = ytDurationRef.current || lesson?.duration_seconds || 0;

      // Bloquear adiantamento para alunos (não-admin)
      if (!isAdmin && ct > 0 && maxWatchedTimeRef.current >= 0) {
        const allowedUntil = maxWatchedTimeRef.current + 2; // 2s de tolerância
        if (ct > allowedUntil) {
          // Aluno tentou adiantar — voltar ao ponto máximo assistido
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'seekTo', args: [maxWatchedTimeRef.current, true] }),
            '*'
          );
        } else {
          // Progresso normal — atualizar ponto máximo
          maxWatchedTimeRef.current = Math.max(maxWatchedTimeRef.current, ct);
        }
      } else if (isAdmin) {
        // Admin pode avançar livremente
        maxWatchedTimeRef.current = Math.max(maxWatchedTimeRef.current, ct);
      }

      if (dur > 0) {
        const remaining = dur - ct;
        if (remaining <= 15 && remaining >= 0 && ct > 0) {
          setCanComplete(true);
          setShowCompletePrompt(prev => {
            if (!prev) {
              const existingProgress = progressData.find(p => p.lesson_id === lessonId);
              if (!existingProgress?.completed) return true;
            }
            return prev;
          });
        }
      }
      // Solicitar estado ao player periodicamente
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening' }), '*'
      );
    }, 500);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, [isYouTube, lessonId, progressData, lesson, isAdmin]);

  useEffect(() => {
    if (isYouTube) {
      if (lesson?.duration_seconds) {
        setDuration(lesson.duration_seconds);
      }
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      const remaining = video.duration - video.currentTime;
      
      if (video.duration && remaining <= 15) {
        setCanComplete(true);
        if (!showCompletePrompt) {
          const existingProgress = progressData.find(p => p.lesson_id === lessonId);
          if (!existingProgress?.completed) {
            setShowCompletePrompt(true);
          }
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [lessonId, showCompletePrompt, progressData, isYouTube, lesson]);

  useEffect(() => {
    if (progressUpdateTimerRef.current) {
      clearInterval(progressUpdateTimerRef.current);
    }

    if (!isYouTube) {
      progressUpdateTimerRef.current = setInterval(() => {
        if (isPlaying && videoRef.current && lesson) {
          const currentPos = videoRef.current.currentTime;
          const videoDuration = videoRef.current.duration;
          const percentage = (currentPos / videoDuration) * 100;

          updateProgressMutation.mutate({
            last_position: currentPos,
            seconds_watched: currentPos,
            percentage: Math.min(percentage, 100),
          });
        }
      }, 10000);
    }

    return () => {
      if (progressUpdateTimerRef.current) {
        clearInterval(progressUpdateTimerRef.current);
      }
    };
  }, [isPlaying, lesson, lessonId, isYouTube]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (value) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value) => {
    if (videoRef.current) {
      const newVolume = value[0];
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const changePlaybackRate = (rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const skip = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentLessonIndex = () => {
    return lessons.findIndex(l => l.id === lessonId);
  };

  const isLessonUnlocked = (checkLesson) => {
    const lessonIndex = lessons.findIndex(l => l.id === checkLesson.id);
    if (lessonIndex === 0) return true;
    if (isAdmin) return true;

    // Aula já concluída sempre deve estar acessível
    const ownProgress = progressData.find(p => p.lesson_id === checkLesson.id);
    if (ownProgress?.completed) return true;

    const previousLesson = lessons[lessonIndex - 1];
    const previousProgress = progressData.find(p => p.lesson_id === previousLesson.id);
    return previousProgress?.completed || false;
  };

  const handleNextLesson = () => {
    const currentIndex = getCurrentLessonIndex();
    if (currentIndex < lessons.length - 1) {
      const nextLesson = lessons[currentIndex + 1];
      if (isLessonUnlocked(nextLesson)) {
        navigate(createPageUrl('Player') + `?lesson=${nextLesson.id}&course=${courseId}`);
      }
    }
  };

  const handlePreviousLesson = () => {
    const currentIndex = getCurrentLessonIndex();
    if (currentIndex > 0) {
      const prevLesson = lessons[currentIndex - 1];
      navigate(createPageUrl('Player') + `?lesson=${prevLesson.id}&course=${courseId}`);
    }
  };

  const goToLesson = (targetLesson) => {
    if (isLessonUnlocked(targetLesson)) {
      navigate(createPageUrl('Player') + `?lesson=${targetLesson.id}&course=${courseId}`);
    }
  };

  const getLessonProgress = (checkLessonId) => {
    return progressData.find(p => p.lesson_id === checkLessonId);
  };

  const getLessonsForModule = (moduleId) => {
    return lessons.filter(l => l.module_id === moduleId);
  };

  // Bloquear alunos sem loja vinculada
  const isAluno = user?.role === 'user' && (!user?.custom_role || user?.custom_role === 'aluno');
  if (user && isAluno && !user.store_id) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Acesso Restrito</h2>
          <p className="text-slate-400 mb-6">
            Sua conta ainda não está vinculada a uma loja. Entre em contato com o administrador para liberar seu acesso.
          </p>
          <button
            onClick={() => base44.auth.logout(window.location.href)}
            className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  const currentIndex = getCurrentLessonIndex();
  const hasNext = currentIndex < lessons.length - 1;
  const hasPrev = currentIndex > 0;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Bar */}
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 px-4 py-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(createPageUrl('CourseDetail') + '?id=' + courseId)}
          className="text-slate-300 hover:text-white"
        >
          <X className="w-5 h-5" />
        </Button>
        <h1 className="text-white font-semibold truncate flex-1 mx-4 text-sm md:text-base">{lesson.title}</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-slate-300 hover:text-white hidden md:flex"
        >
          {sidebarOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Video Player */}
        <div className="flex-1 flex flex-col bg-black relative min-h-0">
          <div
            className={`relative group w-full ${contentType === 'pdf' || contentType === 'image' ? 'flex-1 min-h-0' : ''}`}
            style={contentType !== 'pdf' && contentType !== 'image' ? { aspectRatio: '16/9' } : { flex: 1, minHeight: 0 }}
            onMouseMove={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            {contentType === 'pdf' ? (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(contentUrl)}&embedded=true`}
                className="w-full h-full absolute inset-0"
                title={lesson.title}
              />
            ) : contentType === 'image' ? (
              <div className="w-full h-full absolute inset-0 flex items-center justify-center bg-slate-950 p-8">
                <img
                  src={contentUrl}
                  alt={lesson.title}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : isYouTube ? (
              <iframe
                ref={iframeRef}
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0&enablejsapi=1&controls=1&disablekb=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : isGoogleDrive ? (
              <iframe
                src={`https://drive.google.com/file/d/${driveId}/preview`}
                className="w-full h-full"
                allow="autoplay"
                allowFullScreen
              />
            ) : (
              <video
                ref={videoRef}
                src={contentUrl}
                className="w-full h-full"
                onClick={togglePlay}
              />
            )}

            {/* Controls Overlay - Apenas para vídeos */}
            <AnimatePresence>
              {showControls && !isYouTube && contentType === 'video' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col justify-between p-6"
                >
                  {/* Top Controls */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-white text-xl font-semibold">{lesson.title}</h2>
                      <p className="text-slate-300 text-sm mt-1">{lesson.description}</p>
                    </div>
                  </div>

                  {/* Center Play Button */}
                  <div className="flex items-center justify-center">
                    <Button
                      onClick={togglePlay}
                      size="lg"
                      className="w-20 h-20 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                    >
                      {isPlaying ? (
                        <Pause className="w-10 h-10 text-white" />
                      ) : (
                        <Play className="w-10 h-10 text-white ml-1" />
                      )}
                    </Button>
                  </div>

                  {/* Bottom Controls */}
                  <div className="space-y-3">
                    {/* Progress Bar */}
                    <Slider
                      value={[currentTime]}
                      max={duration || 100}
                      step={0.1}
                      onValueChange={handleSeek}
                      className="cursor-pointer"
                    />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={togglePlay}
                          className="text-white hover:bg-white/10"
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => skip(-10)}
                          className="text-white hover:bg-white/10"
                        >
                          <SkipBack className="w-5 h-5" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => skip(10)}
                          className="text-white hover:bg-white/10"
                        >
                          <SkipForward className="w-5 h-5" />
                        </Button>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={toggleMute}
                            className="text-white hover:bg-white/10"
                          >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                          </Button>
                          <Slider
                            value={[isMuted ? 0 : volume]}
                            max={1}
                            step={0.01}
                            onValueChange={handleVolumeChange}
                            className="w-24"
                          />
                        </div>

                        <span className="text-white text-sm">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10">
                              <Settings className="w-5 h-5 mr-2" />
                              {playbackRate}x
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-slate-900 border-slate-800">
                            {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                              <DropdownMenuItem
                                key={rate}
                                onClick={() => changePlaybackRate(rate)}
                                className="text-slate-300 focus:bg-slate-800 focus:text-white cursor-pointer"
                              >
                                {rate}x
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={toggleFullscreen}
                          className="text-white hover:bg-white/10"
                        >
                          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Buttons */}
          <div className="bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/50 p-3 flex items-center justify-between gap-2 flex-shrink-0">
            <Button
              onClick={handlePreviousLesson}
              disabled={!hasPrev}
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs md:text-sm"
            >
              <ChevronLeft className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Anterior</span>
            </Button>

            <Button
              onClick={() => {
                if (isCompleting) return;
                setIsCompleting(true);
                // Captura os dados da aula ATUAL antes de navegar,
                // pois o navigate() muda o lessonId e a mutation poderia
                // usar o lessonId da próxima aula por causa do closure.
                const currentLessonId = lessonId;
                const currentProgressData = progressData;
                const currentDuration = duration;
                const currentLesson = lesson;
                markAsCompleteMutation.mutate({
                  lessonIdToComplete: currentLessonId,
                  snapshotProgressData: currentProgressData,
                  snapshotDuration: currentDuration,
                  snapshotLesson: currentLesson,
                });
                const currentIndex = lessons.findIndex(l => l.id === lessonId);
                if (currentIndex < lessons.length - 1) {
                  const nextLesson = lessons[currentIndex + 1];
                  navigate(createPageUrl('Player') + `?lesson=${nextLesson.id}&course=${courseId}`);
                } else {
                  navigate(createPageUrl('CourseDetail') + '?id=' + courseId);
                }
              }}
              disabled={isCompleting || markAsCompleteMutation.isPending || (!canComplete && contentType === 'video')}
              size="sm"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-xs md:text-sm flex-1 md:flex-none max-w-[200px] md:max-w-none"
            >
              <CheckCircle className="w-4 h-4 mr-1 md:mr-2 flex-shrink-0" />
              <span className="truncate">
                Marcar como Concluída
              </span>
            </Button>

            <Button
              onClick={handleNextLesson}
              disabled={!hasNext}
              size="sm"
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-xs md:text-sm"
            >
              <span className="hidden md:inline">Próxima</span>
              <ChevronRight className="w-4 h-4 md:ml-2" />
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="hidden md:block w-80 bg-slate-900/95 backdrop-blur-xl border-l border-slate-800/50 overflow-y-auto flex-shrink-0"
            >
              <div className="p-4 space-y-3">
                <h3 className="text-white font-semibold text-lg mb-4">Conteúdo</h3>
                {modules.map((module) => {
                  const moduleLessons = getLessonsForModule(module.id);
                  return (
                    <div key={module.id} className="space-y-2">
                      <h4 className="text-slate-400 text-sm font-medium px-2">{module.title}</h4>
                      {moduleLessons.map((moduleLesson) => {
                        const progress = getLessonProgress(moduleLesson.id);
                        const isUnlocked = isLessonUnlocked(moduleLesson);
                        const isCurrent = moduleLesson.id === lessonId;

                        const LessonIcon = moduleLesson.content_type === 'pdf' ? FileText : moduleLesson.content_type === 'image' ? ImageIcon : Play;
                        return (
                          <button
                            key={moduleLesson.id}
                            onClick={() => goToLesson(moduleLesson)}
                            disabled={!isUnlocked}
                            className={`w-full p-3 rounded-lg text-left transition-all ${
                              isCurrent
                                ? 'bg-violet-600 text-white'
                                : isUnlocked
                                ? 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                                : 'bg-slate-800/30 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {progress?.completed ? (
                                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                              ) : isUnlocked ? (
                                <LessonIcon className="w-4 h-4 flex-shrink-0" />
                              ) : (
                                <Lock className="w-4 h-4 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{moduleLesson.title}</p>
                                <p className="text-xs opacity-75">
                                  {moduleLesson.content_type === 'video' 
                                    ? `${Math.floor(moduleLesson.duration_seconds / 60)} min` 
                                    : moduleLesson.content_type === 'pdf' ? 'PDF' : 'Imagem'}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


    </div>
  );
}