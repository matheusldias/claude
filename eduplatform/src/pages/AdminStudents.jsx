import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Plus,
  Users,
  Search,
  MoreVertical,
  Eye,
  Trash2,
  BookOpen,
  CheckCircle,
  TrendingUp,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export default function AdminStudents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showStoreDialog, setShowStoreDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  
  const [newStudent, setNewStudent] = useState({
    full_name: "",
    email: "",
    password: "",
    store_id: "",
    custom_role: "aluno",
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin' || user?.custom_role === 'admin';
  const isGestor = user?.custom_role === 'gestor';

  // Redirecionar alunos
  React.useEffect(() => {
    if (user && !isAdmin && !isGestor) {
      navigate(createPageUrl('MyCourses'));
    }
  }, [user, isAdmin, isGestor, navigate]);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list('-created_date');
      return allUsers.filter(u => u.role === 'user');
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list('-created_date'),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['allEnrollments'],
    queryFn: () => base44.entities.Enrollment.list(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list(),
  });

  const createStudentMutation = useMutation({
    mutationFn: async (studentData) => {
      // Criar usuário - Note: Na plataforma Base44, usuários devem ser convidados pelo dashboard
      // Por enquanto, vamos apenas mostrar um alerta informando isso
      alert('IMPORTANTE: Para criar novos alunos na plataforma Base44, você precisa usar o dashboard.\n\nVá em Dashboard → Users → Invite User e convide o aluno por email.\n\nApós o aluno aceitar o convite e criar a conta, ele aparecerá aqui e você poderá matriculá-lo nos cursos.');
      throw new Error('Use o Dashboard para convidar usuários');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setShowCreateDialog(false);
      setNewStudent({ full_name: "", email: "", password: "", store_id: "", custom_role: "aluno" });
    },
  });

  const createEnrollmentsMutation = useMutation({
    mutationFn: async ({ studentId, courseIds }) => {
      const student = students.find(s => s.id === studentId);
      const existingEnrollments = enrollments.filter(e => e.user_id === studentId);
      const existingCourseIds = existingEnrollments.map(e => e.course_id);
      
      // Criar apenas matrículas para cursos que ainda não estão matriculados
      const coursesToEnroll = courseIds.filter(id => !existingCourseIds.includes(id));
      
      const enrollmentPromises = coursesToEnroll.map(courseId => {
        const course = courses.find(c => c.id === courseId);
        return base44.entities.Enrollment.create({
          user_id: studentId,
          user_email: student.email,
          user_name: student.full_name,
          course_id: courseId,
          course_title: course?.title,
          status: 'active',
          total_lessons: course?.total_lessons || 0,
        });
      });
      
      // Remover matrículas que foram desmarcadas
      const coursesToUnenroll = existingCourseIds.filter(id => !courseIds.includes(id));
      const unenrollPromises = coursesToUnenroll.map(courseId => {
        const enrollment = existingEnrollments.find(e => e.course_id === courseId);
        return enrollment ? base44.entities.Enrollment.delete(enrollment.id) : Promise.resolve();
      });
      
      return Promise.all([...enrollmentPromises, ...unenrollPromises]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allEnrollments'] });
      setShowEnrollDialog(false);
      setSelectedStudent(null);
      setSelectedCourses([]);
    },
  });

  const deleteEnrollmentMutation = useMutation({
    mutationFn: (enrollmentId) => base44.entities.Enrollment.delete(enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allEnrollments'] });
    },
  });

  const updateStudentStoreMutation = useMutation({
    mutationFn: async ({ studentId, storeId }) => {
      const store = stores.find(s => s.id === storeId);
      return base44.entities.User.update(studentId, {
        store_id: storeId || null,
        store_name: store ? store.name : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setShowStoreDialog(false);
      setSelectedStudent(null);
      setSelectedStoreId("");
    },
  });

  const handleCreateStudent = () => {
    if (!newStudent.full_name || !newStudent.email || !newStudent.password) {
      alert('Preencha todos os campos');
      return;
    }
    createStudentMutation.mutate(newStudent);
  };

  const handleEnrollStudent = () => {
    if (selectedCourses.length === 0) {
      alert('Selecione pelo menos um curso');
      return;
    }
    createEnrollmentsMutation.mutate({
      studentId: selectedStudent.id,
      courseIds: selectedCourses,
    });
  };

  const getStudentEnrollments = (studentId) => {
    return enrollments.filter(e => e.user_id === studentId);
  };

  const getStudentStats = (studentId) => {
    const studentEnrollments = getStudentEnrollments(studentId);
    return {
      enrolled: studentEnrollments.length,
      completed: studentEnrollments.filter(e => e.status === 'completed').length,
      avgProgress: studentEnrollments.length > 0
        ? Math.round(
            studentEnrollments.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) /
              studentEnrollments.length
          )
        : 0,
    };
  };

  const filteredStudents = students.filter(student =>
    student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openEnrollDialog = (student) => {
    setSelectedStudent(student);
    const studentEnrollments = getStudentEnrollments(student.id);
    const enrolledCourseIds = studentEnrollments.map(e => e.course_id);
    setSelectedCourses(enrolledCourseIds);
    setShowEnrollDialog(true);
  };

  const openStoreDialog = (student) => {
    setSelectedStudent(student);
    setSelectedStoreId(student.store_id || "");
    setShowStoreDialog(true);
  };

  const handleUpdateStore = () => {
    updateStudentStoreMutation.mutate({
      studentId: selectedStudent.id,
      storeId: selectedStoreId,
    });
  };

  const toggleCourseSelection = (courseId) => {
    setSelectedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const totalStats = {
    students: students.length,
    enrolled: enrollments.length,
    avgCompletion: enrollments.length > 0
      ? Math.round(
          (enrollments.filter(e => e.status === 'completed').length / enrollments.length) * 100
        )
      : 0,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Gerenciar Alunos
          </h1>
          <p className="text-slate-400">Cadastre alunos e gerencie matrículas</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Aluno
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total de Alunos</p>
                <p className="text-3xl font-bold text-white">{totalStats.students}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 bg-blue-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Matrículas Ativas</p>
                <p className="text-3xl font-bold text-white">{totalStats.enrolled}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 bg-green-500/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Taxa de Conclusão</p>
                <p className="text-3xl font-bold text-white">{totalStats.avgCompletion}%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 bg-orange-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students List */}
      <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-white">Todos os Alunos</CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar alunos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-slate-800/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhum aluno encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStudents.map((student) => {
                const stats = getStudentStats(student.id);
                const studentEnrollments = getStudentEnrollments(student.id);

                return (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-all duration-200 border border-slate-800/50"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white text-lg font-semibold">
                        {student.full_name?.[0]?.toUpperCase() || student.email?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold mb-1">
                          {student.full_name || 'Sem nome'}
                        </h3>
                        <p className="text-sm text-slate-400">{student.email}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          {student.store_name && (
                            <>
                              <span className="text-violet-400">🏪 {student.store_name}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>{stats.enrolled} curso(s)</span>
                          <span>•</span>
                          <span>{stats.completed} concluído(s)</span>
                          <span>•</span>
                          <span>{stats.avgProgress}% progresso médio</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openStoreDialog(student)}
                            className="border-slate-700 text-slate-300 hover:bg-slate-800"
                          >
                            <Store className="w-4 h-4 mr-2" />
                            Loja
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEnrollDialog(student)}
                            className="border-slate-700 text-slate-300 hover:bg-slate-800"
                          >
                            <BookOpen className="w-4 h-4 mr-2" />
                            Matrículas
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        onClick={() => navigate(createPageUrl('StudentProgress') + '?id=' + student.id)}
                        className="bg-violet-600 hover:bg-violet-700"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Progresso
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Student Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
            <DialogDescription className="text-slate-400">
              Preencha os dados do aluno para criar o acesso
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                placeholder="Ex: João Silva"
                value={newStudent.full_name}
                onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (Login)</Label>
              <Input
                id="email"
                type="email"
                placeholder="aluno@email.com"
                value={newStudent.email}
                onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Senha de acesso"
                value={newStudent.password}
                onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store">Loja</Label>
              <Select
                value={newStudent.store_id}
                onValueChange={(value) => setNewStudent({ ...newStudent, store_id: value })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Selecione uma loja" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value={null}>Nenhuma loja</SelectItem>
                  {stores.filter(s => s.status === 'active').map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name} ({store.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Perfil</Label>
              <Select
                value={newStudent.custom_role}
                onValueChange={(value) => setNewStudent({ ...newStudent, custom_role: value })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="aluno">Aluno</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateStudent}
              disabled={createStudentMutation.isLoading}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            >
              {createStudentMutation.isLoading ? 'Cadastrando...' : 'Cadastrar Aluno'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Store Dialog */}
      <Dialog open={showStoreDialog} onOpenChange={setShowStoreDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Vincular Loja</DialogTitle>
            <DialogDescription className="text-slate-400">
              Aluno: {selectedStudent?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label>Selecione a Loja</Label>
              <Select
                value={selectedStoreId}
                onValueChange={setSelectedStoreId}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Selecione uma loja" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value={null}>Nenhuma loja</SelectItem>
                  {stores.filter(s => s.status === 'active').map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name} ({store.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowStoreDialog(false);
                setSelectedStudent(null);
                setSelectedStoreId("");
              }}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateStore}
              disabled={updateStudentStoreMutation.isPending}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            >
              {updateStudentStoreMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerenciar Matrículas</DialogTitle>
            <DialogDescription className="text-slate-400">
              Aluno: {selectedStudent?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-96 overflow-y-auto">
            {courses.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nenhum curso publicado disponível</p>
            ) : (
              <div className="space-y-3">
                {courses.map((course) => {
                  const isEnrolled = selectedCourses.includes(course.id);
                  return (
                    <div
                      key={course.id}
                      className="flex items-center gap-3 p-4 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                    >
                      <Checkbox
                        id={course.id}
                        checked={isEnrolled}
                        onCheckedChange={() => toggleCourseSelection(course.id)}
                        className="border-slate-600"
                      />
                      <label
                        htmlFor={course.id}
                        className="flex-1 cursor-pointer"
                      >
                        <h4 className="text-white font-medium">{course.title}</h4>
                        <p className="text-sm text-slate-400">
                          {course.total_lessons || 0} aulas • {course.total_duration_minutes || 0} min
                        </p>
                      </label>
                      {isEnrolled && (
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                          Matriculado
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEnrollDialog(false);
                setSelectedStudent(null);
                setSelectedCourses([]);
              }}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEnrollStudent}
              disabled={createEnrollmentsMutation.isLoading}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            >
              {createEnrollmentsMutation.isLoading ? 'Salvando...' : 'Salvar Matrículas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}