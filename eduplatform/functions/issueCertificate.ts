import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase() + 
         Math.random().toString(36).substring(2, 10).toUpperCase();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { course_id } = await req.json();

    // Verificar se o enrollment está completed
    const enrollments = await base44.entities.Enrollment.filter({
      user_id: user.id,
      course_id: course_id,
    });
    const enrollment = enrollments[0];

    if (!enrollment || enrollment.status !== 'completed') {
      return Response.json({ error: 'Curso não concluído' }, { status: 403 });
    }

    // Verificar se já tem certificado
    const existing = await base44.entities.Certificate.filter({
      user_id: user.id,
      course_id: course_id,
    });

    if (existing.length > 0) {
      return Response.json({ certificate: existing[0] });
    }

    // Buscar o curso
    const courses = await base44.entities.Course.filter({ id: course_id });
    const course = courses[0];

    // Criar o certificado
    const certificate = await base44.entities.Certificate.create({
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      course_id: course_id,
      course_title: course?.title || '',
      instructor_name: course?.instructor_name || '',
      code: generateCode(),
      issued_at: new Date().toISOString(),
      total_hours: course?.total_duration_minutes ? Math.ceil(course.total_duration_minutes / 60) : null,
    });

    return Response.json({ certificate });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});