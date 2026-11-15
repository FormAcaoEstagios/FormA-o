/* FormAção Estágio - aplicação principal */
const { createClient } = supabase;
const db = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
let currentUser = null;
let currentProfile = null;
let mySubjects = [];
let allStudents = [];
let teacherRankingRows = [];
let teacherGradeRows = [];
let studentSubjectRows = [];
let teacherSubmissionRows = [];
let studentGradeRows = [];
let editableActivities = [];

function message(id, text, error = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text || "";
  el.classList.toggle("error", !!error);
}
function show(id, visible) { $(id).classList.toggle("hidden", !visible); }
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function option(value, label) {
  return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
}
function fillSelect(id, rows, placeholder, valueKey, labelFn) {
  const el = $(id);
  el.innerHTML = option("", placeholder) + rows.map(r => option(r[valueKey], labelFn(r))).join("");
}
function dateText(value) {
  if (!value) return "Sem prazo definido";
  return new Date(value).toLocaleString("pt-BR");
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b === btn));
    show("login-form", btn.dataset.tab === "login");
    show("register-form", btn.dataset.tab === "register");
    message("auth-message", "");
  });
});

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  message("auth-message", "Entrando...");
  const { error } = await db.auth.signInWithPassword({
    email: $("login-email").value.trim(),
    password: $("login-password").value
  });
  if (error) return message("auth-message", error.message, true);
  await loadApp();
});

$("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  message("auth-message", "Criando conta...");
  const { data, error } = await db.auth.signUp({
    email: $("register-email").value.trim(),
    password: $("register-password").value,
    options: { data: { nome: $("register-name").value.trim(), tipo_solicitado: $("register-type").value } }
  });
  if (error) return message("auth-message", error.message, true);
  if (data.session) {
    message("auth-message", "Conta criada com sucesso!");
    await loadApp();
  } else {
    message("auth-message", "Conta criada. Confirme seu e-mail e depois entre na plataforma.");
  }
});

$("sidebar-logout").addEventListener("click", () => $("logout-btn").click());

$("profile-menu-btn").addEventListener("click", () => {
  $("profile-details").classList.toggle("hidden");
});

$("mobile-menu-btn").addEventListener("click", () => {
  $("sidebar").classList.toggle("mobile-open");
});

$("logout-btn").addEventListener("click", async () => {
  await db.auth.signOut();
  currentUser = null;
  currentProfile = null;
  show("app-screen", false);
  show("auth-screen", true);
  show("user-area", false);
});

db.auth.onAuthStateChange((_event, session) => {
  if (session?.user) setTimeout(loadApp, 0);
});
window.addEventListener("DOMContentLoaded", async () => {
  const { data } = await db.auth.getSession();
  if (data.session) await loadApp();
});


const navigationByRole = {
  admin: [
    { id: "admin-users", label: "Usuários", icon: "♙" },
    { id: "teacher-home", label: "Matricular", icon: "⌂" },
    { id: "teacher-subjects-page", label: "Matérias", icon: "▤" },
    { id: "teacher-submissions-page", label: "Entregas", icon: "⇧" },
    { id: "teacher-ranking-page", label: "Ranking e notas", icon: "♛" }
  ],
  professor: [
    { id: "teacher-home", label: "Matricular", icon: "⌂" },
    { id: "teacher-subjects-page", label: "Matérias", icon: "▤" },
    { id: "teacher-submissions-page", label: "Entregas", icon: "⇧" },
    { id: "teacher-ranking-page", label: "Ranking e notas", icon: "♛" }
  ],
  aluno: [
    { id: "student-subjects-page", label: "Matérias", icon: "▤" },
    { id: "student-grades-page", label: "Notas", icon: "✓" },
    { id: "student-ranking-page", label: "Ranking", icon: "♛" }
  ]
};

function openPage(pageId) {
  document.querySelectorAll(".page-section").forEach(section => {
    section.classList.toggle("page-active", (section.dataset.page || section.id) === pageId);
    section.classList.toggle("hidden", (section.dataset.page || section.id) !== pageId);
  });
  const teacherPanel = $("teacher-panel");
  if (teacherPanel) teacherPanel.classList.toggle("hidden", !["teacher-home","teacher-subjects-page","teacher-submissions-page","teacher-ranking-page"].includes(pageId));
  const studentPanel = $("student-panel");
  if (studentPanel) studentPanel.classList.toggle("hidden", !["student-subjects-page","student-grades-page","student-ranking-page"].includes(pageId));
  document.querySelectorAll(".side-nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageId);
  });
  const mobileSidebar = $("sidebar");
  if (mobileSidebar) mobileSidebar.classList.remove("mobile-open");
  const profileDetails = $("profile-details");
  if (profileDetails) profileDetails.classList.add("hidden");
}

function setupNavigation(profile) {
  const role = profile.tipo;
  const pendingTeacher = role === "aluno" && !!profile.solicitou_professor;
  const roleItems = pendingTeacher
    ? [{ id: "pending-panel", label: "Cadastro em análise", icon: "◷" }]
    : (navigationByRole[role] || []);
  const navItems = [...roleItems, { id: "profile-page", label: "Meu perfil", icon: "◉" }];
  $("side-navigation").innerHTML = navItems.map(item =>
    `<button type="button" class="side-nav-item" data-page="${item.id}"><span class="nav-icon">${item.icon}</span><span>${item.label}</span></button>`
  ).join("");
  $("side-navigation").querySelectorAll("[data-page]").forEach(button =>
    button.addEventListener("click", () => openPage(button.dataset.page))
  );
  $("profile-name").textContent = profile.nome || "Meu perfil";
  $("profile-role").textContent = role === "admin" ? "Administrador" : role === "professor" ? "Professor" : "Aluno";
  $("profile-avatar").textContent = (profile.nome || "U").trim().charAt(0).toUpperCase();
  $("profile-email").textContent = currentUser?.email || "";
  $("profile-type").textContent = $("profile-role").textContent;
  $("profile-page-name").textContent = profile.nome || "—";
  $("profile-page-email").textContent = currentUser?.email || "—";
  $("profile-page-type").textContent = $("profile-role").textContent;
  openPage(navItems[0]?.id || "profile-page");
}

async function loadApp() {
  const { data: authData, error: authError } = await db.auth.getUser();
  if (authError || !authData.user) return;
  currentUser = authData.user;
  const { data: profile, error } = await db.from("profiles").select("*").eq("id", currentUser.id).single();
  if (error || !profile) {
    message("auth-message", "Não foi possível carregar seu perfil: " + (error?.message || ""), true);
    return;
  }
  if (authData.user.user_metadata?.tipo_solicitado === "professor" &&
      profile.tipo === "aluno" && !profile.solicitou_professor) {
    const { error: requestError } = await db.rpc("solicitar_perfil_professor");
    if (requestError) {
      message("auth-message", "Não foi possível registrar a solicitação. Execute o SQL de atualização incluído no ZIP. " + requestError.message, true);
      return;
    }
    const { data: refreshedProfile } = await db.from("profiles").select("*").eq("id", currentUser.id).single();
    if (refreshedProfile) Object.assign(profile, refreshedProfile);
  }
  currentProfile = profile;
  show("auth-screen", false);
  show("app-screen", true);
  show("user-area", false);
  $("user-label").textContent = profile.nome;
  $("welcome-title").textContent = `Olá, ${profile.nome}!`;
  $("welcome-subtitle").textContent = profile.tipo === "admin" ? "Gerencie os usuários da plataforma." :
    profile.tipo === "professor" ? "Gerencie suas matérias, atividades e notas." : "Acompanhe suas matérias e seu desempenho.";
  $("role-pill").textContent = profile.tipo.toUpperCase();
  setupNavigation(profile);
  openPage(profile.tipo === "admin" ? "admin-users" : profile.tipo === "professor" ? "teacher-home" : profile.solicitou_professor ? "pending-panel" : "student-subjects-page");
  if (profile.tipo === "admin") await loadUsers();
  if (profile.tipo === "professor" || profile.tipo === "admin") await loadTeacherData();
  if (profile.tipo === "aluno") await loadStudentData();
}

async function loadUsers() {
  const { data, error } = await db.from("profiles").select("id,nome,tipo,solicitou_professor").order("nome");
  if (error) return message("app-message", error.message, true);
  const rows = data || [];
  $("users-list").innerHTML = `<table><thead><tr><th>Nome</th><th>Perfil</th><th>Solicitação</th><th>Ação</th></tr></thead><tbody>${
    rows.map(u => `<tr><td>${escapeHtml(u.nome)}</td><td>${escapeHtml(u.tipo)}</td>
    <td>${u.solicitou_professor ? '<strong class="pending-label">Aguardando aprovação</strong>' : '—'}</td><td>
    <div class="inline-controls">
      ${u.solicitou_professor ? `<button class="btn btn-primary" data-approve-professor="${u.id}">Aprovar</button><button class="btn btn-outline" data-reject-professor="${u.id}">Recusar</button>` :
      `<select id="role-${u.id}">
        <option value="aluno" ${u.tipo === "aluno" ? "selected" : ""}>Aluno</option>
        <option value="professor" ${u.tipo === "professor" ? "selected" : ""}>Professor</option>
        <option value="admin" ${u.tipo === "admin" ? "selected" : ""}>Administrador</option>
      </select><button class="btn btn-primary" data-save-role="${u.id}">Salvar</button>`}
    ${u.tipo !== "admin" && u.id !== currentUser.id ? `<button type="button" class="btn btn-outline btn-small" data-delete-user="${u.id}" data-delete-name="${escapeHtml(u.nome)}">Excluir conta</button>` : ""}
    </div></td></tr>`).join("")
  }</tbody></table>`;
  $("users-list").querySelectorAll("[data-delete-user]").forEach(btn => btn.addEventListener("click", async () => {
    if (currentProfile?.tipo !== "admin") return;
    const name = btn.dataset.deleteName;
    if (!confirm(`Excluir permanentemente a conta de ${name}? Esta ação pode apagar dados vinculados e não pode ser desfeita.`)) return;
    btn.disabled = true;
    const { data: sessionData } = await db.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) { btn.disabled = false; return message("app-message", "Sessão expirada. Entre novamente.", true); }
    try {
      const response = await fetch(`${window.SUPABASE_URL}/functions/v1/admin-delete-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "apikey": window.SUPABASE_ANON_KEY },
        body: JSON.stringify({ user_id: btn.dataset.deleteUser })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível excluir a conta.");
      message("app-message", "Conta excluída com sucesso.");
      await loadUsers();
    } catch (err) {
      btn.disabled = false;
      message("app-message", "Erro ao excluir: " + err.message + " (verifique a implantação da função admin-delete-user).", true);
    }
  }));
  $("users-list").querySelectorAll("[data-approve-professor]").forEach(btn => btn.addEventListener("click", async () => {
    const { error: updateError } = await db.from("profiles").update({ tipo: "professor", solicitou_professor: false }).eq("id", btn.dataset.approveProfessor);
    if (updateError) return message("app-message", updateError.message, true);
    message("app-message", "Professor aprovado."); await loadUsers();
  }));
  $("users-list").querySelectorAll("[data-reject-professor]").forEach(btn => btn.addEventListener("click", async () => {
    const { error: updateError } = await db.from("profiles").update({ solicitou_professor: false }).eq("id", btn.dataset.rejectProfessor);
    if (updateError) return message("app-message", updateError.message, true);
    message("app-message", "Solicitação recusada; a conta permanece como aluno."); await loadUsers();
  }));
  $("users-list").querySelectorAll("[data-save-role]").forEach(btn => btn.addEventListener("click", async () => {
    const id = btn.dataset.saveRole, tipo = $(`role-${id}`).value;
    const { error: updateError } = await db.from("profiles").update({ tipo }).eq("id", id);
    if (updateError) return message("app-message", updateError.message, true);
    message("app-message", "Perfil atualizado."); await loadUsers();
  }));
}

async function loadTeacherData() {
  let query = db.from("subjects").select("*").order("created_at", { ascending: false });
  if (currentProfile.tipo === "professor") query = query.eq("professor_id", currentUser.id);
  const { data: subjects, error } = await query;
  if (error) return message("app-message", error.message, true);
  mySubjects = subjects || [];
  const { data: students, error: studentError } = await db.from("profiles").select("id,nome").eq("tipo", "aluno").order("nome");
  if (studentError) return message("app-message", studentError.message, true);
  allStudents = students || [];
  fillSelect("edit-subject-select", mySubjects, "Selecione uma matéria para alterar", "id", s => s.nome);
  $("edit-subject-name").value = "";
  $("edit-subject-description").value = "";
  $("delete-subject-btn").disabled = true;
  fillSelect("enroll-subject", mySubjects, "Selecione a matéria", "id", s => s.nome);
  fillSelect("activity-subject", mySubjects, "Selecione a matéria", "id", s => s.nome);
  fillSelect("enroll-student", allStudents, "Selecione o aluno", "id", s => s.nome);
  fillSelect("grade-student", allStudents, "Selecione o aluno", "id", s => s.nome);
  const { data: acts, error: actError } = await db.from("activities").select("id,titulo,descricao,prazo,subject_id").order("created_at", { ascending: false });
  if (actError) return message("app-message", actError.message, true);
  const allowed = (acts || []).filter(a => mySubjects.some(s => s.id === a.subject_id));
  editableActivities = allowed;
  fillSelect("edit-activity-select", allowed, "Selecione a atividade para editar", "id", a => a.titulo + " — " + (mySubjects.find(s => s.id === a.subject_id)?.nome || ""));
  fillSelect("grade-activity", allowed, "Selecione a atividade", "id", a => a.titulo);
  fillSelect("teacher-ranking-subject", mySubjects, "Selecione a matéria", "id", s => s.nome);
  fillSelect("teacher-submissions-subject", mySubjects, "Selecione a matéria", "id", s => s.nome);
  renderTeacherSubmissions("");
  $("teacher-subjects").innerHTML = mySubjects.length ? mySubjects.map(s =>
    `<article class="subject-card"><h3>${escapeHtml(s.nome)}</h3><p>${escapeHtml(s.descricao || "Sem descrição")}</p><button type="button" class="btn btn-outline btn-small" data-open-teacher-ranking="${s.id}">Ver ranking desta matéria</button></article>`
  ).join("") : "<p class='muted'>Nenhuma matéria cadastrada ainda.</p>";
  $("teacher-subjects").querySelectorAll('[data-open-teacher-ranking]').forEach(btn => btn.addEventListener('click', () => {
    $("teacher-ranking-subject").value = btn.dataset.openTeacherRanking;
    openPage("teacher-ranking-page");
    loadTeacherSubjectReport(btn.dataset.openTeacherRanking);
  }));
  clearTeacherSubjectReport();

  // Carrega as entregas, mas só exibe depois que o professor selecionar uma matéria.
  const subjectIds = mySubjects.map(s => s.id);
  teacherSubmissionRows = [];
  if (!subjectIds.length) {
    $("teacher-submissions").innerHTML = "<p class='muted'>Nenhuma matéria cadastrada ainda.</p>";
    return;
  }
  const { data: teacherActivities, error: teacherActError } = await db.from("activities")
    .select("id,titulo,subject_id").in("subject_id", subjectIds);
  if (teacherActError) return message("app-message", teacherActError.message, true);
  const activityIds = (teacherActivities || []).map(a => a.id);
  if (!activityIds.length) {
    $("teacher-submissions").innerHTML = "<p class='muted'>Ainda não há atividades publicadas.</p>";
    return;
  }
  const { data: submissions, error: submissionError } = await db.from("submissions")
    .select("id,activity_id,student_id,file_path,file_name,entregue_em,atualizado_em")
    .in("activity_id", activityIds).order("entregue_em", { ascending: false });
  if (submissionError) return message("app-message", submissionError.message, true);
  const studentIds = [...new Set((submissions || []).map(sub => sub.student_id))];
  let studentNames = {};
  if (studentIds.length) {
    const { data: names, error: namesError } = await db.from("profiles").select("id,nome").in("id", studentIds);
    if (namesError) return message("app-message", namesError.message, true);
    studentNames = Object.fromEntries((names || []).map(st => [st.id, st.nome]));
  }
  const activityMap = Object.fromEntries((teacherActivities || []).map(a => [a.id, a]));
  teacherSubmissionRows = await Promise.all((submissions || []).map(async sub => {
    const activity = activityMap[sub.activity_id];
    const { data: signed } = await db.storage.from("entregas").createSignedUrl(sub.file_path, 3600);
    return { subject_id: activity?.subject_id, html: `<tr><td>${escapeHtml(studentNames[sub.student_id] || "Aluno")}</td>
      <td>${escapeHtml(activity?.titulo || "Atividade")}</td><td>${dateText(sub.entregue_em)}</td>
      <td>${sub.atualizado_em ? dateText(sub.atualizado_em) : dateText(sub.entregue_em)}</td>
      <td>${signed?.signedUrl ? `<a class="file-link" href="${escapeHtml(signed.signedUrl)}" target="_blank" rel="noopener">${escapeHtml(sub.file_name || "Abrir arquivo")}</a>` : `<span class="muted">Arquivo indisponível</span>`}</td></tr>`};
  }));
  renderTeacherSubmissions($("teacher-submissions-subject").value);

}


function renderTeacherSubmissions(subjectId) {
  if (!subjectId) {
    $("teacher-submissions").innerHTML = "<p class='muted'>Selecione uma matéria para visualizar as entregas.</p>";
    return;
  }
  const rows = teacherSubmissionRows.filter(row => row.subject_id === subjectId).map(row => row.html);
  $("teacher-submissions").innerHTML = rows.length
    ? `<div class="table-wrap"><table><thead><tr><th>Aluno</th><th>Atividade</th><th>Entregue em</th><th>Última edição</th><th>Arquivo individual</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`
    : "<p class='muted'>Nenhum aluno entregou atividades nesta matéria ainda.</p>";
}
$("teacher-submissions-subject").addEventListener("change", e => renderTeacherSubmissions(e.target.value));

$("subject-form").addEventListener("submit", async e => {
  e.preventDefault();
  const { error } = await db.from("subjects").insert({
    nome: $("subject-name").value.trim(),
    descricao: $("subject-description").value.trim(),
    professor_id: currentUser.id
  });
  if (error) return message("app-message", error.message, true);
  e.target.reset(); message("app-message", "Matéria criada com sucesso."); await loadTeacherData();
});

$("enroll-form").addEventListener("submit", async e => {
  e.preventDefault();
  const { error } = await db.from("enrollments").insert({
    subject_id: $("enroll-subject").value,
    student_id: $("enroll-student").value
  });
  if (error) return message("app-message", error.message, true);
  message("app-message", "Aluno matriculado com sucesso."); e.target.reset();
});

$("activity-form").addEventListener("submit", async e => {
  e.preventDefault();
  const deadline = $("activity-deadline").value;
  const { error } = await db.from("activities").insert({
    subject_id: $("activity-subject").value,
    titulo: $("activity-title").value.trim(),
    descricao: $("activity-description").value.trim(),
    prazo: deadline ? new Date(deadline).toISOString() : null
  });
  if (error) return message("app-message", error.message, true);
  e.target.reset(); message("app-message", "Atividade publicada."); await loadTeacherData();
});

$("grade-form").addEventListener("submit", async e => {
  e.preventDefault();
  const { error } = await db.from("grades").upsert({
    activity_id: $("grade-activity").value,
    student_id: $("grade-student").value,
    professor_id: currentUser.id,
    nota: Number($("grade-value").value),
    feedback: $("grade-feedback").value.trim()
  }, { onConflict: "activity_id,student_id" });
  if (error) return message("app-message", error.message, true);
  e.target.reset(); message("app-message", "Nota salva com sucesso.");
  await loadTeacherData();
  if ($("teacher-ranking-subject").value) await loadTeacherSubjectReport($("teacher-ranking-subject").value);
});

$("refresh-teacher").addEventListener("click", loadTeacherData);

async function loadStudentData() {
  const { data: enrollments, error } = await db.from("enrollments")
    .select("subject_id, subjects(id,nome,descricao)")
    .eq("student_id", currentUser.id);
  if (error) return message("app-message", error.message, true);
  const subjects = (enrollments || []).map(e => e.subjects).filter(Boolean);
  studentSubjectRows = subjects;
  fillSelect("student-grades-subject", subjects, "Selecione a matéria", "id", s => s.nome);
  if (!$ ("student-grades-subject").dataset.bound) { $("student-grades-subject").addEventListener("change", e => renderStudentGrades(e.target.value)); $("student-grades-subject").dataset.bound = "1"; }
  fillSelect("student-ranking-subject", subjects, "Selecione a matéria", "id", s => s.nome);
  if (subjects.length && !$ ("student-ranking-subject").dataset.bound) {
    $("student-ranking-subject").addEventListener("change", e => loadStudentSubjectRanking(e.target.value));
    $("student-ranking-subject").dataset.bound = "1";
  }
  if (!subjects.length) $("student-subjects").innerHTML = "<p class='muted'>Você ainda não está matriculado em nenhuma matéria.</p>";
  else {
    const subjectIds = subjects.map(s => s.id);
    const { data: activities, error: actError } = await db.from("activities").select("*").in("subject_id", subjectIds).order("created_at", { ascending: false });
    if (actError) return message("app-message", actError.message, true);
    const activityRows = activities || [];
    const { data: submissions, error: subError } = await db.from("submissions")
      .select("activity_id,file_name,entregue_em,atualizado_em").eq("student_id", currentUser.id);
    if (subError) return message("app-message", subError.message, true);
    const submitted = new Map((submissions || []).map(s => [s.activity_id, s]));
    $("student-subjects").innerHTML = subjects.map(s => {
      const acts = activityRows.filter(a => a.subject_id === s.id);
      return `<article class="subject-card"><h3>${escapeHtml(s.nome)}</h3><p>${escapeHtml(s.descricao || "Sem descrição")}</p>
      <button type="button" class="btn btn-outline btn-small" data-open-student-ranking="${s.id}">Ver ranking desta matéria</button>
      ${acts.length ? acts.map(a => {
        const sub = submitted.get(a.id);
        return `<div class="activity-card"><h3>${escapeHtml(a.titulo)}</h3><p>${escapeHtml(a.descricao || "")}</p><p>Prazo: ${dateText(a.prazo)}</p>
        ${sub ? `<p class="submission-status"><strong>✓ Entregue</strong> em ${dateText(sub.entregue_em)}</p><p>Arquivo: ${escapeHtml(sub.file_name || "")}</p>
          ${sub.atualizado_em ? `<p>Última edição: ${dateText(sub.atualizado_em)}</p>` : ""}
          <button class="btn btn-outline edit-submission" type="button" data-activity="${a.id}">Editar entrega</button>
          <form class="upload-form stack hidden" data-activity="${a.id}"><label>Selecione a nova versão do arquivo</label><input type="file" required accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.ods,.odp"><div class="inline-controls"><button class="btn btn-primary" type="submit">Salvar nova versão</button><button class="btn btn-outline cancel-edit" type="button">Cancelar</button></div></form>`
          : `<p class="muted">Ainda não entregue.</p><form class="upload-form stack" data-activity="${a.id}"><input type="file" required accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.ods,.odp"><button class="btn btn-primary" type="submit">Enviar arquivo</button></form>`}
        </div>`;
      }).join("") : "<p>Sem atividades cadastradas.</p>"}</article>`;
    }).join("");
    $("student-subjects").querySelectorAll('[data-open-student-ranking]').forEach(btn => btn.addEventListener('click', () => {
      $("student-ranking-subject").value = btn.dataset.openStudentRanking;
      openPage("student-ranking-page");
      loadStudentSubjectRanking(btn.dataset.openStudentRanking);
    }));
    document.querySelectorAll(".upload-form").forEach(form => form.addEventListener("submit", uploadSubmission));
    document.querySelectorAll(".edit-submission").forEach(btn => btn.addEventListener("click", () => {
      const form = document.querySelector(`.upload-form[data-activity="${btn.dataset.activity}"]`);
      if (form) { form.classList.remove("hidden"); btn.classList.add("hidden"); }
    }));
    document.querySelectorAll(".cancel-edit").forEach(btn => btn.addEventListener("click", () => loadStudentData()));
  }
  const { data: grades, error: gradeError } = await db.from("grades")
    .select("nota,feedback,activities(titulo,subject_id,subjects(id,nome))")
    .eq("student_id", currentUser.id).order("created_at", { ascending: false });
  if (gradeError) return message("app-message", gradeError.message, true);
  studentGradeRows = grades || [];
  renderStudentGrades($("student-grades-subject").value);
  $("ranking-list").innerHTML = subjects.length
    ? "<p class='muted'>Selecione uma matéria para consultar o ranking.</p>"
    : "<p class='muted'>Você ainda não está matriculado em matérias.</p>";
}

function renderStudentGrades(subjectId) {
  if (!subjectId) {
    $("student-grades").innerHTML = "<p class='muted'>Selecione uma matéria para visualizar suas notas.</p>";
    return;
  }
  const grades = studentGradeRows.filter(g => g.activities?.subject_id === subjectId);
  $("student-grades").innerHTML = grades.length ? grades.map(g =>
    `<div class="list-item"><span>${escapeHtml(g.activities?.titulo || "Atividade")}</span><span class="score">${Number(g.nota).toFixed(2)}</span></div>`
  ).join("") : "<p class='muted'>Ainda não há notas nesta matéria.</p>";
}

async function getSubjectReport(subjectId) {
  const subject = mySubjects.find(s => s.id === subjectId) || studentSubjectRows.find(s => s.id === subjectId);
  if (!subject) throw new Error("Matéria não encontrada.");
  const { data: enrollments, error: enrollError } = await db.from("enrollments").select("student_id").eq("subject_id", subjectId);
  if (enrollError) throw enrollError;
  const studentIds = [...new Set((enrollments || []).map(e => e.student_id))];
  if (!studentIds.length) return { subject, students: [], activities: [], grades: [], ranking: [] };
  const { data: students, error: studentsError } = await db.from("profiles").select("id,nome").in("id", studentIds).order("nome");
  if (studentsError) throw studentsError;
  const { data: activities, error: activitiesError } = await db.from("activities").select("id,titulo,subject_id").eq("subject_id", subjectId).order("created_at");
  if (activitiesError) throw activitiesError;
  const activityIds = (activities || []).map(a => a.id);
  let grades = [];
  if (activityIds.length) {
    const { data, error: gradesError } = await db.from("grades").select("id,activity_id,student_id,nota,feedback,created_at").in("activity_id", activityIds);
    if (gradesError) throw gradesError;
    grades = data || [];
  }
  const studentMap = new Map((students || []).map(st => [st.id, st.nome]));
  const activityMap = new Map((activities || []).map(a => [a.id, a.titulo]));
  const grouped = new Map();
  grades.forEach(g => {
    if (!grouped.has(g.student_id)) grouped.set(g.student_id, []);
    grouped.get(g.student_id).push(Number(g.nota));
  });
  const ranking = (students || []).map(st => {
    const values = grouped.get(st.id) || [];
    const average = values.length ? values.reduce((a,b) => a+b, 0) / values.length : null;
    return { student_id: st.id, nome: st.nome, media: average, quantidade: values.length };
  }).filter(r => r.media !== null).sort((a,b) => b.media - a.media || a.nome.localeCompare(b.nome, "pt-BR"));
  return { subject, students: students || [], activities: activities || [], grades, ranking, studentMap, activityMap };
}

async function loadStudentSubjectRanking(subjectId) {
  if (!subjectId) {
    $("ranking-list").innerHTML = "<p class='muted'>Selecione uma matéria para consultar o ranking.</p>";
    return;
  }
  try {
    const report = await getSubjectReport(subjectId);
    $("ranking-list").innerHTML = report.ranking.length ? report.ranking.map((r, i) =>
      `<div class="list-item"><span>${escapeHtml(r.nome)}${r.student_id === currentUser.id ? " (você)" : ""}</span><span class="score">${r.media.toFixed(2)} <small>(${r.quantidade} notas)</small></span></div>`
    ).join("") : "<p class='muted'>Ainda não há notas nesta matéria.</p>";
  } catch (err) { $("ranking-list").innerHTML = `<p class="error">Não foi possível carregar o ranking: ${escapeHtml(err.message)}</p>`; }
}

function clearTeacherSubjectReport() {
  teacherRankingRows = [];
  teacherGradeRows = [];
  $("teacher-ranking-list").innerHTML = "<p class='muted'>Selecione uma matéria para consultar o ranking.</p>";
  $("teacher-grades-table").innerHTML = "<p class='muted'>Selecione uma matéria para visualizar e editar as notas.</p>";
}

async function loadTeacherSubjectReport(subjectId) {
  if (!subjectId) {
    clearTeacherSubjectReport();
    return;
  }
  try {
    const report = await getSubjectReport(subjectId);
    teacherRankingRows = report.ranking;
    teacherGradeRows = report.grades;
    $("teacher-ranking-list").innerHTML = report.ranking.length ? report.ranking.map((r,i) =>
      `<div class="list-item"><span>${i+1}º · ${escapeHtml(r.nome)}</span><span class="score">${r.media.toFixed(2)} <small>(${r.quantidade} notas)</small></span></div>`
    ).join("") : "<p class='muted'>Ainda não há notas nesta matéria.</p>";
    $("teacher-grades-table").innerHTML = report.grades.length ? `<div class="table-wrap"><table><thead><tr><th>Aluno</th><th>Atividade</th><th>Nota</th><th>Feedback</th><th>Ação</th></tr></thead><tbody>${report.grades.map(g =>
      `<tr><td>${escapeHtml(report.studentMap.get(g.student_id) || "Aluno")}</td><td>${escapeHtml(report.activityMap.get(g.activity_id) || "Atividade")}</td><td>${Number(g.nota).toFixed(2)}</td><td>${escapeHtml(g.feedback || "—")}</td><td><button type="button" class="btn btn-outline btn-small" data-edit-grade="${g.id}">Editar</button></td></tr>`
    ).join("")}</tbody></table></div>` : "<p class='muted'>Nenhuma nota lançada nesta matéria.</p>";
    $("teacher-grades-table").querySelectorAll("[data-edit-grade]").forEach(btn => btn.addEventListener("click", () => {
      const grade = report.grades.find(g => g.id === btn.dataset.editGrade);
      if (!grade) return;
      $("grade-activity").value = grade.activity_id;
      $("grade-student").value = grade.student_id;
      $("grade-value").value = grade.nota;
      $("grade-feedback").value = grade.feedback || "";
      openPage("teacher-home");
      message("app-message", "Nota carregada no formulário. Altere o valor e clique em Salvar nota.");
      $("grade-value").focus();
    }));
  } catch (err) { message("app-message", "Erro ao carregar ranking/notas: " + err.message, true); }
}

$("teacher-ranking-subject").addEventListener("change", e => loadTeacherSubjectReport(e.target.value));
$("refresh-teacher-ranking").addEventListener("click", () => {
  const subjectId = $("teacher-ranking-subject").value;
  if (!subjectId) return clearTeacherSubjectReport();
  loadTeacherSubjectReport(subjectId);
});
$("export-subject-excel").addEventListener("click", async () => {
  const subjectId = $("teacher-ranking-subject").value;
  if (!subjectId) return message("app-message", "Selecione uma matéria para exportar.", true);
  if (typeof XLSX === "undefined") return message("app-message", "Biblioteca Excel indisponível. Verifique sua conexão com a internet.", true);
  try {
    const report = await getSubjectReport(subjectId);
    const activityColumns = report.activities.map((a, i) => ({ id: a.id, label: `${a.titulo}${report.activities.filter(x => x.titulo === a.titulo).length > 1 ? ` (${i + 1})` : ""}` }));
    const rows = report.students.map(st => {
      const row = { "Nome do aluno": st.nome, "Matéria": report.subject.nome };
      const values = report.grades.filter(g => g.student_id === st.id);
      activityColumns.forEach(activity => {
        const grade = values.find(g => g.activity_id === activity.id);
        row[activity.label] = grade ? Number(grade.nota) : "";
      });
      const nums = values.map(g => Number(g.nota));
      row["Média"] = nums.length ? Number((nums.reduce((a,b) => a+b,0)/nums.length).toFixed(2)) : "Sem notas";
      return row;
    });
    // Indicadores gerais da turma: consideram todas as notas lançadas na matéria.
    const allScores = report.grades.map(g => Number(g.nota)).filter(Number.isFinite);
    const totalNotasLancadas = allScores.length;
    const somaNotasTurma = allScores.reduce((total, nota) => total + nota, 0);
    const mediaTurma = totalNotasLancadas ? somaNotasTurma / totalNotasLancadas : null;
    const resumoRows = [
      { "Indicador": "Matéria", "Resultado": report.subject.nome },
      { "Indicador": "Total de alunos matriculados", "Resultado": report.students.length },
      { "Indicador": "Total de atividades", "Resultado": report.activities.length },
      { "Indicador": "Total de notas lançadas na turma", "Resultado": totalNotasLancadas },
      { "Indicador": "Soma de todas as notas da turma", "Resultado": Number(somaNotasTurma.toFixed(2)) },
      { "Indicador": "Média geral da turma (todas as notas lançadas)", "Resultado": mediaTurma === null ? "Sem notas" : Number(mediaTurma.toFixed(2)) }
    ];
    const resumoSheet = XLSX.utils.json_to_sheet(resumoRows);
    resumoSheet["!cols"] = [{ wch: 52 }, { wch: 28 }];

    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ "Nome do aluno": "Sem alunos matriculados", "Matéria": report.subject.nome }]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, resumoSheet, "Resumo da turma");
    XLSX.utils.book_append_sheet(book, sheet, "Notas por aluno");
    XLSX.writeFile(book, `Notas_${report.subject.nome.replace(/[^a-z0-9_-]/gi,"_")}.xlsx`);
    message("app-message", "Planilha Excel gerada com resumo e notas individuais da turma.");
  } catch (err) { message("app-message", "Não foi possível gerar o Excel: " + err.message, true); }
});

async function uploadSubmission(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const file = form.querySelector('input[type="file"]').files[0];
  if (!file) return;
  const activityId = form.dataset.activity;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${currentUser.id}/${activityId}/${crypto.randomUUID()}_${safeName}`;
  const existing = form.closest(".activity-card")?.querySelector(".submission-status");
  message("app-message", existing ? "Atualizando sua entrega..." : "Enviando arquivo...");
  const { error: uploadError } = await db.storage.from("entregas").upload(path, file, { upsert: false });
  if (uploadError) return message("app-message", uploadError.message, true);
  const now = new Date().toISOString();
  const { error: saveError } = await db.from("submissions").upsert({
    activity_id: activityId,
    student_id: currentUser.id,
    file_path: path,
    file_name: file.name,
    ...(existing ? {} : { entregue_em: now }),
    atualizado_em: now
  }, { onConflict: "activity_id,student_id" });
  if (saveError) return message("app-message", "Arquivo enviado, mas não foi possível registrar a entrega: " + saveError.message, true);
  message("app-message", existing ? "Nova versão salva. A entrega foi atualizada." : "Trabalho enviado com sucesso.");
  await loadStudentData();
}

$("refresh-student").addEventListener("click", loadStudentData);

// Edição de atividades: só matérias acessíveis ao professor ou administrador.
$("edit-activity-select").addEventListener("change", e => {
  const activity = editableActivities.find(a => a.id === e.target.value);
  $("edit-activity-title").value = activity?.titulo || "";
  $("edit-activity-description").value = activity?.descricao || "";
  $("edit-activity-deadline").value = activity?.prazo ? new Date(new Date(activity.prazo).getTime() - new Date(activity.prazo).getTimezoneOffset()*60000).toISOString().slice(0,16) : "";
});
$("edit-activity-form").addEventListener("submit", async e => {
  e.preventDefault();
  const activity = editableActivities.find(a => a.id === $("edit-activity-select").value);
  if (!activity || !mySubjects.some(s => s.id === activity.subject_id)) return message("app-message", "Atividade inválida.", true);
  const deadline = $("edit-activity-deadline").value;
  const { error } = await db.from("activities").update({
    titulo: $("edit-activity-title").value.trim(),
    descricao: $("edit-activity-description").value.trim(),
    prazo: deadline ? new Date(deadline).toISOString() : null
  }).eq("id", activity.id);
  if (error) return message("app-message", "Não foi possível editar: " + error.message, true);
  message("app-message", "Atividade atualizada.");
  await loadTeacherData();
  openPage("teacher-subjects-page");
});


// Alterar/excluir matéria: permissões de escrita também são verificadas pelo RLS do Supabase.
$("edit-subject-select").addEventListener("change", (event) => {
  const subject = mySubjects.find(s => s.id === event.target.value);
  $("edit-subject-name").value = subject?.nome || "";
  $("edit-subject-description").value = subject?.descricao || "";
  $("delete-subject-btn").disabled = !subject;
});

$("edit-subject-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const subject = mySubjects.find(s => s.id === $("edit-subject-select").value);
  if (!subject || !["professor", "admin"].includes(currentProfile?.tipo))
    return message("app-message", "Selecione uma matéria permitida.", true);
  const nome = $("edit-subject-name").value.trim();
  if (!nome) return message("app-message", "Informe o nome da matéria.", true);
  const { data, error } = await db.from("subjects").update({
    nome, descricao: $("edit-subject-description").value.trim()
  }).eq("id", subject.id).select("id");
  if (error || !data?.length) return message("app-message", "Não foi possível alterar a matéria. Verifique as permissões no Supabase. " + (error?.message || ""), true);
  message("app-message", "Matéria atualizada com sucesso.");
  await loadTeacherData();
});

$("delete-subject-btn").addEventListener("click", async () => {
  const subject = mySubjects.find(s => s.id === $("edit-subject-select").value);
  if (!subject || !["professor", "admin"].includes(currentProfile?.tipo)) return;
  const confirmed = confirm(`Excluir permanentemente a matéria "${subject.nome}"?\n\nA exclusão pode afetar atividades, matrículas, entregas e notas associadas. Essa ação não pode ser desfeita.`);
  if (!confirmed) return;
  const typed = prompt(`Para confirmar, digite exatamente o nome da matéria:\n${subject.nome}`);
  if (typed !== subject.nome) return message("app-message", "Exclusão cancelada: nome não confirmado.", true);
  const button = $("delete-subject-btn");
  button.disabled = true;
  const { data, error } = await db.from("subjects").delete().eq("id", subject.id).select("id");
  if (error || !data?.length) {
    button.disabled = false;
    return message("app-message", "Não foi possível excluir a matéria. Verifique as permissões RLS e os registros vinculados no Supabase. " + (error?.message || ""), true);
  }
  message("app-message", "Matéria excluída com sucesso.");
  await loadTeacherData();
});
