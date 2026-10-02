const KEY = "rak-tugasku";
const $ = (id) => document.getElementById(id);
const quotes = [
  "Cicil tugas sedikit demi sedikit, jangan menunggu H-1.",
  "Satu paragraf skripsi hari ini sudah kemajuan.",
  "Mulai dari tugas yang paling kecil.",
  "Istirahat sebentar juga bagian dari rencana.",
  "Selesai itu lebih baik daripada sempurna.",
];
const PRIO = { tinggi: 0, sedang: 1, rendah: 2 };
const PRIO_COLOR = {
  tinggi: "var(--pink)",
  sedang: "var(--butter)",
  rendah: "var(--mint)",
};

let state = load();
let filter = "semua";
let slide = 0;

function load() {
  try {
    return Object.assign(
      { tasks: [], pages: {}, goal: 20, theme: "light" },
      JSON.parse(localStorage.getItem(KEY)),
    );
  } catch {
    return { tasks: [], pages: {}, goal: 20, theme: "light" };
  }
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}
const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => dateKey(new Date());
function dueLabel(t) {
  const days = Math.round((new Date(t.due) - new Date(today())) / 86400000);
  if (t.done) return "tenggat " + t.due;
  if (days < 0) return "lewat " + -days + " hari";
  return days === 0 ? "hari ini" : "H-" + days;
}
function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
function toast(m) {
  const t = $("toast");
  t.textContent = m;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2000);
}

/* ---------- Tugas ---------- */
function visibleTasks() {
  const q = $("search").value.trim().toLowerCase();
  let list = state.tasks.filter(
    (t) =>
      (filter === "semua" || (filter === "selesai") === t.done) &&
      t.text.toLowerCase().includes(q),
  );
  const s = $("sort").value;
  if (s === "prio") list.sort((a, b) => PRIO[a.prio] - PRIO[b.prio]);
  else if (s === "due")
    list.sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  else list.sort((a, b) => b.id - a.id);
  return list;
}
function renderList() {
  const list = visibleTasks();
  $("list").innerHTML = list
    .map((t) => {
      const late = t.due && !t.done && t.due < today();
      return `<li class="item ${t.prio} ${t.done ? "done" : ""}" data-id="${t.id}">
      <input type="checkbox" ${t.done ? "checked" : ""} aria-label="Selesai">
      <div class="body"><div class="t">${esc(t.text)}</div>
        <div class="meta">prioritas ${t.prio}${t.due ? " · " + dueLabel(t) : ""}${late ? ' <span class="late">terlambat</span>' : ""}</div></div>
      <button class="icon" data-a="edit">Ubah</button>
      <button class="icon" data-a="del">Hapus</button></li>`;
    })
    .join("");
  $("empty").hidden = list.length > 0;
}
function renderOverall() {
  const n = state.tasks.length,
    d = state.tasks.filter((t) => t.done).length;
  $("overallBar").style.width = (n ? (d / n) * 100 : 0) + "%";
  $("overallText").textContent = `${d} dari ${n} selesai`;
}
function renderStats() {
  const mk = (label, n, total, color) =>
    `<div class="brow"><span>${esc(label)}</span><div class="bar"><i style="width:${total ? (n / total) * 100 : 0}%;background:${color}"></i></div><b>${n}</b></div>`;
  const total = state.tasks.length;
  $("prioBars").innerHTML = Object.keys(PRIO)
    .map((p) =>
      mk(
        p,
        state.tasks.filter((t) => t.prio === p).length,
        total,
        PRIO_COLOR[p],
      ),
    )
    .join("");
  const days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const counts = days.map(
    (d) =>
      state.tasks.filter((t) => t.doneAt === dateKey(d))
        .length,
  );
  const max = Math.max(1, ...counts);
  $("weekBars").innerHTML = days
    .map(
      (d, i) =>
        `<div class="col"><b>${counts[i]}</b><i style="height:${(counts[i] / max) * 100}%"></i><span>${d.toLocaleDateString("id-ID", { weekday: "short" })}</span></div>`,
    )
    .join("");
}
function renderAll() {
  renderList();
  renderOverall();
  renderStats();
}

$("form").addEventListener("submit", (e) => {
  e.preventDefault();
  state.tasks.push({
    id: Date.now(),
    text: $("text").value.trim(),
    prio: $("prio").value,
    due: $("due").value,
    done: false,
  });
  save();
  e.target.reset();
  $("prio").value = "sedang";
  renderAll();
  toast("Tugas ditambahkan.");
});
$("list").addEventListener("click", (e) => {
  const li = e.target.closest(".item");
  if (!li) return;
  const t = state.tasks.find((x) => x.id === Number(li.dataset.id));
  if (e.target.type === "checkbox") {
    t.done = e.target.checked;
    t.doneAt = t.done ? today() : null;
  } else if (e.target.dataset.a === "del")
    state.tasks = state.tasks.filter((x) => x !== t);
  else if (e.target.dataset.a === "edit") {
    const v = prompt("Ubah tugas:", t.text);
    if (v && v.trim()) t.text = v.trim();
  } else return;
  save();
  renderAll();
});
$("filters").addEventListener("click", (e) => {
  const b = e.target.closest(".chip");
  if (!b) return;
  filter = b.dataset.f;
  [...$("filters").children].forEach((c) => c.classList.toggle("on", c === b));
  renderList();
});
$("search").addEventListener("input", renderList);
$("sort").addEventListener("change", renderList);
$("clearDone").addEventListener("click", () => {
  const n = state.tasks.filter((t) => t.done).length;
  if (!n) return toast("Belum ada tugas yang selesai.");
  if (confirm(`Hapus ${n} tugas yang sudah selesai?`)) {
    state.tasks = state.tasks.filter((t) => !t.done);
    save();
    renderAll();
  }
});

/* ---------- Slide ---------- */
function go(i) {
  slide = Math.max(0, Math.min(2, i));
  $("track").style.transform = `translateX(-${slide * 100}%)`;
  [...$("tabs").children].forEach((b, k) =>
    b.classList.toggle("on", k === slide),
  );
  $("prev").disabled = slide === 0;
  $("next").disabled = slide === 2;
}
$("tabs").addEventListener("click", (e) => {
  if (e.target.dataset.i) go(Number(e.target.dataset.i));
});
$("prev").addEventListener("click", () => go(slide - 1));
$("next").addEventListener("click", () => go(slide + 1));
let x0 = null;
$("track").addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), {
  passive: true,
});
$("track").addEventListener("touchend", (e) => {
  if (x0 === null) return;
  const dx = e.changedTouches[0].clientX - x0;
  if (Math.abs(dx) > 60) go(slide + (dx < 0 ? 1 : -1));
  x0 = null;
});

/* ---------- Timer fokus ---------- */
let mins = 25,
  left = 25 * 60,
  timer = null;
const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
function stopTimer() {
  clearInterval(timer);
  timer = null;
  $("tStart").textContent = "Mulai";
}
$("tStart").addEventListener("click", () => {
  if (timer) return stopTimer();
  $("tStart").textContent = "Jeda";
  timer = setInterval(() => {
    left--;
    $("timeText").textContent = fmt(left);
    if (left <= 0) {
      stopTimer();
      left = mins * 60;
      $("timeText").textContent = fmt(left);
      toast("Waktu habis. Kerja bagus!");
    }
  }, 1000);
});
$("tReset").addEventListener("click", () => {
  stopTimer();
  left = mins * 60;
  $("timeText").textContent = fmt(left);
});
document.querySelectorAll("[data-m]").forEach((b) =>
  b.addEventListener("click", () => {
    mins = Number(b.dataset.m);
    document
      .querySelectorAll("[data-m]")
      .forEach((c) => c.classList.toggle("on", c === b));
    stopTimer();
    left = mins * 60;
    $("timeText").textContent = fmt(left);
  }),
);

/* ---------- Target baca ---------- */
function todayLog() {
  const v = state.pages[today()];
  if (typeof v === "number") state.pages[today()] = v ? [v] : [];
  return state.pages[today()] || [];
}
function renderRead() {
  const log = todayLog();
  const p = log.reduce((a, b) => a + b, 0),
    g = state.goal || 1;
  $("goal").value = state.goal;
  $("readBar").style.width = Math.min(100, (p / g) * 100) + "%";
  $("readText").textContent = `${p} dari ${g} halaman hari ini`;
  $("readLog").innerHTML = log
    .map(
      (n, i) =>
        `<li><span>+${n} halaman</span><button class="icon" data-i="${i}">Hapus</button></li>`,
    )
    .join("");
  $("resetRead").hidden = log.length === 0;
}
$("goal").addEventListener("change", (e) => {
  state.goal = Math.max(1, Number(e.target.value) || 1);
  save();
  renderRead();
});
function addPages() {
  const n = Math.floor(Number($("pages").value));
  if (!n || n < 1 || n > 5000) return toast("Isi jumlah halaman 1 sampai 5000.");
  const log = todayLog();
  log.push(n);
  state.pages[today()] = log;
  $("pages").value = "";
  save();
  renderRead();
  toast("Halaman dicatat.");
}
$("addPages").addEventListener("click", addPages);
$("pages").addEventListener("keydown", (e) => {
  if (e.key === "Enter") addPages();
});
$("readLog").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const log = todayLog();
  log.splice(Number(b.dataset.i), 1);
  state.pages[today()] = log;
  save();
  renderRead();
  toast("Catatan dihapus.");
});
$("resetRead").addEventListener("click", () => {
  if (confirm("Hapus semua catatan baca hari ini?")) {
    state.pages[today()] = [];
    save();
    renderRead();
  }
});

/* ---------- Acak, cadangan, tema ---------- */
$("pick").addEventListener("click", () => {
  const open = state.tasks.filter((t) => !t.done);
  $("picked").textContent = open.length
    ? "Kerjakan dulu: " + open[Math.floor(Math.random() * open.length)].text
    : "Semua tugas sudah selesai.";
});
$("export").addEventListener("click", () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
  );
  a.download = "rak-tugasku.json";
  a.click();
});
$("import").addEventListener("click", () => $("file").click());
$("file").addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (!f) return;
  f.text().then((txt) => {
    try {
      const d = JSON.parse(txt);
      if (!Array.isArray(d.tasks)) throw 0;
      state = Object.assign(state, d);
      save();
      renderAll();
      renderRead();
      toast("Data dipulihkan.");
    } catch {
      toast("File tidak valid.");
    }
  });
});
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  $("theme").textContent =
    state.theme === "dark" ? "Mode terang" : "Mode gelap";
}
$("theme").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  save();
  applyTheme();
});

$("quote").textContent = quotes[Math.floor(Math.random() * quotes.length)];
applyTheme();
renderAll();
renderRead();
go(0);