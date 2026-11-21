const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const STATUSES = ["Присутствует","Отсутствует","Уважительная","Болеет","Опоздал"];
const statusClass = {"Присутствует":"","Отсутствует":"absent","Уважительная":"excused","Болеет":"sick","Опоздал":"late"};
const today = new Date();
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const parseDate = s => {const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const fmt = d => d.toLocaleDateString("ru-RU",{day:"numeric",month:"long"});
let month = new Date(today.getFullYear(),today.getMonth(),1), lesson = "1";
let students = JSON.parse(localStorage.getItem("cs_students") || "null") || ["Иванов И. И.","Петров А. С.","Сидорова М. В.","Кузнецов Д. П.","Смирнова Е. А.","Попов Н. И.","Васильева А. Д.","Морозов М. В.","Фёдоров К. О.","Николаева Т. С.","Волков Р. А.","Алексеев П. М."];
let attendance = JSON.parse(localStorage.getItem("cs_attendance") || "{}");
let events = JSON.parse(localStorage.getItem("cs_events") || "null") || [
  {title:"Проверить расписание на следующую неделю",date:iso(new Date(today.getFullYear(),today.getMonth(),today.getDate()+2)),description:"Уточнить возможные изменения в расписании."},
  {title:"Сдать лабораторную работу",date:iso(new Date(today.getFullYear(),today.getMonth(),today.getDate()+5)),description:"Не забудьте загрузить работу в Moodle."}
];
let selectedDate = iso(today);
function persist(){localStorage.setItem("cs_students",JSON.stringify(students));localStorage.setItem("cs_attendance",JSON.stringify(attendance));localStorage.setItem("cs_events",JSON.stringify(events));}
function key(date=selectedDate,l=lesson){return `${date}_${l}`;}
function showPage(name){$$(".page").forEach(p=>p.classList.add("hidden"));$("#"+name+"Page").classList.remove("hidden");$$(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===name));if(name==="calendar")renderCalendar();if(name==="attendance")renderAttendance();if(name==="students")renderStudents();if(name==="events")renderEvents();}
$("#loginForm").addEventListener("submit",e=>{e.preventDefault();$("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden");$("#groupLabel").textContent="Группа ПИ-609-52 · "+($("#login").value||"староста");renderCalendar();});
$("#logoutBtn").onclick=()=>{$("#appView").classList.add("hidden");$("#loginView").classList.remove("hidden");};
$$(".nav-link").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
$$("[data-go]").forEach(b=>b.onclick=()=>showPage(b.dataset.go));
function renderCalendar(){
 const y=month.getFullYear(),m=month.getMonth(),first=new Date(y,m,1),offset=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate();
 $("#monthTitle").textContent=month.toLocaleDateString("ru-RU",{month:"long",year:"numeric"});
 const cells=[];for(let i=0;i<offset;i++){const d=new Date(y,m,1-offset+i);cells.push(dayCell(d,true));}
 for(let n=1;n<=days;n++)cells.push(dayCell(new Date(y,m,n),false));
 while(cells.length%7) {const d=new Date(y,m,days+(cells.length-(offset+days))+1);cells.push(dayCell(d,true));}
 $("#calendarGrid").innerHTML=cells.join("");
 $$(".day[data-date]").forEach(b=>b.onclick=()=>{selectedDate=b.dataset.date;$("#attendanceDate").value=selectedDate;showPage("attendance");});
 const upcoming=events.slice().sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);
 $("#upcomingEvents").innerHTML=upcoming.length?upcoming.map(eventCard).join(""):'<div class="empty-state">Пока нет событий</div>';
}
function dayCell(d,outside){
 const date=iso(d), weekend=[0,6].includes(d.getDay()), done=Object.keys(attendance).some(k=>k.startsWith(date+"_"));
 const hasEvent=events.some(e=>e.date===date), todayFlag=date===iso(today);
 let tag=hasEvent?'<span class="day-tag event">Событие</span>':done?'<span class="day-tag">Отмечено</span>':d<new Date(today.getFullYear(),today.getMonth(),today.getDate())?'<span class="day-tag empty">Не отмечено</span>':'';
 return `<button class="day ${outside?'outside':''} ${weekend?'weekend':''} ${todayFlag?'today':''}" data-date="${date}"><span class="day-num">${d.getDate()}</span>${tag}</button>`;
}
$("#prevMonth").onclick=()=>{month.setMonth(month.getMonth()-1);renderCalendar();};
$("#nextMonth").onclick=()=>{month.setMonth(month.getMonth()+1);renderCalendar();};
$("#todayBtn").onclick=()=>{month=new Date(today.getFullYear(),today.getMonth(),1);renderCalendar();};
function renderAttendance(){
 $("#attendanceDate").value=selectedDate;
 const saved=attendance[key()]||{};
 $("#attendanceRows").innerHTML=students.map((s,i)=>{const status=saved[s]||"Присутствует";return `<div class="student-row"><span>${i+1}</span><span class="student-name">${escapeHtml(s)}</span><span><select class="status-select ${statusClass[status]}" data-student="${escapeHtml(s)}">${STATUSES.map(x=>`<option ${x===status?'selected':''}>${x}</option>`).join("")}</select></span></div>`}).join("");
 $$(".status-select").forEach(sel=>sel.onchange=()=>{sel.className="status-select "+statusClass[sel.value];updateSummary();});
 updateSummary();$("#saveMessage").textContent="";
}
function currentStatuses(){return [...$$(".status-select")].map(s=>s.value);}
function updateSummary(){const vals=currentStatuses();const counts=STATUSES.map(s=>[s,vals.filter(v=>v===s).length]);$("#attendanceSummary").innerHTML=counts.filter(x=>x[1]).map(([s,n])=>`<span class="summary-chip ${statusClass[s]}">${s}: ${n}</span>`).join("");}
$$(".lesson-tab").forEach(b=>b.onclick=()=>{lesson=b.dataset.lesson;$$(".lesson-tab").forEach(x=>x.classList.toggle("active",x===b));renderAttendance();});
$("#attendanceDate").onchange=e=>{selectedDate=e.target.value||iso(today);renderAttendance();};
$("#allPresent").onclick=()=>{$$(".status-select").forEach(s=>{s.value="Присутствует";s.className="status-select"});updateSummary();};
$("#saveAttendance").onclick=()=>{const data={};$$(".status-select").forEach(s=>data[s.dataset.student]=s.value);attendance[key()]=data;persist();$("#saveMessage").textContent="Посещаемость сохранена.";};
function renderStudents(){$("#studentRows").innerHTML=students.map((s,i)=>`<div class="student-row student-head"><span>${i+1}</span><span class="student-name">${escapeHtml(s)}</span><span><button class="delete-btn" data-remove="${i}">Удалить</button></span></div>`).join("")||'<div class="empty-state">Список пока пуст. Добавьте первого студента.</div>';$$("[data-remove]").forEach(b=>b.onclick=()=>{if(confirm("Удалить студента из списка?")){students.splice(Number(b.dataset.remove),1);persist();renderStudents();}});}
$("#addStudentToggle").onclick=()=>$("#addStudentForm").classList.toggle("hidden");
$("#cancelStudent").onclick=()=>$("#addStudentForm").classList.add("hidden");
$("#addStudentForm").onsubmit=e=>{e.preventDefault();const name=$("#studentName").value.trim();if(name&&!students.includes(name)){students.push(name);persist();renderStudents();$("#studentName").value="";$("#addStudentForm").classList.add("hidden");}};
function eventCard(e){const d=parseDate(e.date);return `<article class="event-card"><div class="event-date"><strong>${d.getDate()}</strong>${d.toLocaleDateString("ru-RU",{month:"short"})}</div><div class="event-content"><h3>${escapeHtml(e.title)}</h3><p>${escapeHtml(e.description||"Без дополнительного описания")}</p></div></article>`;}
function renderEvents(){$("#eventRows").innerHTML=events.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(eventCard).join("")||'<div class="empty-state">Событий пока нет. Создайте первое объявление.</div>';}
$("#addEventToggle").onclick=()=>{$("#addEventForm").classList.toggle("hidden");$("#eventDate").value=selectedDate;};
$("#cancelEvent").onclick=()=>$("#addEventForm").classList.add("hidden");
$("#addEventForm").onsubmit=e=>{e.preventDefault();events.push({title:$("#eventTitle").value.trim(),date:$("#eventDate").value,description:$("#eventDescription").value.trim()});persist();e.target.reset();e.target.classList.add("hidden");renderEvents();};
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
